import base64
import json
import re
from typing import Any

import httpx

from api.config import ENABLE_GEMINI_OCR, GEMINI_API_KEY, GEMINI_MODEL
from api.demo_data import mock_ocr_result


def ai_provider() -> str:
    return "gemini" if GEMINI_API_KEY and ENABLE_GEMINI_OCR else "mock"


def extract_json(text: str) -> dict[str, Any]:
    cleaned = re.sub(r"```(?:json)?|```", "", text).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("Gemini response did not contain JSON")
    return json.loads(cleaned[start : end + 1])


def build_prompt() -> str:
    return "\n".join(
        [
            "Bạn là service OCR cho app tài chính cá nhân MyMoney.",
            "Đọc hóa đơn trong ảnh và trả về JSON thuần, không markdown.",
            "Schema:",
            "{",
            '  "merchant": "string",',
            '  "totalAmount": 0,',
            '  "vatAmount": 0,',
            '  "purchasedAt": "ISO-8601 string nếu thấy ngày, nếu không dùng 2026-06-17T12:42:00.000Z",',
            '  "categoryName": "Ăn uống|Nhà cửa|Giải trí|Di chuyển|Thuế|Khác",',
            '  "confidence": 0.0,',
            '  "rawText": "string",',
            '  "items": [{"name":"string","quantity":1,"amount":0}]',
            "}",
            "Luôn dùng đơn vị VND và số nguyên.",
        ]
    )


def normalize_ocr(parsed: dict[str, Any], raw_text: str) -> dict[str, Any]:
    fallback = mock_ocr_result()
    return {
        "merchant": parsed.get("merchant") or fallback["merchant"],
        "totalAmount": int(parsed.get("totalAmount") or fallback["totalAmount"]),
        "vatAmount": int(parsed.get("vatAmount") or 0),
        "purchasedAt": parsed.get("purchasedAt") or fallback["purchasedAt"],
        "categoryName": parsed.get("categoryName") or fallback["categoryName"],
        "confidence": float(parsed.get("confidence") or 0.9),
        "rawText": parsed.get("rawText") or raw_text,
        "items": parsed.get("items") or fallback["items"],
        "aiProvider": "gemini",
    }


async def run_receipt_ocr(image: bytes | None, mime_type: str | None) -> dict[str, Any]:
    if not GEMINI_API_KEY or not ENABLE_GEMINI_OCR or not image:
        return mock_ocr_result()

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": build_prompt()},
                    {
                        "inlineData": {
                            "mimeType": mime_type or "image/jpeg",
                            "data": base64.b64encode(image).decode("ascii"),
                        }
                    },
                ],
            }
        ],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
    }

    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
                headers={"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY},
                json=payload,
            )
        response.raise_for_status()
        data = response.json()
        text = "\n".join(
            part.get("text", "")
            for candidate in data.get("candidates", [])
            for part in candidate.get("content", {}).get("parts", [])
        )
        return normalize_ocr(extract_json(text), text)
    except Exception as exc:
        print(f"[gemini] fallback to mock OCR: {exc}")
        return mock_ocr_result()
