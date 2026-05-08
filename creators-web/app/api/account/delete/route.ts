import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
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

  // Explicit scrub in dependency order. We don't trust FK cascades alone — some
  // tables (e.g. creator_posts) were created in Studio without `on delete cascade`,
  // and silent orphans on account deletion violate "delete everything".
  const scrub = await wipeUserRows(admin, userId);
  if (!scrub.ok) {
    return NextResponse.json(
      { error: "scrub_failed", step: scrub.step, message: scrub.message },
      { status: 500 }
    );
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return NextResponse.json(
      { error: "delete_failed", message: delErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, userId });
}

type ScrubResult =
  | { ok: true }
  | { ok: false; step: string; message: string };

async function wipeUserRows(admin: SupabaseClient, userId: string): Promise<ScrubResult> {
  // 1. Resolve creator row(s) for this profile so we can target child tables
  //    that key off creators.id rather than profiles.id.
  const { data: creatorRows, error: creatorLookupErr } = await admin
    .from("creators")
    .select("id")
    .eq("profile_id", userId);
  if (creatorLookupErr) {
    return { ok: false, step: "lookup_creators", message: creatorLookupErr.message };
  }
  const creatorIds = (creatorRows ?? []).map((r) => r.id as string);

  // 2. Resolve the application rows that belong to those creators so we can
  //    wipe submissions before applications go.
  let applicationIds: string[] = [];
  if (creatorIds.length > 0) {
    const { data: appRows, error: appLookupErr } = await admin
      .from("applications")
      .select("id")
      .in("creator_id", creatorIds);
    if (appLookupErr) {
      return { ok: false, step: "lookup_applications", message: appLookupErr.message };
    }
    applicationIds = (appRows ?? []).map((r) => r.id as string);
  }

  const steps: Array<{ name: string; run: () => Promise<{ error: { message: string } | null }> }> = [];

  if (applicationIds.length > 0) {
    steps.push({
      name: "submissions",
      run: async () => await admin.from("submissions").delete().in("application_id", applicationIds)
    });
  }

  if (creatorIds.length > 0) {
    steps.push({
      name: "creator_posts",
      run: async () => await admin.from("creator_posts").delete().in("creator_id", creatorIds)
    });
    steps.push({
      name: "payouts",
      run: async () => await admin.from("payouts").delete().in("creator_id", creatorIds)
    });
    steps.push({
      name: "applications",
      run: async () => await admin.from("applications").delete().in("creator_id", creatorIds)
    });
  }

  steps.push({
    name: "auto_dm_rules",
    run: async () => await admin.from("auto_dm_rules").delete().eq("profile_id", userId)
  });
  steps.push({
    name: "creator_ideas",
    run: async () => await admin.from("creator_ideas").delete().eq("creator_id", userId)
  });
  steps.push({
    name: "support_tickets",
    run: async () => await admin.from("support_tickets").delete().eq("creator_id", userId)
  });

  steps.push({
    name: "creators",
    run: async () => await admin.from("creators").delete().eq("profile_id", userId)
  });
  steps.push({
    name: "profiles",
    run: async () => await admin.from("profiles").delete().eq("id", userId)
  });

  for (const step of steps) {
    const { error } = await step.run();
    if (error) {
      const msg = error.message || "";
      const benign = /does not exist|relation .* does not exist|column .* does not exist/i.test(msg);
      if (!benign) {
        return { ok: false, step: step.name, message: msg };
      }
    }
  }

  return { ok: true };
}
