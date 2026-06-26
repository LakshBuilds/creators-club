import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/** Shaped for list UIs; avoids `brands ( name )` embed (needs FK in PostgREST cache). */
export type CampaignWithBrand = {
  id: string;
  title: string;
  brief: string;
  budget_inr: number;
  deadline: string | null;
  status: string;
  brands: { name: string } | null;
};

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type CampaignWithApplication = CampaignWithBrand & {
  application_id: string;
  application_status: ApplicationStatus;
};

export type SubmissionWithCampaign = CampaignWithBrand & {
  submission_id: string;
  application_id: string;
  submission_status: string;
  video_url: string;
};

/**
 * Fetches open campaigns and brand names in two queries (works if campaigns→brands FK is missing
 * in the remote schema cache, which caused PGRST200 on `brands ( name )` embeds).
 */
export async function fetchOpenCampaignsWithBrands(options: { limit?: number } = {}): Promise<{
  data: CampaignWithBrand[] | null;
  error: PostgrestError | null;
}> {
  // Skipping ORDER BY created_at; some deployed DBs predate that column.
  let q = supabase
    .from("campaigns")
    .select("id, title, brief, budget_inr, deadline, status, brand_id")
    .eq("status", "open");
  if (options.limit != null) q = q.limit(options.limit);
  const { data: raw, error: e1 } = await q;
  if (e1) return { data: null, error: e1 };

  const list = raw ?? [];
  const brandIds = [...new Set(list.map((c) => c.brand_id).filter(Boolean))] as string[];
  const nameById: Record<string, string> = {};
  if (brandIds.length > 0) {
    const { data: brandRows, error: e2 } = await supabase
      .from("brands")
      .select("id, name")
      .in("id", brandIds);
    if (e2) return { data: null, error: e2 };
    for (const b of brandRows ?? []) {
      nameById[b.id] = b.name;
    }
  }

  const data: CampaignWithBrand[] = list.map((c) => ({
    id: c.id,
    title: c.title,
    brief: c.brief,
    budget_inr: c.budget_inr,
    deadline: c.deadline ?? null,
    status: c.status,
    brands: c.brand_id ? { name: nameById[c.brand_id] ?? "Brand" } : null
  }));
  return { data, error: null };
}

/** Single campaign + brand by id, for the detail page. Mirrors fetchOpenCampaignsWithBrands. */
export async function fetchCampaignById(id: string): Promise<{
  data: CampaignWithBrand | null;
  error: PostgrestError | null;
}> {
  const { data: c, error: e1 } = await supabase
    .from("campaigns")
    .select("id, title, brief, budget_inr, deadline, status, brand_id")
    .eq("id", id)
    .maybeSingle();
  if (e1) return { data: null, error: e1 };
  if (!c) return { data: null, error: null };
  let brandName: string | null = null;
  if (c.brand_id) {
    const { data: b } = await supabase
      .from("brands")
      .select("name")
      .eq("id", c.brand_id)
      .maybeSingle();
    brandName = (b as { name?: string } | null)?.name ?? "Brand";
  }
  return {
    data: {
      id: c.id,
      title: c.title,
      brief: c.brief,
      budget_inr: c.budget_inr,
      deadline: c.deadline ?? null,
      status: c.status,
      brands: brandName ? { name: brandName } : null
    },
    error: null
  };
}

/** Resolves the calling user's creator row id (applications.creator_id references this). */
export async function fetchCreatorIdForProfile(profileId: string): Promise<{
  data: string | null;
  error: PostgrestError | null;
}> {
  const { data, error } = await supabase
    .from("creators")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: (data?.id as string | undefined) ?? null, error: null };
}

async function joinCampaignsForApplications(
  apps: { id: string; campaign_id: string; status: ApplicationStatus }[]
): Promise<{ data: CampaignWithApplication[]; error: PostgrestError | null }> {
  if (apps.length === 0) return { data: [], error: null };
  const campaignIds = [...new Set(apps.map((a) => a.campaign_id))];
  const { data: camps, error } = await supabase
    .from("campaigns")
    .select("id, title, brief, budget_inr, deadline, status, brand_id")
    .in("id", campaignIds);
  if (error) return { data: [], error };
  const campsList = camps ?? [];
  const brandIds = [...new Set(campsList.map((c) => c.brand_id).filter(Boolean))] as string[];
  const nameById: Record<string, string> = {};
  if (brandIds.length > 0) {
    const { data: brandRows } = await supabase
      .from("brands")
      .select("id, name")
      .in("id", brandIds);
    for (const b of brandRows ?? []) nameById[b.id] = b.name;
  }
  const byId = new Map(campsList.map((c) => [c.id, c]));
  const data: CampaignWithApplication[] = apps.flatMap((a) => {
    const c = byId.get(a.campaign_id);
    if (!c) return [];
    return [
      {
        id: c.id,
        title: c.title,
        brief: c.brief,
        budget_inr: c.budget_inr,
        deadline: c.deadline ?? null,
        status: c.status,
        brands: c.brand_id ? { name: nameById[c.brand_id] ?? "Brand" } : null,
        application_id: a.id,
        application_status: a.status
      }
    ];
  });
  return { data, error: null };
}

export async function fetchApplicationsByStatus(
  creatorId: string,
  statuses: ApplicationStatus[]
): Promise<{ data: CampaignWithApplication[]; error: PostgrestError | null }> {
  // Don't ORDER BY created_at — some deployed DBs predate that column and 42703s.
  const { data: apps, error } = await supabase
    .from("applications")
    .select("id, campaign_id, status")
    .eq("creator_id", creatorId)
    .in("status", statuses);
  if (error) return { data: [], error };
  return joinCampaignsForApplications(
    (apps ?? []) as { id: string; campaign_id: string; status: ApplicationStatus }[]
  );
}

