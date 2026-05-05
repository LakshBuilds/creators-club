import "server-only";

const UA = "facebookexternalhit/1.1";

/** Instagram returns og:image on /p/{code}/ but not /reels/{code}/. Normalize.
 * Leaves /reels/audio/{id}/ alone — those serve og:image directly. */
export function normalizeInstagramUrl(url: string): string {
  if (/instagram\.com\/reels?\/audio\//.test(url)) return url;
  return url.replace(/instagram\.com\/reels?\/([^/?#]+)\/?/, "instagram.com/p/$1/");
}

/** Fetch the URL's HTML and extract <meta property="og:image"> content. */
export async function fetchOgImage(url: string): Promise<string | null> {
  const target = url.includes("instagram.com/") ? normalizeInstagramUrl(url) : url;
  let res: Response;
  try {
    res = await fetch(target, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const html = await res.text();
  const m =
    html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ??
    html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (!m) return null;
  return m[1].replace(/&amp;/g, "&");
}
