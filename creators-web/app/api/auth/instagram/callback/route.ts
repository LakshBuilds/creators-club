import { NextResponse } from "next/server";
import {
  instagramOAuthConfig,
  originFromRedirectUri
} from "@/lib/instagram-oauth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const oauthError = searchParams.get("error");
  const oauthErrorDescription =
    searchParams.get("error_description") ?? searchParams.get("error_reason");
  if (oauthError) {
    return NextResponse.json(
      {
        error: oauthError,
        ...(oauthErrorDescription && { details: oauthErrorDescription })
      },
      { status: 400 }
    );
  }

  let code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      {
        error: "No authorization code",
        hint: "Start from /connect and complete the Instagram login; if the URL has only a #fragment, the server cannot read the code."
      },
      { status: 400 }
    );
  }

  code = code.replace(/#_$/, "");

  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI!;

  try {
    const body = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_IG_APP_ID!,
      client_secret: process.env.IG_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code: code
    });

    const tokenRes = await fetch(instagramOAuthConfig.accessTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    const tokenData = await tokenRes.json();
    console.log("[ig-callback] short-lived token response", {
      ok: tokenRes.ok,
      keys: tokenData && typeof tokenData === "object" ? Object.keys(tokenData) : null
    });

    // Meta uses several different error envelopes. Surface any of them with the real message.
    const tokenErrMsg =
      tokenData?.error_message ||
      tokenData?.error?.message ||
      (typeof tokenData?.error === "string" ? tokenData.error : null) ||
      tokenData?.error_description ||
      null;
    if (tokenErrMsg) {
      console.error("[ig-callback] short-lived exchange error", tokenData);
      throw new Error(tokenErrMsg);
    }

    // Some IG flows return { access_token, user_id } at the root; the new "Instagram API with
    // Instagram Login" flow nests them under data[0]. Accept either shape.
    const flat = tokenData as { access_token?: string; user_id?: string | number };
    const nested = (tokenData as { data?: Array<{ access_token?: string; user_id?: string | number }> })
      .data?.[0];
    const shortToken = flat.access_token ?? nested?.access_token;
    const shortUserId = flat.user_id ?? nested?.user_id;
    if (!shortToken || shortUserId == null) {
      console.error("[ig-callback] missing short token in response", tokenData);
      throw new Error(
        "Token exchange returned no access_token — usually means the OAuth code was already used. Restart the link from the app."
      );
    }

    // Diagnostic: ask Meta what app/scopes this short-lived token belongs to.
    // Helps confirm the app is configured for "Instagram API with Instagram Login"
    // and that the right scopes came through.
    try {
      const dbgUrl = new URL("https://graph.facebook.com/debug_token");
      dbgUrl.searchParams.set("input_token", shortToken);
      dbgUrl.searchParams.set(
        "access_token",
        `${process.env.NEXT_PUBLIC_IG_APP_ID}|${process.env.IG_APP_SECRET}`
      );
      const dbgRes = await fetch(dbgUrl.toString());
      const dbgBody = await dbgRes.json();
      console.log("[ig-callback] debug_token", {
        status: dbgRes.status,
        body: dbgBody
      });
    } catch (dbgErr) {
      console.warn("[ig-callback] debug_token failed", dbgErr);
    }

    // Try to upgrade short-lived → long-lived. If Meta rejects (e.g. IGApiException
    // when an app's product config doesn't permit the exchange), fall back to the
    // short-lived token so the user can still complete sign-in. The DB row holds
    // expires_at, so a refresh job can upgrade later when the app config is fixed.
    let longToken = shortToken;
    let expiresInSec = 60 * 60; // short-lived default ≈ 1 hour
    try {
      const longUrl = new URL("https://graph.instagram.com/access_token");
      longUrl.searchParams.set("grant_type", "ig_exchange_token");
      longUrl.searchParams.set("client_secret", process.env.IG_APP_SECRET!);
      longUrl.searchParams.set("access_token", shortToken);
      const longRes = await fetch(longUrl.toString(), { method: "GET" });
      const longData = await longRes.json();
      console.log("[ig-callback] long-lived token response", {
        ok: longRes.ok,
        status: longRes.status,
        data: longData
      });
      if (!longData.error && longData.access_token) {
        longToken = longData.access_token as string;
        expiresInSec = Number(longData.expires_in) || 60 * 60 * 24 * 60;
      } else {
        console.warn("[ig-callback] long-lived exchange skipped, using short-lived token", longData.error);
      }
    } catch (longErr) {
      console.warn("[ig-callback] long-lived exchange threw, using short-lived token", longErr);
    }
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    let profile: {
      id?: string;
      user_id?: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
    } = {};
    try {
      const meUrl = new URL(instagramOAuthConfig.graphMe);
      // user_id = IG Account ID (matches webhook entry.id). id = app-scoped ID
      // (does NOT match webhooks). We need user_id for auto-DM rule lookups.
      meUrl.searchParams.set("fields", "id,user_id,username,name,profile_picture_url");
      meUrl.searchParams.set("access_token", longToken);
      const meRes = await fetch(meUrl.toString());
      profile = await meRes.json();
      console.log("[ig-callback] /me", {
        app_scoped_id: profile.id,
        ig_user_id: profile.user_id,
        fallback_user_id: shortUserId
      });
    } catch (e) {
      console.error("[ig-callback] /me fetch failed", e);
    }

    // Webhooks use the IG Account ID (returned as `user_id`). Prefer it so auto-DM
    // rule lookups by ig_user_id match incoming webhook entry.id.
    const igUserId = profile.user_id
      ? String(profile.user_id)
      : profile.id
        ? String(profile.id)
        : String(shortUserId);

    // Persist to Supabase (server-side, bypasses RLS)
    try {
      const supabase = getSupabaseAdminClient();
      const { error: upsertErr } = await supabase
        .from("creators")
        .upsert(
          {
            ig_user_id: igUserId,
            ig_username: profile.username ?? null,
            ig_name: profile.name ?? null,
            ig_profile_picture_url: profile.profile_picture_url ?? null,
            ig_long_lived_token: longToken,
            ig_token_expires_at: expiresAt
          },
          { onConflict: "ig_user_id" }
        );
      if (upsertErr) console.error("Supabase upsert error:", upsertErr);
    } catch (dbErr) {
      console.error("Skipping DB save (Supabase env missing?):", dbErr);
    }

    try {
      const subRes = await fetch(
        `https://graph.instagram.com/v25.0/${igUserId}/subscribed_apps?subscribed_fields=comments,messages&access_token=${longToken}`,
        { method: "POST" }
      );
      const subData = await subRes.json();
      console.log("🔔 WEBHOOK SUBSCRIPTION:", subData.success ? "ENABLED" : "FAILED", subData);
    } catch (subErr) {
      console.error("❌ Failed to enable webhook subscription:", subErr);
    }

    const state = searchParams.get("state");
    if (state === "mobile") {
      const mobileScheme = process.env.MOBILE_APP_SCHEME || "creatorsclub";
      const mq = new URLSearchParams({
        access_token: longToken,
        user_id: igUserId,
        ...(profile.username ? { username: profile.username } : {})
      });
      return NextResponse.redirect(`${mobileScheme}://auth?${mq.toString()}`);
    }

    const site = originFromRedirectUri(redirectUri);
    const q = new URLSearchParams({ user_id: igUserId });
    if (profile.username) q.set("username", profile.username);
    return NextResponse.redirect(`${site}/dashboard?${q.toString()}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ig-callback] error", message);
    // For mobile flows, bounce back to the app via the custom scheme so the WebBrowser closes
    // and the app can show its own friendly error UI instead of a raw 500 JSON page.
    const state = new URL(request.url).searchParams.get("state");
    if (state === "mobile") {
      const mobileScheme = process.env.MOBILE_APP_SCHEME || "creatorsclub";
      const mq = new URLSearchParams({ error: message });
      return NextResponse.redirect(`${mobileScheme}://auth?${mq.toString()}`);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
