MariThon Frontend

Setup
- cp .env.example .env.local
- Fill Clerk keys if you want auth UI; otherwise it renders minimal UI without enforcement.
- npm install
- npm run dev

Config
- NEXT_PUBLIC_API_BASE points to FastAPI (default http://localhost:8000/api)

Routes
- /dashboard: Alert cards
- /voyages/[voyageId]: Upload + documents + highlighted viewer
