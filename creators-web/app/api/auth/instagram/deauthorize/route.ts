import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Meta posts here when a user removes our app from their Instagram (the
 * "Deauthorize" callback, configured separately from the Data Deletion
 * callback in the Meta app dashboard). Spec is identical to data-deletion:
 * a form-encoded body with a single `signed_request` field, HMAC-SHA256
 * signed with IG_APP_SECRET.
 *
 * On deauthorization we stop making Graph API calls for that user by clearing
 * their stored Instagram token + derived fields. We keep the rest of the
 * account (email, campaign history) so the user can re-link later. Full account
 * deletion is a separate, explicit action (see /api/account/delete).
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login#deauthorize-callback
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const signed = form?.get("signed_request");
  if (typeof signed !== "string" || !signed.includes(".")) {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  const secret = process.env.IG_APP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  // 1. Verify signature
  const [encodedSig, payload] = signed.split(".");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest();
  const got = b64urlDecode(encodedSig);
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Decode payload, extract IG user id
  type SignedRequest = { algorithm?: string; user_id?: string };
  let parsed: SignedRequest;
  try {
    parsed = JSON.parse(b64urlDecode(payload).toString("utf8")) as SignedRequest;
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }
  if (parsed.algorithm !== "HMAC-SHA256" || !parsed.user_id) {
    return NextResponse.json({ error: "Unsupported payload" }, { status: 400 });
  }

  // 3. Clear the Instagram link so we stop calling Graph API for this user.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { error } = await supabase
      .from("creators")
      .update({
        ig_user_id: null,
        ig_username: null,
        ig_name: null,
        ig_profile_picture_url: null,
        ig_long_lived_token: null,
        ig_token_expires_at: null,
        followers_count: null
      })
      .eq("ig_user_id", parsed.user_id);
    if (error) {
      // Respond 200 anyway so Meta doesn't retry on a transient DB issue —
      // a non-200 triggers exponential retries that won't fix the DB.
      console.error("deauthorize: supabase update failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}
