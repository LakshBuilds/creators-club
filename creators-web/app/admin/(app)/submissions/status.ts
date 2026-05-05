// Pure helpers shared by the page and server actions. No "use server" — exporting
// non-async values from a Server Actions file is a build error in Next 16.

export type SubmissionStatus =
  | "submitted"
  | "revision"
  | "approved"
  | "rejected"
  | "paid";

// Allowed transitions per current status. Terminal states (paid, rejected) have none.
// `approved` can only move forward to `paid` — never back to revision or re-approved.
export const ALLOWED_TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  submitted: ["approved", "revision", "rejected"],
  revision: ["approved", "rejected"],
  approved: ["paid"],
  rejected: [],
  paid: []
};

export function nextActions(status: SubmissionStatus): SubmissionStatus[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}
