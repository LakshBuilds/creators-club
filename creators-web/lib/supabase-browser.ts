"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase browser env missing");
  cached = createBrowserClient(url, key);
  return cached;
}
