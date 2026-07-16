import { NextResponse } from "next/server";
import {
  instagramOAuthConfig,
  INSTAGRAM_REDIRECT_URI
} from "@/lib/instagram-oauth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") === "mobile" ? "mobile" : "web";

  const params = new URLSearchParams({
    enable_fb_login: "0",
    force_authentication: "1",
    client_id: process.env.NEXT_PUBLIC_IG_APP_ID!,
    redirect_uri: INSTAGRAM_REDIRECT_URI,
    response_type: "code",
    scope: instagramOAuthConfig.defaultScopes,
    state: platform
  });
  return NextResponse.redirect(`${instagramOAuthConfig.authBase}?${params.toString()}`);
}
