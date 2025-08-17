import os
from typing import IO
from ..core.config import get_settings

settings = get_settings()


def ensure_storage_dir() -> str:
    path = settings.STORAGE_DIR
    os.makedirs(path, exist_ok=True)
    return path


def save_bytes(filename: str, data: bytes) -> str:
    base = ensure_storage_dir()
    safe_name = filename.replace("/", "_")
    path = os.path.join(base, safe_name)
    with open(path, "wb") as f:
        f.write(data)
    return path


def delete_file(path: str) -> None:
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception:
        # best-effort delete only
        pass
