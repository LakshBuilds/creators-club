"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/admin-supabase";

// submissions.status CHECK only allows submitted/revision/approved/paid —
// 'rejected' would 23514. We treat the Reject button as a request for revision
// for now (the brand can also archive the campaign if they truly don't want
// any creator's work). To enable real rejection, ALTER the CHECK constraint
// to include 'rejected'.
const STATUS_MAP: Record<string, string> = {
  approve: "approved",
  revision: "revision",
  reject: "revision"
};

export async function decideDraft(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  const next = STATUS_MAP[decision];
  if (!submissionId || !next) return;
  const supabase = getAdminClient();
  let updateNotes: string | null = null;
  if (reviewNote) {
    const { data: existing } = await supabase
      .from("submissions")
      .select("notes")
      .eq("id", submissionId)
      .maybeSingle();
    const prior = (existing as { notes: string | null } | null)?.notes;
    updateNotes = prior
      ? `${prior}\n\n— Admin (${decision}): ${reviewNote}`
      : `Admin (${decision}): ${reviewNote}`;
  }
  await supabase
    .from("submissions")
    .update({
      status: next,
      ...(updateNotes ? { notes: updateNotes } : {})
    })
    .eq("id", submissionId);
  revalidatePath("/admin/drafts");
  revalidatePath("/admin/submissions");
}
