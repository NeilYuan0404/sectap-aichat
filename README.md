# sectap-aichat

Local monorepo for Project sectap.

| Path | Role |
|------|------|
| `frontend/` | Next.js (App Router) — Vercel-friendly; develop locally first |
| `backend/` | Python FastAPI — local API Neil owns |

No production deploy config is included. Do not deploy until asked.

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+

## Run locally

Use two terminals.

### 1. Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- Health: http://127.0.0.1:8000/health
- Hello: http://127.0.0.1:8000/hello?name=sectap
- OpenAPI docs: http://127.0.0.1:8000/docs

CORS allows `http://localhost:3000` and `http://127.0.0.1:3000`.

### 2. Frontend (Next.js)

```bash
cd frontend
cp .env.example .env.local   # if you don't already have .env.local
npm install
npm run dev
```

Open http://localhost:3000 — the page fetches `/health` and `/hello` from the backend.

Override the API base URL with `NEXT_PUBLIC_API_URL` in `frontend/.env.local` (default `http://127.0.0.1:8000`).
