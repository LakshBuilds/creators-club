import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, signAdminSession } from "@/lib/admin-jwt";
import { verifyPassword } from "@/lib/admin-password";
import { getAdminClient } from "@/lib/admin-supabase";

export async function POST(request: Request) {
  let body: { email?: string; password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, name, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || !verifyPassword(password, data.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
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
