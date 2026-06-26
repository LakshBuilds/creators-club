import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { createLogger } from "./logger";

const log = createLogger("ig-oauth");

WebBrowser.maybeCompleteAuthSession();

let authSessionRunning = false;

export const IG_APP_ID =
  process.env.EXPO_PUBLIC_IG_APP_ID ?? "2670381133331898";

/** Full redirect URL including path — must match Meta app settings. */
export const IG_REDIRECT_URI =
  process.env.EXPO_PUBLIC_IG_REDIRECT_URI ??
  "https://hatkecreators.netlify.app/api/auth/instagram/callback";

// New "Instagram API with Instagram Login" uses www.instagram.com for the authorize step;
// api.instagram.com is the legacy Basic Display host and rejects instagram_business_* scopes
// with "Invalid platform app".
export const IG_AUTH_BASE = "https://www.instagram.com/oauth/authorize";
export const IG_GRAPH_BASE = "https://graph.instagram.com";

export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages"
].join(",");

export const MOBILE_RETURN_SCHEME = "creatorsclub://auth";

export function buildIgAuthorizeUrl(): string {
  // enable_fb_login=0 forces the Instagram Login path; without it Meta routes through
  // Facebook Login and returns "Invalid platform app" on apps not configured for FB Login.
  const p = new URLSearchParams({
    enable_fb_login: "0",
    force_authentication: "1",
    client_id: IG_APP_ID,
    redirect_uri: IG_REDIRECT_URI,
    response_type: "code",
    scope: IG_SCOPES,
    state: "mobile"
  });
  return `${IG_AUTH_BASE}?${p.toString()}`;
}

export type IgOAuthReturn = {
  accessToken: string;
  userId: string;
  username?: string;
  /** Permissions the user actually granted on the consent screen, in order
   * to support partial-grant flows (Developer Policy 6.2). */
  scopes?: string[];
};

/**
 * Parse the deep link the server sends back after token exchange:
 * creatorsclub://auth?access_token=...&user_id=...&username=...&scopes=a,b,c
 */
export function parseIgReturnUrl(url: string): IgOAuthReturn | null {
  try {
    const u = new URL(url);
    const access = u.searchParams.get("access_token");
    const uid = u.searchParams.get("user_id");
    if (!access || !uid) return null;
    const rawScopes = u.searchParams.get("scopes");
    return {
      accessToken: access,
      userId: uid,
      username: u.searchParams.get("username") ?? undefined,
      scopes: rawScopes
        ? rawScopes.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined
    };
  } catch (e) {
    log.error("parseIgReturnUrl", e);
    return null;
  }
}

/** Has the user granted this specific Instagram permission? Mobile UI uses
 * this to hide features (Auto-DM, Insights) when the matching scope wasn't
 * granted on the consent screen. */
export function igScopesInclude(
  scopes: string[] | null | undefined,
  required: string
): boolean {
  if (!scopes || scopes.length === 0) return false;
  return scopes.includes(required);
}

const IG_TOKEN_PROBE_TIMEOUT_MS = 8000;

/**
 * Lightweight liveness check for a stored long-lived Instagram token. Per
 * Meta Developer Policy 6.2, manual-OAuth apps must verify session validity
 * at least every 24h and force-logout when the token is invalid. Call this
 * on app foreground; it returns false when the token is dead so callers can
 * clear it from local state and prompt re-link.
 */
export async function isIgTokenStillValid(token: string): Promise<boolean> {
  if (!token) return false;
  const u = new URL(`${IG_GRAPH_BASE}/me`);
  u.searchParams.set("fields", "id");
  u.searchParams.set("access_token", token);
  try {
    const res = await fetch(u.toString(), {
      signal: AbortSignal.timeout(IG_TOKEN_PROBE_TIMEOUT_MS)
    });
    if (res.ok) return true;
    // 190 / 400 / 401 mean revoked or expired; everything else (5xx, network)
    // we treat as transient and assume still valid so we don't log users out
    // due to a hiccup.
    if (res.status === 400 || res.status === 401) return false;
    const body = await res.json().catch(() => null);
    const code = body?.error?.code;
    if (code === 190) return false;
    return true;
  } catch (e) {
    log.warn("isIgTokenStillValid network error — keeping session", e);
    return true;
  }
}

export async function startIgAuth(): Promise<IgOAuthReturn | null> {
  if (authSessionRunning) {
    log.info("startIgAuth: already in progress, ignoring");
    return null;
  }
  authSessionRunning = true;
  const authUrl = buildIgAuthorizeUrl();
  log.info("open auth session", { authUrl });
  try {
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      MOBILE_RETURN_SCHEME,
      Platform.OS === "ios"
        ? { preferEphemeralSession: true, showInRecents: false }
        : { showInRecents: false }
    );
    if (result.type !== "success" || !("url" in result) || !result.url) {
      log.info("auth session closed", { type: result.type });
      return null;
    }
    // The callback bounces errors back as ?error=… so the WebBrowser closes; surface them.
    try {
      const errParam = new URL(result.url).searchParams.get("error");
      if (errParam) throw new Error(errParam);
    } catch (e) {
      if (e instanceof Error && e.message) throw e;
    }
    return parseIgReturnUrl(result.url);
  } finally {
    authSessionRunning = false;
  }
}

/** Basic profile fields via the user token. */
export async function fetchIgMe(accessToken: string) {
  const fields =
    "id,username,name,account_type,profile_picture_url,biography,followers_count,follows_count,media_count,website";
  const u = new URL(`${IG_GRAPH_BASE}/me`);
  u.searchParams.set("fields", fields);
  u.searchParams.set("access_token", accessToken);
  const res = await fetch(u.toString());
  const body = await res.json();
  if (body.error) throw new Error(body.error.message ?? "Meta API error");
  return body as {
    id: string;
    username?: string;
    name?: string;
    account_type?: string;
    profile_picture_url?: string;
    biography?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    website?: string;
  };
}

