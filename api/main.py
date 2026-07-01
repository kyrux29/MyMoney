from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.config import ENABLE_GEMINI_CHAT, GEMINI_API_KEY, GEMINI_MODEL, MAX_UPLOAD_BYTES, PUBLIC_DIR
from api.demo_data import DEMO_ACCOUNTS, mock_ocr_result, summary_report
from api.services.chat import run_chat
from api.services.ocr import ai_provider, run_receipt_ocr


app = FastAPI(
    title="MyMoney FastAPI Demo",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

if (PUBLIC_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=PUBLIC_DIR / "assets"), name="assets")

RECEIPTS: dict[str, dict[str, Any]] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def receipt_payload(receipt_id: str, file: UploadFile | None, ocr: dict[str, Any], status: str) -> dict[str, Any]:
    return {
        "id": receipt_id,
        "userId": "usr_demo_khanh",
        "fileName": file.filename if file else f"receipt-{receipt_id}.jpg",
        "mimeType": file.content_type if file else "image/jpeg",
        "merchant": ocr["merchant"],
        "totalAmount": ocr["totalAmount"],
        "vatAmount": ocr["vatAmount"],
        "purchasedAt": ocr["purchasedAt"],
        "confidence": ocr["confidence"],
        "status": status,
        "aiProvider": ocr["aiProvider"],
        "rawText": ocr.get("rawText", ""),
        "createdAt": now_iso(),
    }


async def read_small_upload(file: UploadFile) -> bytes:
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Ảnh hóa đơn quá lớn. Giới hạn demo là {MAX_UPLOAD_BYTES // 1000000}MB.",
        )
    return content


def build_receipt_response(receipt_id: str, file: UploadFile | None, ocr: dict[str, Any]) -> dict[str, Any]:
    receipt = receipt_payload(receipt_id, file, ocr, "ocr_ready")
    items = [{"id": str(uuid4()), "receiptId": receipt_id, **item} for item in ocr["items"]]
    RECEIPTS[receipt_id] = {"receipt": receipt, "items": items}
    return {"receipt": receipt, "items": items, "ocr": ocr}


@app.get("/api")
@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "mymoney-fastapi-demo",
        "runtime": "python-fastapi",
        "deployTarget": "vercel",
        "ai": {
            "ocrProvider": ai_provider(),
            "chatProvider": "gemini" if GEMINI_API_KEY and ENABLE_GEMINI_CHAT else "mock",
            "model": GEMINI_MODEL,
        },
    }


@app.get("/", include_in_schema=False)
async def frontend_index() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "index.html")


@app.get("/app.js", include_in_schema=False)
async def frontend_js() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "app.js")


@app.get("/styles.css", include_in_schema=False)
async def frontend_css() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "styles.css")


@app.get("/manifest.webmanifest", include_in_schema=False)
async def frontend_manifest() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "manifest.webmanifest", media_type="application/manifest+json")


@app.post("/api/receipts/scan")
async def scan_receipt(file: UploadFile = File(...)) -> dict[str, Any]:
    image = await read_small_upload(file)
    receipt_id = str(uuid4())
    ocr = await run_receipt_ocr(image, file.content_type)
    return build_receipt_response(receipt_id, file, ocr)


@app.post("/api/receipts/upload")
async def upload_receipt(file: UploadFile = File(...)) -> dict[str, Any]:
    image = await read_small_upload(file)
    receipt_id = str(uuid4())
    receipt = receipt_payload(
        receipt_id,
        file,
        {**mock_ocr_result(), "merchant": "Đang chờ OCR", "totalAmount": 0, "vatAmount": 0, "confidence": 0},
        "uploaded",
    )
    RECEIPTS[receipt_id] = {"receipt": receipt, "items": [], "image": image, "mimeType": file.content_type}
    return {"receipt": receipt}


@app.post("/api/receipts/{receipt_id}/ocr")
async def ocr_receipt(receipt_id: str) -> dict[str, Any]:
    record = RECEIPTS.get(receipt_id, {})
    ocr = await run_receipt_ocr(record.get("image"), record.get("mimeType"))
    return build_receipt_response(receipt_id, None, ocr)


@app.post("/api/receipts/{receipt_id}/confirm")
async def confirm_receipt(receipt_id: str, payload: dict[str, Any] | None = Body(default=None)) -> dict[str, Any]:
    record = RECEIPTS.get(receipt_id, {})
    body = payload or {}
    receipt = record.get("receipt") or receipt_payload(receipt_id, None, mock_ocr_result(), "ocr_ready")
    if body.get("merchant"):
        receipt["merchant"] = str(body["merchant"])[:120]
    if body.get("amount"):
        receipt["totalAmount"] = int(body["amount"])
    if body.get("vatAmount") is not None:
        receipt["vatAmount"] = int(body.get("vatAmount") or 0)
    receipt["status"] = "confirmed"
    transaction = {
        "id": str(uuid4()),
        "receiptId": receipt_id,
        "accountId": body.get("accountId", "acc_bank_a"),
        "categoryId": "cat_food",
        "kind": "expense",
        "amount": receipt["totalAmount"],
        "merchant": receipt["merchant"],
        "note": body.get("note", f"Hóa đơn {receipt['merchant']}"),
        "occurredAt": receipt["purchasedAt"],
        "createdAt": now_iso(),
    }
    RECEIPTS[receipt_id] = {**record, "receipt": receipt}
    return {"transaction": transaction}


@app.get("/api/accounts")
async def accounts() -> list[dict[str, Any]]:
    return DEMO_ACCOUNTS


@app.get("/api/reports/summary")
async def reports_summary(period: str = "month") -> dict[str, Any]:
    return summary_report(period)


@app.post("/api/chat")
async def chat(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    message = str(payload.get("message", "")).strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    history = payload.get("history", [])
    if not isinstance(history, list):
        history = []

    safe_history = [
        {"role": item.get("role"), "content": str(item.get("content", ""))[:1200]}
        for item in history[-8:]
        if isinstance(item, dict)
    ]
    result = await run_chat(safe_history, message[:1200])
    return {
        "reply": result["reply"],
        "provider": result["provider"],
        "model": result["model"],
        "suggestions": result.get("suggestions", []),
        "createdAt": now_iso(),
    }
