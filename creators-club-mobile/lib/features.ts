/**
 * Instagram advanced-permission gate.
 *
 * As of the Aug 2026 App Review, `instagram_business_basic` and
 * `instagram_business_manage_messages` are approved (Advanced Access, work for
 * everyone), but `instagram_business_manage_insights` and
 * `instagram_business_manage_comments` were rejected and are being re-submitted.
 * Until they're approved, those two permissions only function for Instagram
 * accounts added as Testers on the Meta app — every other account gets a
 * permissions error from the Graph API.
 *
 * So we hide the insights UI (reach / views / engagement) and the
 * comment-triggered Auto-DM for public users, while keeping them fully working
 * for our test accounts so we can still use the app and record the App Review
 * screencast.
 *
 * When Meta approves the resubmission, flip `IG_ADVANCED_APPROVED` to true and
 * the gated UI turns on for everyone. (No other change needed — you can delete
 * the tester list afterwards.)
 */

// Flip to `true` the moment manage_insights + manage_comments are approved.
export const IG_ADVANCED_APPROVED = false;

// Escape hatch for a review/QA build: set EXPO_PUBLIC_IG_ADVANCED=1 to force the
// gated features on regardless of the connected account.
const ENV_OVERRIDE = process.env.EXPO_PUBLIC_IG_ADVANCED === "1";

// Instagram accounts added as Testers on the Meta app (App roles → Instagram
// Tester). These are the only accounts for which the insights/comments Graph
// calls succeed before approval. Keep in sync with the Meta dashboard.
const IG_TESTER_USERNAMES = new Set([
  "chiragonscreen",
  "hatke_automation",
  "thebigtalk_media",
  "laksh_mahajan_"
]);

function normalizeHandle(username: string | null | undefined): string {
  return (username ?? "").trim().replace(/^@/, "").toLowerCase();
}

/**
 * True when the insights + comment features may be used for the given connected
 * Instagram account: either they're approved for everyone, forced on via env,
 * or the account is one of our Meta app testers.
 */
export function igAdvancedEnabled(igUsername: string | null | undefined): boolean {
  if (IG_ADVANCED_APPROVED || ENV_OVERRIDE) return true;
  return IG_TESTER_USERNAMES.has(normalizeHandle(igUsername));
}
