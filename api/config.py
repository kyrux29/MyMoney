import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = PROJECT_ROOT / "public"

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", "4000000"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
ENABLE_GEMINI_OCR = os.getenv("ENABLE_GEMINI_OCR", "true").lower() != "false"
ENABLE_GEMINI_CHAT = os.getenv("ENABLE_GEMINI_CHAT", os.getenv("ENABLE_GEMINI_OCR", "true")).lower() != "false"
