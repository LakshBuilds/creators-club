import oauth from "@/config/instagram-oauth.json";

export { oauth as instagramOAuthConfig };
export const INSTAGRAM_OAUTH_SCOPES = oauth.defaultScopes;

/**
 * The single canonical redirect_uri registered in the Meta app dashboard.
 *
 * Meta requires this value to be byte-identical between the authorize dialog
 * and the token exchange, otherwise the exchange fails with "redirect_uri is
 * not identical". It must also match the mobile app's EXPO_PUBLIC_IG_REDIRECT_URI
 * default, since a mobile build bakes its redirect_uri in at compile time and the
 * server cannot read it.
 *
 * We resolve it from NEXT_PUBLIC_REDIRECT_URI but fall back to the same hardcoded
 * production URL the mobile app uses, so the two never drift even if the server
 * env is missing. We intentionally do NOT reconstruct it from request headers
 * (x-forwarded-host), which varies by custom domain / branch deploy / proxy and
 * caused the mismatch.
 */
export const INSTAGRAM_REDIRECT_URI =
  process.env.NEXT_PUBLIC_REDIRECT_URI ??
  "https://hatkecreators.netlify.app/api/auth/instagram/callback";

/**
 * Build Instagram Business Login authorization URL (same flow as `server.js` /auth/instagram).
 */
export function buildInstagramAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  scope: string = oauth.defaultScopes
): string {
  const p = new URLSearchParams({
    // enable_fb_login=0 forces the *Instagram* Business Login path. Without it,
    // Instagram defaults to enable_fb_login=1 (the Facebook Login path), whose
    // redirect_uri is whitelisted in a DIFFERENT dashboard field (Facebook Login
    // settings, not Instagram → Business login settings). That mismatch makes the
    // consent step fail with "Invalid redirect_uri" *after* the user logs in,
    // even though the pre-login check passes. Keep this identical to the
    // /api/auth/instagram route so both entry points behave the same.
    enable_fb_login: "0",
    force_authentication: "1",
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scope
  });
  return `${oauth.authBase}?${p.toString()}`;
}

/** App origin (e.g. https://x.netlify.app) from a full callback URL. */
export function originFromRedirectUri(redirectUri: string): string {
  return new URL(redirectUri).origin;
}

export function longLivedExchangeUrl(appSecret: string, shortLivedToken: string): string {
  const p = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken
  });
  return `https://graph.instagram.com/access_token?${p.toString()}`;
}
