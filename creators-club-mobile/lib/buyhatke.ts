import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./apiBase";
import { createLogger } from "./logger";

const log = createLogger("buyhatke");

// We talk to ext1.buyhatke.com via a Next.js proxy on creators-web because RN
// strips/mangles the Cookie header on direct cross-origin POSTs. The proxy
// translates a custom X-Bh-Session header to a real Cookie server-side.
const HOST = `${API_BASE_URL}/api/buyhatke-proxy`;
const SESSION_HEADER_OUT = "X-Bh-Session";
const SESSION_HEADER_IN = "x-bh-set-session";
const STORE_KEY = "buyhatke_session_cookie";
// Matches the platform constant the buyhatke web bundle sends. Used by isLoggedIn.
const PLATFORM = "3";

export const BUYHATKE_JOIN_BASE = "https://buyhatke.com/join/";

export type ApiResult<T = unknown> =
  | { status: 1; data?: T; [k: string]: unknown }
  | { status: 0; err?: string; [k: string]: unknown };

let memoryCookie: string | null = null;
let cookieLoaded = false;

// Drop the userId=0 poison cookie that buyhatke's spend-apis sets on every
// unauthed response. If we send it back, the SSR for /gift-cards/referral
// renders the anonymous view.
function stripPoisonCookies(jar: string | null): string | null {
  if (!jar) return jar;
  const cleaned = jar
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !/^userId=0(\s|$)/.test(s))
    .join("; ");
  return cleaned.length > 0 ? cleaned : null;
}

async function loadCookie(): Promise<string | null> {
  if (cookieLoaded) return memoryCookie;
  try {
    memoryCookie = stripPoisonCookies(await SecureStore.getItemAsync(STORE_KEY));
  } catch (e) {
    log.warn("loadCookie failed", e);
    memoryCookie = null;
  }
  cookieLoaded = true;
  return memoryCookie;
}

async function saveCookie(value: string): Promise<void> {
  const cleaned = stripPoisonCookies(value);
  if (!cleaned) {
    await clearCookie();
    return;
  }
  memoryCookie = cleaned;
  cookieLoaded = true;
  try {
    await SecureStore.setItemAsync(STORE_KEY, cleaned);
  } catch (e) {
    log.warn("saveCookie failed", e);
  }
}

async function clearCookie(): Promise<void> {
  memoryCookie = null;
  cookieLoaded = true;
  try {
    await SecureStore.deleteItemAsync(STORE_KEY);
  } catch (e) {
    log.warn("clearCookie failed", e);
  }
}

async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResult<T>> {
  const session = await loadCookie();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((init.headers as Record<string, string>) ?? {})
  };
  if (session) headers[SESSION_HEADER_OUT] = session;

  let res: Response;
  try {
    res = await fetch(`${HOST}${path}`, { ...init, headers });
  } catch (e) {
    log.error("fetch failed", { path, e });
    return { status: 0, err: e instanceof Error ? e.message : "Network error" };
  }

  const newSession = res.headers.get(SESSION_HEADER_IN);
  if (__DEV__) log.debug("response headers", { path, sentSessionTail: session?.slice(-6), newSessionTail: newSession?.slice(-6) });
  if (newSession && newSession !== session) {
    await saveCookie(newSession);
    log.info("session updated", { tail: newSession.slice(-6) });
  }

  if (!res.ok) {
    log.warn("non-2xx", { path, status: res.status });
    if (res.status === 429) {
      return { status: 0, err: "Too many attempts. Please wait a minute and try again." };
    }
    return { status: 0, err: res.statusText || `HTTP ${res.status}` };
  }
  try {
    const json = (await res.json()) as ApiResult<T>;
    if (__DEV__) log.debug("response", { path, json });
    return json;
  } catch (e) {
    log.error("invalid json", { path, e });
    return { status: 0, err: "Invalid JSON response" };
  }
}

