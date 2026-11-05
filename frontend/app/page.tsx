"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

type Role = "user" | "assistant";

type ChatMessage = {
  role: Role;
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { detail?: string };
          if (body.detail) detail = body.detail;
        } catch {
          /* ignore non-JSON error bodies */
        }
        throw new Error(detail);
      }

      if (!res.body) {
        throw new Error("No response body from /chat");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.startsWith("data:"));
          if (!line) continue;

          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as {
              content?: string;
              error?: string;
            };
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              assistant += parsed.content;
              setMessages([
                ...nextMessages,
                { role: "assistant", content: assistant },
              ]);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        /* user cancelled — keep partial reply */
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to reach the local API. Is the backend running?",
        );
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.content === "") {
            return prev.slice(0, -1);
          }
          return prev;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col px-4 py-6 font-[family-name:var(--font-geist-sans)]">
      <header className="mb-4 shrink-0">
        <p className="text-sm uppercase tracking-wide text-neutral-500">
          sectap-aichat
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          DeepSeek chat
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Streaming via{" "}
          <code className="rounded bg-black/[.05] px-1 py-0.5 text-xs dark:bg-white/[.08]">
            {API_BASE}/chat
          </code>
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">
            Send a message to start chatting. Set{" "}
            <code className="text-xs">DEEPSEEK_API_KEY</code> in{" "}
            <code className="text-xs">backend/.env</code>.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={`${msg.role}-${i}`}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
              }`}
            >
              {msg.content || (streaming && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mt-3 shrink-0 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={sendMessage} className="mt-3 flex shrink-0 gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message DeepSeek…"
          disabled={streaming}
          className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 disabled:opacity-60 dark:border-neutral-700"
          autoFocus
        />
        {streaming ? (
          <button
            type="button"
            onClick={stopStreaming}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Send
          </button>
        )}
      </form>
    </main>
  );
}
