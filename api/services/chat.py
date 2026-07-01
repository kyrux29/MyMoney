from typing import Any

import httpx

from api.config import ENABLE_GEMINI_CHAT, GEMINI_API_KEY, GEMINI_MODEL


DEMO_CONTEXT = {
    "currency": "VND",
    "monthlyIncome": 45000000,
    "monthlyExpense": 32000000,
    "monthlySaving": 13000000,
    "budgetUsage": "78%",
    "foodBudgetUsage": "82%",
    "accounts": ["Bank A - Debit", "MoMo - Ví điện tử", "Quỹ chung gia đình"],
    "recentAlerts": ["Ăn uống đã dùng 82% ngân sách", "Có 4 hóa đơn đủ dữ liệu thuế"],
}


def mock_chat_response(message: str) -> dict[str, Any]:
    normalized = message.lower()
    if "thuế" in normalized or "vat" in normalized:
        answer = "Bạn đã có đủ dữ liệu hóa đơn mẫu cho báo cáo thuế. Nên kiểm tra lại VAT, ngày mua và nhà cung cấp trước khi xuất báo cáo."
    elif "ăn" in normalized or "giảm" in normalized or "chi" in normalized:
        answer = "Khoản ăn uống đang dùng 82% ngân sách. Mức giảm hợp lý là khoảng 180.000 VND mỗi tuần để vẫn giữ mục tiêu tiết kiệm 13.000.000 VND."
    elif "đầu tư" in normalized:
        answer = "Danh mục đang ở mức rủi ro trung bình. Có thể giữ ETF quanh 40%, phần còn lại chia cho trái phiếu và tiền gửi để giảm biến động."
    else:
        answer = "Dòng tiền tháng này vẫn dương 13.000.000 VND. Ưu tiên hiện tại là kiểm soát ăn uống, giữ đầu tư định kỳ và lưu hóa đơn có VAT."

    return {
        "reply": answer,
        "provider": "mock",
        "model": GEMINI_MODEL,
        "suggestions": ["Tối ưu ăn uống", "Kiểm tra thuế", "Tái cân bằng đầu tư"],
    }


def build_system_prompt() -> str:
    return (
        "Bạn là trợ lý AI của ứng dụng MyMoney cho người dùng Việt Nam. "
        "Trả lời ngắn gọn, thực tế, bằng tiếng Việt. "
        "Chỉ tư vấn quản lý tài chính cá nhân ở mức demo, không đưa lời khuyên đầu tư/tài chính chuyên nghiệp chắc chắn. "
        f"Dữ liệu demo: {DEMO_CONTEXT}."
    )


def to_gemini_contents(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    contents: list[dict[str, Any]] = []
    for item in messages[-8:]:
        role = "model" if item.get("role") == "assistant" else "user"
        text = str(item.get("content", "")).strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})
    return contents


def extract_text(payload: dict[str, Any]) -> str:
    parts = [
        part.get("text", "")
        for candidate in payload.get("candidates", [])
        for part in candidate.get("content", {}).get("parts", [])
    ]
    return "\n".join(part for part in parts if part).strip()


async def run_chat(messages: list[dict[str, Any]], message: str) -> dict[str, Any]:
    if not GEMINI_API_KEY or not ENABLE_GEMINI_CHAT:
        return mock_chat_response(message)

    conversation = to_gemini_contents(messages)
    if not conversation or conversation[-1]["role"] != "user":
        conversation.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "systemInstruction": {"parts": [{"text": build_system_prompt()}]},
        "contents": conversation,
        "generationConfig": {
            "temperature": 0.35,
            "maxOutputTokens": 420,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
                headers={"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY},
                json=payload,
            )
        response.raise_for_status()
        reply = extract_text(response.json())
        if not reply:
            return mock_chat_response(message)
        return {
            "reply": reply,
            "provider": "gemini",
            "model": GEMINI_MODEL,
            "suggestions": ["Tối ưu ngân sách", "Phân tích hóa đơn", "Kế hoạch tuần này"],
        }
    except Exception as exc:
        print(f"[gemini-chat] fallback to mock chat: {exc}")
        return mock_chat_response(message)
