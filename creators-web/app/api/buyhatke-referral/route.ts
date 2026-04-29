import { NextResponse } from "next/server";

export const runtime = "nodejs";

// /refer redirects to /search; the actual referral SPA route is /gift-cards/referral.
const REFER_URL = "https://buyhatke.com/gift-cards/referral";
const SESSION_HEADER = "x-bh-session";

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

export async function GET(request: Request) {
  const session = request.headers.get(SESSION_HEADER) ?? "";
  const headers: Record<string, string> = {
    Accept: "text/html,application/xhtml+xml",
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  };
  if (session) headers.Cookie = session;

  const upstream = await fetch(REFER_URL, { headers, redirect: "follow" });
  const html = await upstream.text();
  const code = pickReferralCode(html);

  if (!code) {
    return NextResponse.json(
      {
        status: 0,
        err: "Could not find referral code on page",
        debug: {
          httpStatus: upstream.status,
          htmlLength: html.length,
          loggedInHint: html.includes("login") || html.includes("Login")
        }
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    status: 1,
    data: {
      referralCode: code,
      joinUrl: `https://buyhatke.com/join/${code}`
    }
  });
}
