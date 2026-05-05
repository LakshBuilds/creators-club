"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-session";
import { getAdminClient } from "@/lib/admin-supabase";

const ALLOWED = new Set(["pending", "accepted", "rejected"]);

export async function setApplicationStatus(formData: FormData) {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !ALLOWED.has(status)) return;

  const supabase = getAdminClient();
  const { error } = await supabase.from("applications").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/applications");
}
