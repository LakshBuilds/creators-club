import { Card } from "@/components/ui/Card";
import { getAdminClient } from "@/lib/admin-supabase";
import { decideDraft } from "./actions";

type DraftRow = {
  id: string;
  application_id: string;
  video_url: string;
  notes: string | null;
  status: string;
  created_at: string;
  application?: {
    creator_id: string;
    campaign_id: string;
    // applications → creators → profiles. applications.creator_id FKs to
    // creators.id (not profiles.id) so the join goes through creators first.
    creators?: {
      ig_username: string | null;
      profiles?: { full_name: string | null } | null;
    } | null;
    campaigns?: { title: string } | null;
  } | null;
};

type DraftMeta = {
  quality: {
    durationSec?: number | null;
    width?: number | null;
    height?: number | null;
    sizeBytes?: number | null;
    mimeType?: string | null;
    fps?: number | null;
    codec?: string | null;
    bitrateKbps?: number | null;
    isHdr?: boolean | null;
    resolutionClass?: "4K" | "2K" | "1080p" | "720p" | "SD" | null;
    container?: string | null;
  } | null;
  storagePath?: string | null;
};

function splitNotesAndMeta(raw: string | null): { notes: string; meta: DraftMeta | null } {
  if (!raw) return { notes: "", meta: null };
  const idx = raw.indexOf("---META---");
  if (idx === -1) return { notes: raw, meta: null };
  const notes = raw.slice(0, idx).trim();
  try {
    return { notes, meta: JSON.parse(raw.slice(idx + "---META---".length)) as DraftMeta };
  } catch {
    return { notes, meta: null };
  }
}

function fmtDuration(s: number | null | undefined): string {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}
function fmtSize(b: number | null | undefined): string {
  if (b == null) return "—";
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}
function fmtBitrate(kbps: number | null | undefined): string {
  if (kbps == null) return "—";
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${kbps} kbps`;
}
function driveEmbedUrl(url: string): string {
  const m = url.match(/\/file\/d\/([^/]+)/) ?? url.match(/[?&]id=([^&]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return url;
}

async function load(): Promise<{ rows: DraftRow[]; postUrlBySubmission: Map<string, string> }> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("submissions")
    .select(
      "id, application_id, video_url, notes, status, created_at, application:applications(creator_id, campaign_id, creators(ig_username, profiles(full_name)), campaigns(title))"
    )
    // Mobile writes status='submitted' for new drafts (the CHECK constraint
    // doesn't allow 'draft'). 'revision' = brand asked the creator to redo.
    // 'approved' included so admins can see what got approved + its IG link.
    .in("status", ["submitted", "revision", "approved"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[admin/drafts]", error);
    return { rows: [], postUrlBySubmission: new Map() };
  }
  const rows = (data ?? []) as unknown as DraftRow[];
  const submissionIds = rows.map((r) => r.id);
  const postUrlBySubmission = new Map<string, string>();
  if (submissionIds.length > 0) {
    const { data: posts } = await supabase
      .from("creator_posts")
      .select("submission_id, ig_post_url")
      .in("submission_id", submissionIds);
    for (const p of (posts ?? []) as Array<{ submission_id: string; ig_post_url: string }>) {
      postUrlBySubmission.set(p.submission_id, p.ig_post_url);
    }
  }
  return { rows, postUrlBySubmission };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-indigo-100 bg-indigo-50/60 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-900/60">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-indigo-950">{value}</p>
    </div>
  );
}

export default async function DraftsPage() {
  const { rows: items, postUrlBySubmission } = await load();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-indigo-950">Draft reviews</h1>
      <p className="mt-1 text-sm text-indigo-900/80">
        Cuts uploaded by selected creators waiting for the brand to approve or ask for a revision.
      </p>

      {items.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-indigo-900/80">No drafts to review right now.</p>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {items.map((d) => {
            const { notes, meta } = splitNotesAndMeta(d.notes);
            const q = meta?.quality;
            const livePostUrl = postUrlBySubmission.get(d.id);
            const aspect =
              q?.width && q?.height
                ? q.width / q.height < 1
                  ? "9:16"
                  : q.width === q.height
                    ? "1:1"
                    : "Landscape"
                : "—";
            return (
              <Card key={d.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-indigo-950">
                      {d.application?.campaigns?.title ?? "(no campaign)"}
                    </h3>
                    <p className="text-xs text-indigo-900/60">
                      {d.application?.creators?.profiles?.full_name ??
                        (d.application?.creators?.ig_username
                          ? `@${d.application.creators.ig_username}`
                          : "Unknown creator")}{" "}
                      · {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                      d.status === "approved"
                        ? livePostUrl
                          ? "bg-indigo-600 text-white"
                          : "bg-emerald-100 text-emerald-700"
                        : d.status === "submitted"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {d.status === "approved" && livePostUrl ? "live" : d.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[280px_1fr]">
                  <iframe
                    src={driveEmbedUrl(d.video_url)}
                    className="aspect-[9/16] w-full max-w-[280px] rounded-lg bg-black"
                    allow="autoplay"
                    allowFullScreen
                  />
                  <div className="space-y-3">
                    {q ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Stat
                          label="Resolution"
                          value={
                            q.width && q.height
                              ? `${q.width}×${q.height}${q.resolutionClass ? ` · ${q.resolutionClass}` : ""}`
                              : "—"
                          }
                        />
                        <Stat label="Aspect" value={aspect} />
                        <Stat label="Duration" value={fmtDuration(q.durationSec)} />
                        <Stat label="Size" value={fmtSize(q.sizeBytes)} />
                        <Stat label="FPS" value={q.fps != null ? `${q.fps}` : "—"} />
                        <Stat label="Codec" value={q.codec ? q.codec.toUpperCase() : "—"} />
                        <Stat label="Bitrate" value={fmtBitrate(q.bitrateKbps)} />
                        <Stat
                          label="HDR"
                          value={q.isHdr == null ? "—" : q.isHdr ? "Yes" : "No (SDR)"}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-indigo-900/60">
                        No quality metadata captured for this draft.
                      </p>
                    )}
                    <a
                      href={d.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-xs font-medium text-indigo-700 underline-offset-2 hover:underline"
                    >
                      Open in Drive ↗
                    </a>
                    {livePostUrl ? (
                      <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-xs">
                        <span className="font-semibold text-indigo-900">📸 Posted live:</span>
                        <a
                          href={livePostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-indigo-700 underline-offset-2 hover:underline"
                        >
                          {livePostUrl}
                        </a>
                      </div>
                    ) : null}
                    {notes ? (
                      <p className="whitespace-pre-wrap rounded-md border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-900/90">
                        {notes}
                      </p>
                    ) : null}
                    <form action={decideDraft} className="flex flex-wrap items-center gap-2 pt-1">
                      <input type="hidden" name="submissionId" value={d.id} />
                      <button
                        type="submit"
                        name="decision"
                        value="approve"
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Approve & publish
                      </button>
                      <button
                        type="submit"
                        name="decision"
                        value="revision"
                        className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                      >
                        Ask for revision
                      </button>
                      <button
                        type="submit"
                        name="decision"
                        value="reject"
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        Reject
                      </button>
                      <input
                        name="reviewNote"
                        placeholder="Note for creator (optional)"
                        className="w-full rounded-md border border-indigo-200 px-3 py-1.5 text-xs sm:w-72"
                      />
                    </form>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
