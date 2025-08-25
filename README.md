# MariThon — Voyage Document Analyzer

Upload a charter party document, auto‑extract the key clauses (Laytime/Laycan and Demurrage), and raise actionable alerts (e.g., NOR outside Laycan window). View everything in a clean dashboard and a document viewer with highlighted evidence.

## What it does
- Upload PDF/DOCX/TXT for a voyage
- Finds Laytime/Laycan and Demurrage snippets and highlights them
- Check the Laycan window against a Notice of Readiness (NOR) date and create an alert if inconsistent
- Browse alerts and voyages, open a document, and jump to the highlighted evidence

## Tech stack
- Backend: FastAPI, SQLAlchemy, SQLite, pdfminer.six, python‑docx, google‑genai
- Frontend: Next.js (App Router), TypeScript, Tailwind, SWR, shadcn/ui, Clerk (auth)

## Quick start (Linux)
Prerequisites
- Python 3.10+
- Node.js 18+
- Bash, pip, npm

### 1) Backend
1. Copy env and set values
   - cp backend/.env.example backend/.env
2. Create venv and install
   - cd backend
   - python -m venv venv && source venv/bin/activate
   - pip install -U -r requirements.txt
3. Run API (default http://localhost:8000)
   - uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

### 2) Frontend
1. Copy env and set values
   - cp frontend/.env.example frontend/.env.local
   - NEXT_PUBLIC_API_BASE should point to the backend (default http://localhost:8000/api)
2. Install and run
   - cd frontend
   - npm install
   - npm run dev
3. Open UI
   - http://localhost:3000/dashboard



## Roadmap / future integrations
- LLM/RAG for document QA
- Voice agent + chat
  - Conversational “Voyage Copilot” with speech‑to‑text and text‑to‑speech
  - Realtime call/voice integration to answer questions from the contract corpus
  - Tool calling to set NOR date, create tasks, or request missing documents
