"""Local FastAPI backend for sectap-aichat — DeepSeek chat streaming."""

from __future__ import annotations

import json
import os
from collections.abc import Generator
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="sectap-aichat API", version="0.1.0")

# Allow the local Next.js frontend (and common alternate ports).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)


def _get_client() -> OpenAI:
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail=(
                "DEEPSEEK_API_KEY is not set. "
                "Copy backend/.env.example to backend/.env and add your key."
            ),
        )
    return OpenAI(api_key=api_key, base_url=DEEPSEEK_BASE_URL)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/hello")
def hello(name: str = "world") -> dict[str, str]:
    return {"message": f"Hello, {name}!"}


@app.post("/chat")
def chat(body: ChatRequest) -> StreamingResponse:
    """Stream assistant tokens as Server-Sent Events (SSE)."""
    client = _get_client()
    payload = [m.model_dump() for m in body.messages]

    def event_stream() -> Generator[str, None, None]:
        try:
            stream = client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=payload,
                stream=True,
            )
            for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'content': delta}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:  # noqa: BLE001 — surface to client as SSE error
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
