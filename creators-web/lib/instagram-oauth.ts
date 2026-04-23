import oauth from "@/config/instagram-oauth.json";

export { oauth as instagramOAuthConfig };
export const INSTAGRAM_OAUTH_SCOPES = oauth.defaultScopes;

/**
 * Build Instagram Business Login authorization URL (same flow as `server.js` /auth/instagram).
 */
export function buildInstagramAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  scope: string = oauth.defaultScopes
): string {
  const p = new URLSearchParams({
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
