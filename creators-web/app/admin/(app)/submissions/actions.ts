"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/admin-supabase";
import { ALLOWED_TRANSITIONS, type SubmissionStatus } from "./status";

export async function setSubmissionStatus(id: string, to: SubmissionStatus) {
  const supabase = getAdminClient();

  // Read current state under a single round-trip and validate the transition
  // before writing. Prevents double-approval / backward moves even if the form
  // is replayed (browser back, double-click, stale tab).
  const { data: existing, error: readErr } = await supabase
    .from("submissions")
    .select("status")
    .eq("id", id)
    .single();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error("Submission not found");

  const current = existing.status as SubmissionStatus;
  if (current === to) {
    // Already there — treat as no-op so duplicate clicks don't 500.
    revalidatePath("/admin/submissions");
    return;
  }
  if (!ALLOWED_TRANSITIONS[current]?.includes(to)) {
    throw new Error(`Cannot move submission from "${current}" to "${to}"`);
  }

  const { error } = await supabase
    .from("submissions")
    .update({ status: to })
    .eq("id", id)
    .eq("status", current); // optimistic lock — fails silently if someone else moved it
  if (error) throw new Error(error.message);
  revalidatePath("/admin/submissions");
}