export async function fetchInReviewSubmissions(
  creatorId: string
): Promise<{ data: SubmissionWithCampaign[]; error: PostgrestError | null }> {
  // 'approved' included so the creator sees the post-publishing prompt for
  // submissions the brand has already greenlit. UI renders three states:
  // submitted/revision = "in review", approved+no post = "post on IG",
  // approved+post = "live".
  const { data: subs, error } = await supabase
    .from("submissions")
    .select("id, application_id, video_url, status, application:applications(campaign_id, creator_id)")
    .in("status", ["submitted", "revision", "approved"]);
  if (error) return { data: [], error };
  type SubRow = {
    id: string;
    application_id: string;
    video_url: string;
    status: string;
    application: { campaign_id: string; creator_id: string } | null;
  };
  const own = ((subs ?? []) as unknown as SubRow[]).filter(
    (s) => s.application?.creator_id === creatorId
  );
  const campaignIds = [...new Set(own.map((s) => s.application?.campaign_id).filter(Boolean) as string[])];
  if (campaignIds.length === 0) return { data: [], error: null };
  const { data: camps, error: e2 } = await supabase
    .from("campaigns")
    .select("id, title, brief, budget_inr, deadline, status, brand_id")
    .in("id", campaignIds);
  if (e2) return { data: [], error: e2 };
  const campsList = camps ?? [];
  const brandIds = [...new Set(campsList.map((c) => c.brand_id).filter(Boolean))] as string[];
  const nameById: Record<string, string> = {};
  if (brandIds.length > 0) {
    const { data: brandRows } = await supabase
      .from("brands")
      .select("id, name")
      .in("id", brandIds);
    for (const b of brandRows ?? []) nameById[b.id] = b.name;
  }
  const byId = new Map(campsList.map((c) => [c.id, c]));
  const data: SubmissionWithCampaign[] = own.flatMap((s) => {
    const c = s.application?.campaign_id ? byId.get(s.application.campaign_id) : null;
    if (!c) return [];
    return [
      {
        id: c.id,
        title: c.title,
        brief: c.brief,
        budget_inr: c.budget_inr,
        deadline: c.deadline ?? null,
        status: c.status,
        brands: c.brand_id ? { name: nameById[c.brand_id] ?? "Brand" } : null,
        submission_id: s.id,
        application_id: s.application_id,
        submission_status: s.status,
        video_url: s.video_url
      }
    ];
  });
  return { data, error: null };
}

export async function applyToCampaign(opts: {
  creatorId: string;
  campaignId: string;
  pitch?: string;
}): Promise<{ data: { id: string } | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("applications")
    .insert({
      creator_id: opts.creatorId,
      campaign_id: opts.campaignId,
      pitch: opts.pitch ?? null,
      status: "pending"
    })
    .select("id")
    .maybeSingle();
  return { data: (data as { id: string } | null) ?? null, error };
}

/** Find the accepted application for this creator+campaign, if any. The draft
 * upload flow only runs after the brand has selected the creator. */
export async function fetchAcceptedApplication(opts: {
  creatorId: string;
  campaignId: string;
}): Promise<{ data: { id: string } | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("applications")
    .select("id, status")
    .eq("creator_id", opts.creatorId)
    .eq("campaign_id", opts.campaignId)
    .in("status", ["accepted", "selected"])
    .maybeSingle();
  return { data: (data as { id: string } | null) ?? null, error };
}

export type DraftQuality = {
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  mimeType?: string | null;
  // Server-side ffprobe enrichment — only present when the upload route
  // succeeded in running ffprobe on the file.
  fps?: number | null;
  codec?: string | null;
  bitrateKbps?: number | null;
  isHdr?: boolean | null;
  resolutionClass?: "4K" | "2K" | "1080p" | "720p" | "SD" | null;
  container?: string | null;
};

/** Upsert a draft submission for review. The brand reviews the cut and either
 * approves it (status='submitted' moves to 'approved') or asks for revision.
 * Quality metadata is stashed in `notes` as a JSON tail (`---META---{...}`)
 * since the submissions table doesn't yet have dedicated columns. The admin
 * UI parses this back out to render a quality summary. */
export async function submitDraft(opts: {
  applicationId: string;
  videoUrl: string;
  notes?: string;
  quality?: DraftQuality;
  storagePath?: string;
}): Promise<{ data: { id: string } | null; error: PostgrestError | null }> {
  const meta = {
    quality: opts.quality ?? null,
    storagePath: opts.storagePath ?? null
  };
  const notesField = [opts.notes?.trim() || "", `---META---${JSON.stringify(meta)}`]
    .filter(Boolean)
    .join("\n\n");

  // submissions.status CHECK only allows submitted/revision/approved/paid —
  // 'draft' would 23514 here. Use 'submitted' for new drafts; 'revision' if a
  // brand asked for changes (existing row already in revision is updated).
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("application_id", opts.applicationId)
    .in("status", ["submitted", "revision"])
    .maybeSingle();
  if (existing && (existing as { id: string }).id) {
    const { data, error } = await supabase
      .from("submissions")
      .update({
        video_url: opts.videoUrl,
        notes: notesField,
        status: "submitted"
      })
      .eq("id", (existing as { id: string }).id)
      .select("id")
      .maybeSingle();
    return { data: (data as { id: string } | null) ?? null, error };
  }
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      application_id: opts.applicationId,
      video_url: opts.videoUrl,
      notes: notesField,
      status: "submitted"
    })
    .select("id")
    .maybeSingle();
  return { data: (data as { id: string } | null) ?? null, error };
}
