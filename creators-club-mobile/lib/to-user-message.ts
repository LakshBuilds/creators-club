/**
 * Supabase/PostgREST errors are plain objects with `message`, not `Error` instances.
 * Use this for Alert text so users see the real message instead of "Unknown error".
 */
export function toUserMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string" && e.trim()) return e;
  if (e && typeof e === "object") {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts: string[] = [];
    if (typeof o.message === "string" && o.message.trim()) parts.push(o.message);
    if (typeof o.hint === "string" && o.hint.trim()) parts.push(o.hint);
    if (typeof o.details === "string" && o.details.trim() && parts.length < 2) {
      parts.push(o.details);
    }
    if (typeof o.code === "string" && o.code && parts.length === 0) parts.push(`(${o.code})`);
    if (parts.length) return parts.join(" — ");
  }
  return "Something went wrong. Please try again.";
}
