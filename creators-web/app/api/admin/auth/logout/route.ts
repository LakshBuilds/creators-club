import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-jwt";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const res = NextResponse.redirect(`${origin}/admin/login`, { status: 303 });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return res;
}
