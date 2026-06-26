import type { User } from "@supabase/supabase-js";

/** Label for profile when using phone auth (no email). */
export function userDisplayName(user: User | null | undefined): string {
  if (!user) return "creator";
  const fromEmail = user.email?.split("@")[0];
  if (fromEmail) {
    return fromEmail.replace(/[^a-zA-Z0-9]/g, " ").trim() || "creator";
  }
  if (user.phone) {
    return user.phone.replace(/^\+/, "");
  }
  return "creator";
}
