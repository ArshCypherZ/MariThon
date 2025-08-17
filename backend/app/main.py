from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging

# Load .env as early as possible so settings at import-time see env vars
load_dotenv()

# Configure logging for services
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")

from .routers import uploads, reads

app = FastAPI(title="MariThon API", version="0.1.0")

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(uploads.router, prefix="/api")
app.include_router(reads.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
