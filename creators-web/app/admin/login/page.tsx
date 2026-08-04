"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const json = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !json.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      router.replace("/admin");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-indigo-50 px-4 py-10">
      {/* Soft brand glow — decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-600/25">
            C
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-indigo-950">
              Creators Club
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
              Admin
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-indigo-100 bg-white/90 p-7 shadow-xl shadow-indigo-950/5 backdrop-blur">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-indigo-950">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-indigo-900/70">
              Sign in to the admin panel
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <Field
              label="Email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@buyhatke.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {err ? (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  className="mt-0.5 h-4 w-4 shrink-0 fill-current"
                >
                  <path d="M10 1.6a8.4 8.4 0 100 16.8 8.4 8.4 0 000-16.8zM9 6h2v6H9V6zm0 7h2v2H9v-2z" />
                </svg>
                <span>{err}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full rounded-lg py-2.5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-4 w-4 animate-spin"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeOpacity="0.3"
                      strokeWidth="3"
                    />
                    <path
                      d="M21 12a9 9 0 00-9-9"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-indigo-900/70">
            No account?{" "}
            <Link
              href="/admin/signup"
              className="font-medium text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-indigo-900/50">
          A{" "}
          <a
            href="https://buyhatke.com"
            className="font-medium text-indigo-900/70 hover:underline"
            rel="noreferrer"
          >
            Buyhatke
          </a>{" "}
          product
        </p>
      </div>
    </div>
  );
}
