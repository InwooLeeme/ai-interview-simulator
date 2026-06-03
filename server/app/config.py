"""서버 설정 — 루트 .env.local 에서 Gemini 키/모델 로드."""
import os
from pathlib import Path

from dotenv import load_dotenv

# server/app/config.py → parents[2] = 레포 루트
_ROOT = Path(__file__).resolve().parents[2]

# .env.local 우선, 없으면 .env (override=False: 이미 설정된 환경변수는 보존)
load_dotenv(_ROOT / ".env.local")
load_dotenv(_ROOT / ".env")

DEFAULT_MODEL = "gemini-2.5-flash-lite"


def get_api_key() -> str | None:
    """Gemini API 키. 없으면 None (호출부에서 폴백 분기)."""
    key = os.environ.get("GEMINI_API_KEY")
    key = key.strip() if key else ""
    return key or None


def get_model() -> str:
    model = os.environ.get("GEMINI_MODEL")
    return (model.strip() if model else "") or DEFAULT_MODEL
