"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/admin-supabase";

export async function resolveTicket(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  if (!ticketId) return;
  const supabase = getAdminClient();
  await supabase
    .from("support_tickets")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  revalidatePath("/admin/support");
}
