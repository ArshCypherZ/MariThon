from pydantic import BaseModel
import os


class Settings(BaseModel):
    CLERK_JWKS_URL: str | None = None
    GEMINI_API_KEY: str | None = None
    DATABASE_URL: str = "sqlite:///./app.db"
    STORAGE_DIR: str = "./storage"
    MOCK_NOR_DATE: str = "2025-08-15"


def get_settings() -> Settings:
    return Settings(
        CLERK_JWKS_URL=os.getenv("CLERK_JWKS_URL"),
        GEMINI_API_KEY=os.getenv("GEMINI_API_KEY"),
        DATABASE_URL=os.getenv("DATABASE_URL", "sqlite:///./app.db"),
        STORAGE_DIR=os.getenv("STORAGE_DIR", "./storage"),
        MOCK_NOR_DATE=os.getenv("MOCK_NOR_DATE", "2025-08-15"),
    )
