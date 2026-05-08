import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  let body: { paused?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.paused !== "boolean") {
    return NextResponse.json({ error: "missing_paused_flag" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const verifyClient = createClient(url, publishableKey, {
    auth: { persistSession: false }
  });
  const { data: userData, error: verifyErr } = await verifyClient.auth.getUser(token);
  if (verifyErr || !userData?.user) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const userId = userData.user.id;
  const admin = getSupabaseAdminClient();
  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      paused: body.paused,
      paused_at: body.paused ? new Date().toISOString() : null
    })
    .eq("id", userId);

  if (updateErr) {
    return NextResponse.json(
      { error: "update_failed", message: updateErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, paused: body.paused });
}
