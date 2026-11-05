# sectap-aichat

Local monorepo for Project sectap — basic DeepSeek AI chat (no auth, no database, no deploy).

| Path | Role |
|------|------|
| `frontend/` | Next.js (App Router) chat UI — streams replies from the API |
| `backend/` | Python FastAPI — `POST /chat` streams DeepSeek tokens (SSE) |

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- A [DeepSeek API key](https://platform.deepseek.com/)

## Configure env

### Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set:

```env
DEEPSEEK_API_KEY=sk-your-key-here
```

Optional:

```env
# DEEPSEEK_BASE_URL=https://api.deepseek.com
# DEEPSEEK_MODEL=deepseek-chat
```

Never commit real keys. `.env` is gitignored.

### Frontend

```bash
cd frontend
cp .env.example .env.local
```

Default API URL is already `http://127.0.0.1:8000`. Override with `NEXT_PUBLIC_API_URL` if needed.

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
- Chat (SSE): `POST http://127.0.0.1:8000/chat` with JSON `{ "messages": [{ "role": "user", "content": "hi" }] }`
- OpenAPI docs: http://127.0.0.1:8000/docs

CORS allows `http://localhost:3000` and `http://127.0.0.1:3000`.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — type a message and send. Replies stream in from DeepSeek via the FastAPI backend.

## How to chat

1. Start backend and frontend as above.
2. Ensure `DEEPSEEK_API_KEY` is set in `backend/.env`.
3. Open http://localhost:3000, enter a message, press **Send**.
4. The assistant bubble fills as tokens arrive (SSE). Use **Stop** to abort a stream.
