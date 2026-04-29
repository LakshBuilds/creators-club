import { NextResponse } from "next/server";

export const runtime = "nodejs";

const HOST = "https://ext1.buyhatke.com";
const COOKIE_NAME = "connect.bh-giftvoucher.sid";
const SESSION_HEADER_IN = "x-bh-session";
const SESSION_HEADER_OUT = "x-bh-set-session";

// Mobile RN cannot reliably send the Cookie header to ext1.buyhatke.com — the
// platform networking layer strips/mangles it. This proxy lets the mobile app
// send the buyhatke session id as `X-Bh-Session` (which RN passes through),
// which we translate back to a real Cookie on the server side. New session ids
// returned via Set-Cookie are surfaced to the client via `X-Bh-Set-Session`.

function extractSid(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const m = setCookie.match(/connect\.bh-giftvoucher\.sid=([^;,\s]+)/);
  return m ? m[1] : null;
}

async function forward(request: Request, segments: string[]): Promise<NextResponse> {
  const url = `${HOST}/${segments.join("/")}`;
  const session = request.headers.get(SESSION_HEADER_IN);

  const upstreamHeaders: Record<string, string> = {
    "Content-Type": request.headers.get("content-type") ?? "application/json",
    Accept: "application/json"
  };
  if (session) upstreamHeaders.Cookie = `${COOKIE_NAME}=${session}`;

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const upstream = await fetch(url, {
    method: request.method,
    headers: upstreamHeaders,
    body
  });

  const setCookie = upstream.headers.get("set-cookie");
  const newSid = extractSid(setCookie);

  const text = await upstream.text();
  const responseHeaders: Record<string, string> = {
    "Content-Type": upstream.headers.get("content-type") ?? "application/json"
  };
  if (newSid) responseHeaders[SESSION_HEADER_OUT] = newSid;

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
