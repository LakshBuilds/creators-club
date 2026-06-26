import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type CreatorPost = {
  submission_id: string;
  ig_post_url: string;
};

const IG_URL_RE =
  /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv|reels)\/([A-Za-z0-9_-]+)\/?/i;

/** Extract the IG shortcode (BOgRfgXc...) from any IG post URL form. */
export function extractIgShortcode(url: string): string | null {
  const m = url.match(IG_URL_RE);
  return m ? m[1] : null;
}

export function isValidIgPostUrl(url: string): boolean {
  return IG_URL_RE.test(url.trim());
}

/** Insert the live IG post URL for an approved submission. Unique on submission_id. */
export async function submitIgPost(opts: {
  submissionId: string;
  applicationId: string;
  creatorId: string;
  campaignId: string;
  igPostUrl: string;
}): Promise<{ data: { id: string } | null; error: PostgrestError | null }> {
  const url = opts.igPostUrl.trim();
  const shortcode = extractIgShortcode(url);
  const { data, error } = await supabase
    .from("creator_posts")
    .insert({
      submission_id: opts.submissionId,
      application_id: opts.applicationId,
      creator_id: opts.creatorId,
      campaign_id: opts.campaignId,
      ig_post_url: url,
      ig_post_shortcode: shortcode
    })
    .select("id")
    .maybeSingle();
  return { data: (data as { id: string } | null) ?? null, error };
}

/** Bulk lookup: which of these submissions already have a published post URL? */
export async function fetchPostsForSubmissions(
  submissionIds: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (submissionIds.length === 0) return out;
  const { data } = await supabase
    .from("creator_posts")
    .select("submission_id, ig_post_url")
    .in("submission_id", submissionIds);
  for (const r of (data ?? []) as CreatorPost[]) {
    out.set(r.submission_id, r.ig_post_url);
  }
  return out;
}
