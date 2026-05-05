import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export type AdminSessionPayload = {
  sub: string;
  email: string;
  name?: string;
  iat: number;
  exp: number;
};

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function getSecret(): string {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("ADMIN_JWT_SECRET missing or too short (need ≥ 32 chars).");
  }
  return s;
}

function hmac(headerAndPayload: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(headerAndPayload).digest());
}

export function signAdminSession(input: { id: string; email: string; name?: string }): {
  token: string;
  ttlSeconds: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: input.id,
    email: input.email,
    name: input.name,
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = hmac(`${header}.${body}`, getSecret());
  return { token: `${header}.${body}.${sig}`, ttlSeconds: SESSION_TTL_SECONDS };
}

export function verifyAdminSession(token: string): AdminSessionPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [header, body, sig] = parts;
  const expected = hmac(`${header}.${body}`, getSecret());
  const a = b64urlDecode(sig);
  const b = b64urlDecode(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Bad signature");
  const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as AdminSessionPayload;
  if (Math.floor(Date.now() / 1000) >= payload.exp) throw new Error("Token expired");
  return payload;
}

export const ADMIN_SESSION_COOKIE = "admin_session";