/**
 * Graph `account_type` is `BUSINESS`, `MEDIA_CREATOR`, or `PERSONAL`.
 * Meta does not allow third-party apps to flip Personal → Professional — the user must do that in Instagram.
 */
export function isIgProfessionalAccountType(accountType?: string | null): boolean {
  if (!accountType) return false;
  const t = accountType.toUpperCase();
  return t === "BUSINESS" || t === "MEDIA_CREATOR";
}

/** Opens the Instagram app when available. */
export const IG_APP_URL = "instagram://app";

/** Meta help: switch to a professional account (in-app steps). */
export const IG_PROFESSIONAL_HELP_URL =
  "https://www.facebook.com/business/help/898752960195806";

export type IgRecentMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  /** Filled by attachIgMediaInsights — only meaningful for VIDEO / REELS. */
  view_count?: number | null;
  /** Filled by attachIgMediaInsights — available for all media types. */
  reach?: number | null;
};

export async function fetchIgRecentMedia(
  accessToken: string,
  limit = 6
): Promise<IgRecentMedia[]> {
  const fields =
    "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
  const u = new URL(`${IG_GRAPH_BASE}/me/media`);
  u.searchParams.set("fields", fields);
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("access_token", accessToken);
  const res = await fetch(u.toString());
  const body = await res.json();
  if (body.error) throw new Error(body.error.message ?? "Meta API error");
  return (body.data ?? []) as IgRecentMedia[];
}

export function isVideoMedia(m: IgRecentMedia): boolean {
  const t = (m.media_type ?? "").toUpperCase();
  const pt = (m.media_product_type ?? "").toUpperCase();
  return t === "VIDEO" || pt === "REELS";
}

/** Fetches a set of metrics for a single media item. Returns {} on error so one bad media doesn't take the whole batch down. */
export async function fetchIgMediaInsights(
  mediaId: string,
  accessToken: string,
  metrics: string[]
): Promise<Record<string, number>> {
  const u = new URL(`${IG_GRAPH_BASE}/${mediaId}/insights`);
  u.searchParams.set("metric", metrics.join(","));
  u.searchParams.set("access_token", accessToken);
  const res = await fetch(u.toString());
  const body = await res.json();
  if (body.error || !Array.isArray(body.data)) return {};
  const out: Record<string, number> = {};
  for (const row of body.data) {
    const v = row?.values?.[0]?.value;
    if (typeof v === "number" && typeof row?.name === "string") out[row.name] = v;
  }
  return out;
}

/** Mutates the input array: fills view_count (video only) and reach (all types). One Graph call per media, run in parallel. */
export async function attachIgMediaInsights(
  media: IgRecentMedia[],
  accessToken: string
): Promise<void> {
  await Promise.all(
    media.map(async (m) => {
      const metrics = isVideoMedia(m) ? ["views", "reach"] : ["reach"];
      const data = await fetchIgMediaInsights(m.id, accessToken, metrics);
      if ("views" in data) m.view_count = data.views;
      if ("reach" in data) m.reach = data.reach;
    })
  );
}

export type IgInsightsSummary = {
  followers: number | null;
  mediaCount: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  engagementPct: number | null;
  avgReach: number | null;
};

export function summarizeEngagement(
  me: Awaited<ReturnType<typeof fetchIgMe>>,
  media: IgRecentMedia[]
): IgInsightsSummary {
  // Engagement Rate that brands actually look at on this app:
  //   (avg reach of last 5 reels older than 48h) ÷ followers × 100
  // The 48h cut-off keeps fresh reels (still climbing) from dragging the
  // average down. Reels-only because feed posts and carousels behave
  // differently from short-form video.
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
  const cutoff = Date.now() - FORTY_EIGHT_HOURS_MS;
  const reels = media
    .filter((m) => isVideoMedia(m))
    .filter((m) => {
      if (!m.timestamp) return false;
      const t = Date.parse(m.timestamp);
      return Number.isFinite(t) && t < cutoff;
    })
    // IG already returns newest-first, but defensively re-sort.
    .sort((a, b) => (Date.parse(b.timestamp ?? "0")) - (Date.parse(a.timestamp ?? "0")))
    .slice(0, 5);

  const reelReach = reels
    .map((m) => m.reach)
    .filter((v): v is number => typeof v === "number");

  // Likes / comments / overall reach on the broader recent media stay useful
  // for the breakdown sheet — only the headline % switches to reach-based.
  const likes = media.map((m) => m.like_count ?? 0).reduce((a, b) => a + b, 0);
  const comments = media.map((m) => m.comments_count ?? 0).reduce((a, b) => a + b, 0);
  const overallReach = media
    .map((m) => m.reach)
    .filter((v): v is number => typeof v === "number");
  const n = media.length;

  const avgReachOfReels = reelReach.length
    ? reelReach.reduce((a, b) => a + b, 0) / reelReach.length
    : null;
  const avgReach = avgReachOfReels ?? (overallReach.length
    ? overallReach.reduce((a, b) => a + b, 0) / overallReach.length
    : null);

  const engagementPct =
    avgReachOfReels != null && me.followers_count
      ? (avgReachOfReels / me.followers_count) * 100
      : null;

  return {
    followers: me.followers_count ?? null,
    mediaCount: me.media_count ?? null,
    avgLikes: n ? likes / n : null,
    avgComments: n ? comments / n : null,
    engagementPct,
    avgReach
  };
}
