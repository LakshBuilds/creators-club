import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, signAdminSession } from "@/lib/admin-jwt";
import { hashPassword } from "@/lib/admin-password";
import { getAdminClient } from "@/lib/admin-supabase";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; name?: string; signupSecret?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const expected = process.env.ADMIN_SIGNUP_SECRET;
  if (!expected || expected.length < 8) {
    return NextResponse.json({ error: "Signup not configured" }, { status: 503 });
  }
  if (body.signupSecret !== expected) {
    return NextResponse.json({ error: "Invalid signup secret" }, { status: 401 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim() || null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be ≥ 8 characters" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const password_hash = hashPassword(password);

  const { data, error } = await supabase
    .from("admin_users")
    .insert({ email, password_hash, name })
    .select("id, email, name")
    .single();

  if (error) {
    if (/duplicate key|unique/i.test(error.message)) {
      return NextResponse.json({ error: "Account already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { token, ttlSeconds } = signAdminSession({
    id: data.id,
    email: data.email,
    name: data.name ?? undefined
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttlSeconds
  });
  return res;
}
