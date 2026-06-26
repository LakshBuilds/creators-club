import { supabase } from "./supabase";

export type CreatorEarning = {
  display_name: string;
  amount_inr: number;
  earned_at: string;
};

export async function fetchRecentCreatorEarnings(
  limit = 12
): Promise<{ data: CreatorEarning[]; error: unknown }> {
  const { data, error } = await supabase
    .from("creator_earnings")
    .select("display_name, amount_inr, earned_at")
    .order("earned_at", { ascending: false })
    .limit(limit);
  return { data: (data ?? []) as CreatorEarning[], error };
}

export function formatInrCompact(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return `₹${amount}`;
}
