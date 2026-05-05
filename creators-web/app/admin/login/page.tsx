"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
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
    <div className="flex min-h-screen items-center justify-center bg-indigo-50 px-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardTitle>Admin login</CardTitle>
          <CardDescription>Creators Club admin panel</CardDescription>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-sm text-indigo-900/80">
              No account?{" "}
              <Link href="/admin/signup" className="font-medium text-indigo-700 hover:text-indigo-900">
                Create one
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
