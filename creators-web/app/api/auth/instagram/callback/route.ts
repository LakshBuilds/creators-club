import { NextResponse } from "next/server";
import {
  instagramOAuthConfig,
  longLivedExchangeUrl,
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

    if (tokenData.error) throw new Error(tokenData.error_message);

    const longRes = await fetch(
      longLivedExchangeUrl(process.env.IG_APP_SECRET!, tokenData.access_token)
    );
    const longData = await longRes.json();
    if (longData.error) throw new Error(longData.error?.message || "Long-lived token failed");

    const longToken = longData.access_token as string;
    const expiresInSec = Number(longData.expires_in) || 60 * 60 * 24 * 60;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();
    const igUserId = String(tokenData.user_id);

    let profile: { id?: string; username?: string; name?: string; profile_picture_url?: string } = {};
    try {
      const meUrl = new URL(instagramOAuthConfig.graphMe);
      meUrl.searchParams.set("fields", "id,username,name,profile_picture_url");
      meUrl.searchParams.set("access_token", longToken);
      const meRes = await fetch(meUrl.toString());
      profile = await meRes.json();
    } catch {
      /* optional */
    }

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