export async function generateOtp(email: string): Promise<ApiResult> {
  return api("/giftVoucher/login/generateOtp", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function verifyOtp(email: string, otp: string): Promise<ApiResult> {
  return api("/giftVoucher/login/verifyOtp", {
    method: "POST",
    body: JSON.stringify({ email, otp })
  });
}

export async function isLoggedIn(): Promise<ApiResult> {
  return api("/giftVoucher/login/isLoggedIn", {
    method: "POST",
    body: JSON.stringify({ platform: PLATFORM })
  });
}

export type ReferralCodeData = {
  referrerCode?: string;
  customReferrerCode?: string;
  customName?: string;
  // Legacy aliases used by older session normalizer code.
  referralCode?: string;
  code?: string;
  joinUrl?: string;
  joinLink?: string;
  [k: string]: unknown;
};

export async function getReferralCode(): Promise<ApiResult<ReferralCodeData>> {
  return api<ReferralCodeData>("/giftVoucher/referral/userReferralCode");
}

export type ReferralInfo = {
  rewardBalance?: number;
  pendingReward?: number;
  referrerCount?: number;
  totalEarning?: number;
  orderCount?: number;
  totalCashback?: number;
  cashbackAmount?: number;
  [k: string]: unknown;
};

export async function getReferralInfo(): Promise<ApiResult<ReferralInfo>> {
  return api<ReferralInfo>("/giftVoucher/referral/walletDetails");
}

export type SiteRewardEntry = {
  siteId: string;
  voucherType: string;
  siteReward: string;
  discount: number;
};

export type SiteInfo = {
  website_name: string;
  website_image: string;
  categories?: number[];
};

// Category list keyed by buyhatke's 1-indexed category IDs (matches the
// `categories` array embedded in /gift-cards/referral and the values in the
// `storeToCategories` map).
export const BRAND_CATEGORIES: Array<{ id: number; name: string }> = [
  { id: 1, name: "Dining & Food" },
  { id: 2, name: "Fashion & Accessories" },
  { id: 3, name: "Travel & Leisure" },
  { id: 4, name: "E-commerce & Technology" },
  { id: 5, name: "Groceries & Essentials" },
  { id: 6, name: "Entertainment & OTT" },
  { id: 7, name: "Home & Living" },
  { id: 8, name: "Health & Wellness" },
  { id: 9, name: "Books & Stationery" },
  { id: 10, name: "Beauty & Personal Care" },
  { id: 11, name: "Jewellery" },
  { id: 12, name: "Sports & Fitness" },
  { id: 13, name: "Shopping" },
  { id: 14, name: "Gaming" }
];

export type BrandCommission = {
  siteId: string;
  voucherType: string;
  name: string;
  logo: string;
  categories: number[];
  // Total reward percent advertised by buyhatke. Normal mode splits 80/20
  // between creator/friend with the friend bonus pulled from `discount`;
  // boosted mode splits 75/25 derived purely from totalPercent.
  totalPercent: number;
  yourRewardNormal: number;
  yourRewardBoosted: number;
  platformDiscount: number;
  friendBonusNormal: number;
  friendBonusBoosted: number;
  friendDiscountNormal: number;
  friendDiscountBoosted: number;
};

type LiveSite = {
  pos: string;
  name: string;
  logo: string;
  voucherType: string;
};

type ReferralPageData = {
  liveSites: LiveSite[];
  storeToCategories: Record<string, number[]>;
};

const REFERRAL_LIVESITES_URL = `${API_BASE_URL}/api/buyhatke-referral`;

async function fetchReferralPageData(): Promise<ReferralPageData> {
  try {
    const session = await loadCookie();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (session) headers[SESSION_HEADER_OUT] = session;
    const res = await fetch(REFERRAL_LIVESITES_URL, { headers });
    if (!res.ok) return { liveSites: [], storeToCategories: {} };
    const json = (await res.json()) as {
      status: number;
      data?: { liveSites?: LiveSite[]; storeToCategories?: Record<string, number[]> };
    };
    if (json.status !== 1) return { liveSites: [], storeToCategories: {} };
    return {
      liveSites: json.data?.liveSites ?? [],
      storeToCategories: json.data?.storeToCategories ?? {}
    };
  } catch {
    return { liveSites: [], storeToCategories: {} };
  }
}

export async function getBrandCommissions(): Promise<ApiResult<BrandCommission[]>> {
  const [rewardsRes, sitesRes, pageData] = await Promise.all([
    api<{ siteRewardDetails?: SiteRewardEntry[] }>("/giftVoucher/referral/siteRewardDetails"),
    api<Record<string, SiteInfo>>("/spend-apis/sitesList/getAllSites"),
    fetchReferralPageData()
  ]);
  if (rewardsRes.status !== 1) {
    return { status: 0, err: rewardsRes.err ?? "siteRewardDetails failed" };
  }
  const rewards = rewardsRes.data?.siteRewardDetails ?? [];
  const sites = sitesRes.status === 1 ? (sitesRes.data ?? {}) : {};
  const { liveSites, storeToCategories } = pageData;
  // Build a (pos, voucherType) → liveSite lookup for voucher-specific names/logos.
  const liveLookup = new Map<string, LiveSite>();
  for (const ls of liveSites) liveLookup.set(`${ls.pos}:${ls.voucherType}`, ls);

  const commissions: BrandCommission[] = [];
  for (const r of rewards) {
    const total = parseFloat(r.siteReward);
    if (!Number.isFinite(total) || total <= 0) continue;
    const platformDiscount = typeof r.discount === "number" ? r.discount : 0;
    // Prefer the voucher-specific name from buyhatke's liveSites payload; fall
    // back to the generic site entry, then skip the row.
    const live = liveLookup.get(`${r.siteId}:${r.voucherType}`);
    const generic = sites[r.siteId];
    const name = live?.name ?? generic?.website_name;
    const logo = live?.logo ?? generic?.website_image ?? "";
    if (!name) continue;
    // Use buyhatke's storeToCategories first; fall back to generic site categories.
    const categoryIds = storeToCategories[r.siteId] ?? generic?.categories ?? [];
    // Buyhatke web's payout split (verified against the site bundle):
    //   rewardPercent = siteReward * 0.8 (the share buyhatke gives away in normal mode)
    //   totalPercent  = siteReward       (the full pool, used in boosted mode)
    // In normal mode, that 80% pool is split 75/25 between creator and friend.
    // In boosted mode, the full 100% is split 75/25.
    const rewardPercent = total * 0.8;
    commissions.push({
      siteId: r.siteId,
      voucherType: r.voucherType,
      name,
      logo,
      categories: categoryIds,
      totalPercent: total,
      yourRewardNormal: +(rewardPercent * 0.75).toFixed(2),
      yourRewardBoosted: +(total * 0.75).toFixed(2),
      platformDiscount,
      friendBonusNormal: +(rewardPercent * 0.25).toFixed(2),
      friendBonusBoosted: +(total * 0.25).toFixed(2),
      friendDiscountNormal: +(platformDiscount + rewardPercent * 0.25).toFixed(2),
      friendDiscountBoosted: +(platformDiscount + total * 0.25).toFixed(2)
    });
  }
  commissions.sort((a, b) => b.yourRewardNormal - a.yourRewardNormal);
  return { status: 1, data: commissions };
}

export async function disconnect(): Promise<void> {
  await clearCookie();
}

export async function hasStoredSession(): Promise<boolean> {
  const c = await loadCookie();
  return c !== null && c.length > 0;
}

/** Returns the raw `name=value; ...` cookie jar for the current Buyhatke
 * session, or null if not signed in. Used by the Supabase bridge endpoint
 * to verify a Buyhatke login server-side and sign the matching email into
 * Supabase auth. */
export async function getStoredSessionCookie(): Promise<string | null> {
  return loadCookie();
}

export function buildJoinUrl(code: string): string {
  return `${BUYHATKE_JOIN_BASE}${code}`;
}
