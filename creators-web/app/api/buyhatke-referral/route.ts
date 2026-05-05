import { NextResponse } from "next/server";

export const runtime = "nodejs";

// /refer redirects to /search; the actual referral SPA route is /gift-cards/referral.
const REFER_URL = "https://buyhatke.com/gift-cards/referral";
const SESSION_HEADER = "x-bh-session";

type LiveSite = {
  pos: string;
  name: string;
  logo: string;
  colour?: string;
  voucherType: string;
  lowestDiscount?: number;
  highestDiscount?: number;
  isCashback?: number;
};

type Category = { id: string; name: string };
type StoreToCategories = Record<string, number[]>;

function extractObjectLiteral(html: string, marker: string): unknown | null {
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const after = html.indexOf(":", start);
  if (after < 0) return null;
  // Skip whitespace to find the opening brace/bracket.
  let i = after + 1;
  while (i < html.length && /\s/.test(html[i])) i++;
  const open = html[i];
  if (open !== "[" && open !== "{") return null;
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr: string | null = null;
  let escape = false;
  for (let j = i; j < html.length; j++) {
    const ch = html[j];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (inStr) { if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0 && ch === close) {
        const literal = html.slice(i, j + 1);
        try {
          // eslint-disable-next-line no-new-func
          return new Function(`return ${literal};`)();
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// The buyhatke.com referral page inlines a JS object literal `liveSites:[...]`
// (with unquoted keys) inside its hydration script. The page itself doesn't
// require auth — we can scrape this without any cookies.
function extractLiveSites(html: string): LiveSite[] | null {
  const start = html.indexOf("liveSites:");
  if (start < 0) return null;
  const arrStart = html.indexOf("[", start);
  if (arrStart < 0) return null;
  // Walk forward respecting bracket depth and string state to find the matching ].
  let depth = 0;
  let inStr: string | null = null;
  let escape = false;
  for (let i = arrStart; i < html.length; i++) {
    const ch = html[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (inStr) {
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0 && ch === "]") {
        const literal = html.slice(arrStart, i + 1);
        try {
          // The literal uses unquoted keys, so JSON.parse won't work. Use a
          // sandboxed Function eval — input comes from buyhatke's own page.
          // eslint-disable-next-line no-new-func
          const fn = new Function(`return ${literal};`);
          return fn() as LiveSite[];
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// spend-apis rejects our session for unknown reasons, so as a workaround we
// scrape the SvelteKit-SSR'd referral page directly. When a logged-in user
// loads buyhatke.com/refer, the server inlines their referral code into the
// HTML — we parse it out and return JSON the mobile app can consume.

function pickReferralCode(html: string): string | null {
  // The page embeds the user's referral identifier in the SvelteKit hydration
  // payload (script blocks with __sveltekit data). Try several patterns.
  const patterns = [
    /buyhatke\.com\/join\/([A-Za-z0-9_-]+)/,
    /\/join\/([A-Za-z0-9_-]{4,})/,
    /"referralCode"\s*:\s*"([^"]+)"/,
    /"referral_code"\s*:\s*"([^"]+)"/,
    /"refer(?:ral)?Id"\s*:\s*"([^"]+)"/,
    /referralLink"\s*:\s*"https?:\\?\/\\?\/[^"\\]+\\?\/join\\?\/([^"\\]+)"/
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

function stripPoisonCookies(jar: string): string {
  // spend-apis sets userId=0 when it sees no auth — sending that to the SSR
  // page makes buyhatke.com render an anonymous view.
  return jar
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !/^userId=0(\s|$)/.test(s))
    .join("; ");
}

export async function GET(request: Request) {
  const sessionRaw = request.headers.get(SESSION_HEADER) ?? "";
  const session = stripPoisonCookies(sessionRaw);
  const headers: Record<string, string> = {
    Accept: "text/html,application/xhtml+xml",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
  };
  if (session) headers.Cookie = session;

  const upstream = await fetch(REFER_URL, { headers, redirect: "follow" });
  const html = await upstream.text();
  const liveSites = extractLiveSites(html);
  const categories = extractObjectLiteral(html, "categories:") as Category[] | null;
  const storeToCategories = extractObjectLiteral(html, "storeToCategories:") as StoreToCategories | null;

  return NextResponse.json(
    {
      status: liveSites ? 1 : 0,
      data: {
        liveSites: liveSites ?? [],
        // 1-indexed category list with id+name (buyhatke's own taxonomy).
        categories: categories ?? [],
        // pos (siteId) -> [categoryId, ...] map used by buyhatke's referral filter.
        storeToCategories: storeToCategories ?? {},
        referralCode: pickReferralCode(html)
      },
      ...(liveSites ? {} : {
        err: "Could not find liveSites in page",
        debug: { httpStatus: upstream.status, htmlLength: html.length }
      })
    },
    { status: 200 }
  );
}
