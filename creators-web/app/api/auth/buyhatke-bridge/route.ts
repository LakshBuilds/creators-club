import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const BUYHATKE_HOST = "https://ext1.buyhatke.com";
// Matches the platform constant the buyhatke web bundle sends. Lets us call
// /isLoggedIn the same way the official site does.
const PLATFORM = "3";

type CookieJar = Map<string, string>;

function parseCookieHeader(header: string | null | undefined): CookieJar {
  const jar: CookieJar = new Map();
  if (!header) return jar;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
  return jar;
}

function serializeJar(jar: CookieJar): string {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

/**
 * Mobile app sends the buyhatke session cookie it just got from the
 * gift-card OTP verify. We:
 *   1. Call buyhatke /isLoggedIn with that cookie to get the verified email
 *      (we never trust a client-supplied email).
 *   2. Upsert a Supabase auth user with that email.
 *   3. Generate a one-shot magic-link token (admin API does NOT email it),
 *      then exchange that token for a real session client-side via the anon
 *      key. Return the access + refresh token to the mobile app.
 *   4. Mobile calls supabase.auth.setSession(...) with those tokens and is
 *      now signed in to Supabase under the same email it used for buyhatke.
 *
 * One OTP, one identity, gift-card balance auto-linked.
 */
export async function POST(request: Request) {
  let body: { sessionCookie?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cookieRaw = body.sessionCookie?.trim();
  if (!cookieRaw) {
    return NextResponse.json({ error: "Missing sessionCookie" }, { status: 400 });
  }

  // Strip the userId=0 poison cookie buyhatke spend-apis sets on unauth.
  const jar = parseCookieHeader(cookieRaw);
  if (jar.get("userId") === "0") jar.delete("userId");
  const cookie = serializeJar(jar);
  if (!cookie) {
    return NextResponse.json({ error: "Empty cookie jar" }, { status: 400 });
  }

  // 1. Verify with buyhatke and pull the email out of THEIR response.
  let bhRes: Response;
  try {
    bhRes = await fetch(`${BUYHATKE_HOST}/giftVoucher/login/isLoggedIn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookie,
        Origin: "https://buyhatke.com",
        Referer: "https://buyhatke.com/"
      },
      body: JSON.stringify({ platform: PLATFORM })
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Buyhatke unreachable", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  let bhJson: { status?: number; data?: { email?: unknown; isLoggedIn?: unknown } } = {};
  try {
    bhJson = await bhRes.json();
  } catch {
    return NextResponse.json({ error: "Buyhatke returned non-JSON" }, { status: 502 });
  }
  if (!bhRes.ok || bhJson.status !== 1 || typeof bhJson.data?.email !== "string") {
    return NextResponse.json(
      { error: "Buyhatke session invalid or expired" },
      { status: 401 }
    );
  }
  const email = bhJson.data.email.toLowerCase();

  // 2-4. Upsert Supabase user, generate one-shot link, exchange for session.
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Try to create the user. If the email is already registered we fall
  // through (generateLink works for existing users too). Skipping the O(N)
  // listUsers scan saves 1-3s per sign-in and keeps the bridge fast as
  // the user table grows.
  //
  // Only swallow the "email already registered" family of errors. Anything
  // else (e.g. "Database error saving new user" from a trigger throwing on a
  // unique violation against a stale profile row) must surface — otherwise we
  // hand the client a session for a user whose profile doesn't exist and the
  // app spins forever on the loadOnboarding query.
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true
  });
  if (created.error) {
    const msg = created.error.message ?? "";
    const benign = /(already.*registered|already exists|email[_ ]exists|user[_ ]already)/i.test(msg);
    if (!benign) {
      return NextResponse.json(
        { error: "create_user_failed", message: msg },
        { status: 500 }
      );
    }
  }
  const user = created.data?.user ?? null;

  // Refuse sign-in for paused accounts. We can't go by user.id here — when the
  // email already existed createUser returns null, so we look up the profile
  // by email instead. Pause is a self-service "freeze me" toggle; unpausing
  // requires emailing support, who flips the flag in admin.
  const { data: paused, error: pausedErr } = await admin
    .from("profiles")
    .select("paused")
    .eq("email", email)
    .maybeSingle();
  if (pausedErr) {
    return NextResponse.json({ error: pausedErr.message }, { status: 500 });
  }
  if (paused?.paused === true) {
    return NextResponse.json(
      {
        error: "account_paused",
        message: "Your account is paused. Email support@buyhatke.com to reactivate."
      },
      { status: 403 }
    );
  }

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data?.properties?.hashed_token) {
    return NextResponse.json(
      { error: link.error?.message ?? "generateLink failed" },
      { status: 500 }
    );
  }

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const verify = await anon.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: "magiclink"
  });
  if (verify.error || !verify.data.session) {
    return NextResponse.json(
      { error: verify.error?.message ?? "verifyOtp failed" },
      { status: 500 }
    );
  }

  // Prefer the user object the verify session returned (always present);
  // `user` from createUser is null when the email already existed.
  const sessionUser = verify.data.user ?? user;
  return NextResponse.json({
    access_token: verify.data.session.access_token,
    refresh_token: verify.data.session.refresh_token,
    user: sessionUser
      ? { id: sessionUser.id, email: sessionUser.email }
      : { id: null, email }
  });
}
