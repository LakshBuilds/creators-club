"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

export default function AdminSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signupSecret, setSignupSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/admin/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, signupSecret })
      });
      const json = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !json.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      router.replace("/admin");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-indigo-50 px-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardTitle>Create admin account</CardTitle>
          <CardDescription>
            You need the signup secret from the team to create an admin account.
          </CardDescription>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field
              label="Name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Field
              label="Confirm password"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <Field
              label="Signup secret"
              type="password"
              required
              autoComplete="off"
              value={signupSecret}
              onChange={(e) => setSignupSecret(e.target.value)}
            />
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </Button>
            <p className="text-center text-sm text-indigo-900/80">
              Already have an account?{" "}
              <Link href="/admin/login" className="font-medium text-indigo-700 hover:text-indigo-900">
                Sign in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
