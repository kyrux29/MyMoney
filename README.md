# MyMoney FastAPI Demo

Demo web mobile cho MyMoney, gồm frontend tĩnh và backend Python FastAPI deploy trên Vercel.

## Cấu trúc

```text
api/
  index.py              # entrypoint Vercel
  main.py               # FastAPI app + routes
  config.py             # env/path config
  demo_data.py          # dữ liệu mock cho demo
  services/ocr.py       # Gemini OCR + fallback mock
  services/chat.py      # Gemini chatbot + fallback mock
public/
  index.html
  app.js
  styles.css
  manifest.webmanifest
  assets/
tests/
  test_api.py
```

## Chạy Local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

Mở app:

```text
http://localhost:8000
```

API health:

```text
http://localhost:8000/api/health
```

## Test

```bash
source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Deploy Vercel

Import repo vào Vercel và giữ root directory là thư mục gốc. Vercel dùng:

- `public/` cho frontend static.
- `api/index.py` cho Python Serverless Function.
- `vercel.json` để rewrite `/api/*` về FastAPI.
- `requirements.txt` để cài runtime dependencies.

Environment variables:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
ENABLE_GEMINI_OCR=true
ENABLE_GEMINI_CHAT=true
MAX_UPLOAD_BYTES=4000000
```

Nếu chưa có `GEMINI_API_KEY`, OCR tự fallback sang mock để demo vẫn chạy.

## Luồng Demo

1. Vào màn `Quét hóa đơn`.
2. Bấm icon camera để bật camera thật.
3. Bấm `Chụp & đọc` để gửi ảnh tới `POST /api/receipts/scan`.
4. FastAPI gọi Gemini nếu có key, nếu không trả dữ liệu mock.
5. Frontend hiển thị nhà cung cấp, tổng tiền, VAT, danh mục và dòng hàng.

## Trợ Lý AI

- Trợ lý là bong bóng chat nổi ở góc dưới màn hình và hiện trên mọi tab.
- Frontend gọi `POST /api/chat`.
- Backend gửi hội thoại ngắn tới Gemini qua `api/services/chat.py`.
- Nếu chưa có `GEMINI_API_KEY`, chatbot trả lời bằng mock để demo không bị gián đoạn.

## OCR Hóa Đơn

- Demo hiện dùng Gemini để nhận diện ảnh và trả JSON có `merchant`, `totalAmount`, `vatAmount`, `categoryName`, `items`.
- Frontend tự copy kết quả OCR vào form hóa đơn để người dùng sửa trước khi lưu.
- Nếu cần OCR thuần Python trên server riêng, có thể cân nhắc `pytesseract`, `EasyOCR` hoặc `PaddleOCR`. Với Vercel demo, các thư viện OCR native/deep learning thường nặng hơn và dễ làm chậm cold start, nên Gemini API phù hợp hơn.

Lưu ý: camera web cần HTTPS hoặc localhost. Khi deploy Vercel, domain `https://...vercel.app` đáp ứng điều kiện này.
