import { supabase } from "./supabase";

export type TrendingReel = {
  id: string;
  ig_video_id: string | null;
  video_url: string;
  poster_url: string | null;
  caption: string | null;
  category: string | null;
  rank: number;
  is_active: boolean;
};

export type TrendingProduct = {
  id: string;
  buyhatke_site_id: string | null;
  name: string;
  image_url: string | null;
  url: string | null;
  category: string | null;
  rank: number;
  is_active: boolean;
};

export type TrendingAudio = {
  id: string;
  title: string;
  artist: string | null;
  cover_url: string | null;
  ig_audio_id: string | null;
  preview_url: string | null;
  rank: number;
  is_active: boolean;
};

export async function fetchTrendingReels(limit = 12) {
  return supabase
    .from("trending_reels")
    .select("*")
    .eq("is_active", true)
    .order("rank", { ascending: true })
    .limit(limit);
}

export async function fetchTrendingProducts(opts: { category?: string | null; limit?: number } = {}) {
  let q = supabase
    .from("trending_products")
    .select("*")
    .eq("is_active", true)
    .order("rank", { ascending: true });
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.limit) q = q.limit(opts.limit);
  return q;
}

export async function fetchTrendingAudio(limit = 12) {
  return supabase
    .from("trending_audio")
    .select("*")
    .eq("is_active", true)
    .order("rank", { ascending: true })
    .limit(limit);
}

/** Distinct list of product categories present in the table — used to drive
 * the filter chip row above the trending products grid. */
export async function fetchProductCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("trending_products")
    .select("category")
    .eq("is_active", true);
  if (error || !data) return [];
  const set = new Set<string>();
  for (const r of data as { category: string | null }[]) {
    if (r.category) set.add(r.category);
  }
  return Array.from(set).sort();
}
