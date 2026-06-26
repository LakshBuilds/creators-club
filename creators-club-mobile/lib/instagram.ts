export function parseInstagramHandle(input: string): string | null {
  if (!input) return null;
  const s = input.trim();

  try {
    const url = new URL(s.includes("://") ? s : `https://${s}`);
    if (!/instagram\.com$/i.test(url.hostname.replace(/^www\./i, ""))) {
      return extractBareHandle(s);
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    const reserved = new Set(["p", "reel", "reels", "tv", "explore", "stories", "accounts"]);
    const first = parts[0].replace(/^@/, "").toLowerCase();
    if (reserved.has(first)) return null;
    return sanitize(first);
  } catch {
    return extractBareHandle(s);
  }
}

function extractBareHandle(s: string): string | null {
  const cleaned = s.replace(/^@/, "").trim();
  return sanitize(cleaned);
}

function sanitize(handle: string): string | null {
  const h = handle.toLowerCase().replace(/[^a-z0-9._]/g, "");
  if (!h || h.length > 30) return null;
  return h;
}
