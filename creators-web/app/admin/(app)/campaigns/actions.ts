"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/admin-supabase";
import { getAdminSession } from "@/lib/admin-session";

export async function createCampaign(formData: FormData) {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated");
  const supabase = getAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  const budget = Number(formData.get("budget_inr") ?? 0);
  const deliverable = String(formData.get("deliverable") ?? "").trim() || null;
  const deadlineRaw = String(formData.get("deadline") ?? "").trim();
  const deadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;
  const status = (String(formData.get("status") ?? "open") || "open") as
    | "draft"
    | "open"
    | "closed";
  const brandIdRaw = String(formData.get("brand_id") ?? "").trim();
  const newBrandName = String(formData.get("new_brand_name") ?? "").trim();

  if (!title || !brief || !Number.isFinite(budget) || budget < 0) {
    throw new Error("Title, brief and non-negative budget are required");
  }

  let brandId: string | null = brandIdRaw && brandIdRaw !== "__new" ? brandIdRaw : null;
  if (brandIdRaw === "__new" && newBrandName) {
    const { data: brand, error: bErr } = await supabase
      .from("brands")
      .insert({ name: newBrandName })
      .select("id")
      .single();
    if (bErr) throw new Error(bErr.message);
    brandId = brand.id;
  }

  const { error } = await supabase.from("campaigns").insert({
    title,
    brief,
    budget_inr: Math.round(budget),
    deliverable,
    deadline,
    status,
    brand_id: brandId
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/campaigns");
  redirect("/admin/campaigns");
}

export async function setCampaignStatus(id: string, status: "open" | "closed" | "archived") {
  const supabase = getAdminClient();
  const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/campaigns");
}
