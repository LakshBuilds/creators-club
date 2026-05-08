"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/admin-supabase";
import { fetchOgImage } from "@/lib/og-image";
import { selfHostImage } from "@/lib/poster-storage";

type Table = "trending_reels" | "trending_products" | "trending_audio";

function readNum(v: FormDataEntryValue | null, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function createReel(formData: FormData) {
  const supabase = getAdminClient();
  const video_url = String(formData.get("video_url") ?? "").trim();
  if (!video_url) return;
  let poster_url = String(formData.get("poster_url") ?? "").trim() || null;
  if (!poster_url) poster_url = await fetchOgImage(video_url);
  // Re-host on our own Storage bucket so the URL never expires when
  // Instagram's signed CDN URL TTL runs out (roughly weekly).
  if (poster_url) poster_url = await selfHostImage(poster_url, { keyPrefix: "reels" });
  await supabase.from("trending_reels").insert({
    video_url,
    poster_url,
    caption: String(formData.get("caption") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    rank: readNum(formData.get("rank"), 0)
  });
  revalidatePath("/admin/trending");
}

export async function createProduct(formData: FormData) {
  const supabase = getAdminClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("trending_products").insert({
    name,
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    url: String(formData.get("url") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    buyhatke_site_id: String(formData.get("buyhatke_site_id") ?? "").trim() || null,
    rank: readNum(formData.get("rank"), 0)
  });
  revalidatePath("/admin/trending");
}

export async function createAudio(formData: FormData) {
  const supabase = getAdminClient();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const preview_url = String(formData.get("preview_url") ?? "").trim() || null;
  let cover_url = String(formData.get("cover_url") ?? "").trim() || null;
  if (!cover_url && preview_url) cover_url = await fetchOgImage(preview_url);
  // Re-host so the URL stops depending on IG's expiring CDN signatures.
  if (cover_url) cover_url = await selfHostImage(cover_url, { keyPrefix: "audio" });
  await supabase.from("trending_audio").insert({
    title,
    artist: String(formData.get("artist") ?? "").trim() || null,
    cover_url,
    preview_url,
    ig_audio_id: String(formData.get("ig_audio_id") ?? "").trim() || null,
    rank: readNum(formData.get("rank"), 0)
  });
  revalidatePath("/admin/trending");
}

export async function toggleActive(formData: FormData) {
  const supabase = getAdminClient();
  const id = String(formData.get("id") ?? "");
  const table = String(formData.get("table") ?? "") as Table;
  const current = String(formData.get("is_active") ?? "true") === "true";
  if (!id || !["trending_reels", "trending_products", "trending_audio"].includes(table)) return;
  await supabase.from(table).update({ is_active: !current }).eq("id", id);
  revalidatePath("/admin/trending");
}

export async function removeRow(formData: FormData) {
  const supabase = getAdminClient();
  const id = String(formData.get("id") ?? "");
  const table = String(formData.get("table") ?? "") as Table;
  if (!id || !["trending_reels", "trending_products", "trending_audio"].includes(table)) return;
  await supabase.from(table).delete().eq("id", id);
  revalidatePath("/admin/trending");
}
