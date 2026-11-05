"use client";

import { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

type HealthResponse = { status: string };
type HelloResponse = { message: string };

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [hello, setHello] = useState<HelloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [healthRes, helloRes] = await Promise.all([
          fetch(`${API_BASE}/health`),
          fetch(`${API_BASE}/hello?name=sectap`),
        ]);

        if (!healthRes.ok || !helloRes.ok) {
          throw new Error(
            `API error: health ${healthRes.status}, hello ${helloRes.status}`,
          );
        }

        const healthJson = (await healthRes.json()) as HealthResponse;
        const helloJson = (await helloRes.json()) as HelloResponse;

        if (!cancelled) {
          setHealth(healthJson);
          setHello(helloJson);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to reach the local API. Is the backend running?",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-16 font-[family-name:var(--font-geist-sans)]">
      <div>
        <p className="text-sm uppercase tracking-wide text-neutral-500">
          sectap-aichat
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Local frontend ↔ FastAPI
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Calls the local backend at{" "}
          <code className="rounded bg-black/[.05] px-1 py-0.5 text-sm dark:bg-white/[.08]">
            {API_BASE}
          </code>
          .
        </p>
      </div>

      {loading && <p className="text-sm text-neutral-500">Loading…</p>}

      {error && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {!loading && !error && (
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-neutral-500">GET /health</dt>
            <dd className="mt-1 font-mono">
              {JSON.stringify(health, null, 2)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">GET /hello</dt>
            <dd className="mt-1 font-mono">
              {JSON.stringify(hello, null, 2)}
            </dd>
          </div>
        </dl>
      )}
    </main>
  );
}
