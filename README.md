# MariThon

Goal: Upload a document, auto-extract key clauses (Laytime, Demurrage), and generate actionable insights (Alerts).

### Monorepo
- backend: FastAPI + SQLAlchemy + SQLite + local storage + google-genai
- frontend: Next.js + Clerk + Tailwind
- storage/: local files (uploaded docs)

### Environment
- Create `.env` files in backend and frontend (see `.env.example` files in each).

### Backend
- Tech: Python 3.10+, FastAPI, SQLAlchemy, pdfminer.six, python-docx, google-genai
- Env (backend/.env):
  - GEMINI_API_KEY=...
  - DATABASE_URL=sqlite:///./app.db
  - STORAGE_DIR=./storage
  - MOCK_NOR_DATE=2025-08-15
- Run:
  - cd backend
  - python -m venv venv && source venv/bin/activate
  - pip install -U -r requirements.txt
  - uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
- Test Gemini (optional):
  - PYTHONPATH=. python app/test_gemini.py


### Frontend
- Tech: Next.js (App Router) + TypeScript + Tailwind + Clerk
- Env (frontend/.env):
  - NEXT_PUBLIC_API_BASE=http://localhost:8000/api
  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
  - CLERK_SECRET_KEY=...
- Run:
  - cd frontend && npm install
  - npm run dev

### Per‑Voyage NOR configuration
- Purpose: The alert engine evaluates Laycan against a Notice of Readiness (NOR) date.