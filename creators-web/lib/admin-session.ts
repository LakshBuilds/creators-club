import "server-only";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession, type AdminSessionPayload } from "./admin-jwt";

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const raw = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return verifyAdminSession(raw);
  } catch {
    return null;
  }
}
