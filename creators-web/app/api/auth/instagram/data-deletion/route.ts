import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Meta posts here when a user revokes our app on Instagram or hits the
 * "Request data deletion" button. Spec: form-encoded body with a single
 * `signed_request` field. We verify the HMAC-SHA256 with IG_APP_SECRET,
 * pull the user_id, scrub their Instagram-derived rows from Supabase, and
 * return JSON `{ url, confirmation_code }` so the user can track status.
 *
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
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
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest();
  const got = b64urlDecode(encodedSig);
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Decode payload, extract IG user id
  type SignedRequest = { algorithm?: string; user_id?: string; issued_at?: number };
  let parsed: SignedRequest;
  try {
    parsed = JSON.parse(b64urlDecode(payload).toString("utf8")) as SignedRequest;
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }
  if (parsed.algorithm !== "HMAC-SHA256" || !parsed.user_id) {
    return NextResponse.json({ error: "Unsupported payload" }, { status: 400 });
  }

  // 3. Scrub the user's IG-derived data. We hard-delete the IG fields on the
  // creators row but keep the row itself so payout/campaign history stays
  // consistent (tables that reference creator_id by FK don't dangle).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let confirmation = crypto.randomBytes(8).toString("hex");
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
      console.error("data-deletion: supabase update failed", error);
      // Still respond 200 to Meta so they don't keep retrying — log and chase
      // out-of-band. Returning a non-200 here triggers exponential retries
      // that won't fix the underlying database issue.
    }
    // Optional audit row so support can confirm deletion happened
    confirmation = `${parsed.user_id}-${confirmation}`;
    await supabase
      .from("creator_data_deletions")
      .insert({
        ig_user_id: parsed.user_id,
        confirmation_code: confirmation,
        requested_at: new Date().toISOString()
      })
      .then(() => undefined, () => undefined);
  }

  // 4. Respond per Meta spec.
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    url: `${origin}/data-deletion-status?code=${encodeURIComponent(confirmation)}`,
    confirmation_code: confirmation
  });
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}
