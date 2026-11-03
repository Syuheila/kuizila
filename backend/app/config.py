import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Automatically load environment variables from backend/.env or root .env if present
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

DB_PATH = BASE_DIR / "kuizila.db"
raw_db_url = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
if raw_db_url.startswith("sqlite:///./"):
    rel_name = raw_db_url.replace("sqlite:///./", "")
    DATABASE_URL = f"sqlite:///{(BASE_DIR / rel_name).resolve()}"
else:
    DATABASE_URL = raw_db_url

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:latest")
OLLAMA_FALLBACK_MODEL = os.getenv("OLLAMA_FALLBACK_MODEL", "llama3.2:3b")

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
