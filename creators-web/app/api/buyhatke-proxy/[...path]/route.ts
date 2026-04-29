import { NextResponse } from "next/server";

export const runtime = "nodejs";

const HOST = "https://ext1.buyhatke.com";
const SESSION_HEADER_IN = "x-bh-session";
const SESSION_HEADER_OUT = "x-bh-set-session";

// Mobile RN cannot reliably send the Cookie header to ext1.buyhatke.com — the
// platform networking layer strips/mangles it. This proxy lets the mobile app
// send the buyhatke cookie jar as `X-Bh-Session` (which RN passes through) in
// raw `name=value; name=value` form, which we forward as a real Cookie header
// server-side. Any new cookies the upstream sets are merged into the jar and
// returned via `X-Bh-Set-Session` so the mobile client can persist them.
//
// Buyhatke uses multiple cookies across services (giftVoucher login + spend-apis
// auth), so we have to relay all of them, not just one named cookie.

type CookieJar = Map<string, string>;

function parseCookieHeader(header: string | null | undefined): CookieJar {
  const jar: CookieJar = new Map();
  if (!header) return jar;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
  return jar;
}

// Parse a single Set-Cookie value (or a comma-joined list of them) into name/value
// pairs. Splitting on `,` is risky because Expires=... contains a comma, but we
// only care about extracting the leading `name=value` of each cookie before any
// attribute boundary.
function parseSetCookie(setCookie: string | null): Array<[string, string]> {
  if (!setCookie) return [];
  const out: Array<[string, string]> = [];
  // Split on commas that look like cookie boundaries: a comma followed by
  // whitespace and a token followed by `=`. This avoids splitting on the comma
  // inside `Expires=Thu, 30 Apr 2026 ...`.
  const parts = setCookie.split(/,\s*(?=[A-Za-z0-9!#$%&'*+\-.^_`|~]+=)/);
  for (const part of parts) {
    const firstSemi = part.indexOf(";");
    const head = firstSemi >= 0 ? part.slice(0, firstSemi) : part;
    const eq = head.indexOf("=");
    if (eq < 0) continue;
    const name = head.slice(0, eq).trim();
    const value = head.slice(eq + 1).trim();
    if (name) out.push([name, value]);
  }
  return out;
}

function serializeJar(jar: CookieJar): string {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function forward(request: Request, segments: string[]): Promise<NextResponse> {
  const url = `${HOST}/${segments.join("/")}`;
  const incomingSession = request.headers.get(SESSION_HEADER_IN);
  const jar = parseCookieHeader(incomingSession);

  const upstreamHeaders: Record<string, string> = {
    "Content-Type": request.headers.get("content-type") ?? "application/json",
    Accept: "application/json",
    // The spend-apis service rejects cross-origin calls without buyhatke.com
    // Origin/Referer; replicate what the buyhatke web bundle sends.
    Origin: "https://buyhatke.com",
    Referer: "https://buyhatke.com/"
  };
  const cookieHeader = serializeJar(jar);
  if (cookieHeader) upstreamHeaders.Cookie = cookieHeader;

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const upstream = await fetch(url, {
    method: request.method,
    headers: upstreamHeaders,
    body
  });

  // Merge any new cookies into the jar so the client-side state stays in sync.
  const setCookie = upstream.headers.get("set-cookie");
  for (const [name, value] of parseSetCookie(setCookie)) {
    jar.set(name, value);
  }

  const text = await upstream.text();
  const responseHeaders: Record<string, string> = {
    "Content-Type": upstream.headers.get("content-type") ?? "application/json"
  };
  const updated = serializeJar(jar);
  if (updated) responseHeaders[SESSION_HEADER_OUT] = updated;

  return new NextResponse(text, { status: upstream.status, headers: responseHeaders });
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(request, path);
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(request, path);
}
