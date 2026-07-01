from typing import Any


def mock_ocr_result() -> dict[str, Any]:
    return {
        "merchant": "Co.op Food Nguyễn Trãi",
        "totalAmount": 287000,
        "vatAmount": 21273,
        "purchasedAt": "2026-06-17T12:42:00.000Z",
        "categoryName": "Ăn uống",
        "confidence": 0.94,
        "aiProvider": "mock",
        "rawText": "CO.OP FOOD\nGạo ST25 128000\nSữa tươi 84000\nRau củ 53000\nVAT 21273\nTổng cộng 287000",
        "items": [
            {"name": "Gạo ST25 5kg", "quantity": 1, "amount": 128000},
            {"name": "Sữa tươi không đường", "quantity": 1, "amount": 84000},
            {"name": "Rau củ & gia vị", "quantity": 1, "amount": 53000},
            {"name": "VAT 8%", "quantity": 1, "amount": 21273},
        ],
    }


DEMO_ACCOUNTS = [
    {"id": "acc_bank_a", "name": "Bank A - Debit", "kind": "bank", "balance": 8100000, "currency": "VND"},
    {"id": "acc_momo", "name": "MoMo - Ví điện tử", "kind": "wallet", "balance": 3000000, "currency": "VND"},
    {"id": "acc_shared", "name": "Quỹ chung gia đình", "kind": "shared_fund", "balance": 5200000, "currency": "VND"},
]


def summary_report(period: str) -> dict[str, Any]:
    return {
        "period": period,
        "income": 45000000,
        "expense": 32000000,
        "saving": 13000000,
        "budgetUsage": 0.78,
        "alerts": ["Ăn uống đã dùng 82% ngân sách", "Có 4 hóa đơn đủ dữ liệu thuế"],
    }
