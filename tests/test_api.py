from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["runtime"] == "python-fastapi"


def test_frontend_is_served() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "MyMoney UI Demo" in response.text
    assert 'data-chat-widget' in response.text
    assert 'id="receipt-merchant-input"' in response.text


def test_frontend_assets_are_served() -> None:
    response = client.get("/app.js")

    assert response.status_code == 200
    assert "text/javascript" in response.headers["content-type"]
    assert "receipts/scan" in response.text


def test_receipt_scan_mock_flow() -> None:
    response = client.post(
        "/api/receipts/scan",
        files={"file": ("receipt.jpg", b"fake-image-for-mock-mode", "image/jpeg")},
    )

    payload = response.json()
    assert response.status_code == 200
    assert payload["receipt"]["status"] == "ocr_ready"
    assert payload["receipt"]["totalAmount"] == 287000
    assert len(payload["items"]) == 4


def test_confirm_receipt_flow() -> None:
    scan = client.post(
        "/api/receipts/scan",
        files={"file": ("receipt.jpg", b"fake-image-for-mock-mode", "image/jpeg")},
    )
    receipt_id = scan.json()["receipt"]["id"]

    response = client.post(
        f"/api/receipts/{receipt_id}/confirm",
        json={"note": "demo", "merchant": "Demo Mart", "amount": 123000, "vatAmount": 8000},
    )

    assert response.status_code == 200
    assert response.json()["transaction"]["kind"] == "expense"
    assert response.json()["transaction"]["merchant"] == "Demo Mart"
    assert response.json()["transaction"]["amount"] == 123000


def test_chat_endpoint_mock_flow() -> None:
    response = client.post(
        "/api/chat",
        json={
            "message": "Tôi nên giảm khoản chi nào?",
            "history": [{"role": "user", "content": "Tóm tắt ngân sách tháng này"}],
        },
    )

    payload = response.json()
    assert response.status_code == 200
    assert payload["provider"] in {"mock", "gemini"}
    assert payload["reply"]
