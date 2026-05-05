import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getAdminClient } from "@/lib/admin-supabase";
import { setSubmissionStatus } from "./actions";
import { nextActions, type SubmissionStatus } from "./status";

type Row = {
  id: string;
  video_url: string;
  notes: string | null;
  status: SubmissionStatus;
  created_at: string;
  applications: {
    pitch: string | null;
    campaigns: { title: string } | null;
    creators: { ig_username: string | null; ig_name: string | null } | null;
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
    const meta = JSON.parse(raw.slice(idx + "---META---".length)) as DraftMeta;
    return { notes, meta };
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

function fmtBitrate(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${kbps} kbps`;
}

function driveEmbedUrl(url: string): string {
  // Accept either a /file/d/{id}/view URL or a /file/d/{id}/preview URL or
  // a uc?id=... URL. Fall back to the original URL for non-Drive videos.
  const m = url.match(/\/file\/d\/([^/]+)/) ?? url.match(/[?&]id=([^&]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return url;
}

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  submitted: "bg-indigo-50 text-indigo-800",
  revision: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-indigo-100 text-indigo-800"
};

export default async function SubmissionsPage() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("submissions")
    .select(
      `id, video_url, notes, status, created_at,
       applications (
         pitch,
         campaigns ( title ),
         creators ( ig_username, ig_name )
       )`
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-indigo-950">Submissions</h1>
          <p className="mt-1 text-sm text-indigo-900/80">
            Review creator videos and move them through the pipeline.
          </p>
        </div>
        <span className="text-sm text-indigo-700/70">{rows.length} shown</span>
      </div>

      {error ? (
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardTitle>Couldn&apos;t load submissions</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="mt-6">
          <CardTitle>No submissions yet</CardTitle>
          <CardDescription>
            Creators&apos; video submissions will appear here for review.
          </CardDescription>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => {
            const creator = r.applications?.creators;
            const campaign = r.applications?.campaigns;
            const { notes, meta } = splitNotesAndMeta(r.notes);
            const q = meta?.quality;
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{campaign?.title ?? "Unknown campaign"}</CardTitle>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <CardDescription>
                      by @{creator?.ig_username ?? "unknown"}
                      {creator?.ig_name ? ` · ${creator.ig_name}` : ""} ·{" "}
                      {new Date(r.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <a
                    href={r.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-indigo-800 hover:underline"
                  >
                    Open in new tab ↗
                  </a>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[280px_1fr]">
                  {/* Drive files don't stream as raw video — embed Drive's preview iframe. */}
                  <iframe
                    src={driveEmbedUrl(r.video_url)}
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
                        <Stat
                          label="Aspect"
                          value={q.width && q.height ? (q.width / q.height < 1 ? "9:16" : q.width === q.height ? "1:1" : "Landscape") : "—"}
                        />
                        <Stat label="Duration" value={fmtDuration(q.durationSec)} />
                        <Stat label="Size" value={fmtSize(q.sizeBytes)} />
                        <Stat label="FPS" value={q.fps != null ? `${q.fps}` : "—"} />
                        <Stat label="Codec" value={q.codec ? q.codec.toUpperCase() : "—"} />
                        <Stat
                          label="Bitrate"
                          value={q.bitrateKbps != null ? fmtBitrate(q.bitrateKbps) : "—"}
                        />
                        <Stat
                          label="HDR"
                          value={q.isHdr == null ? "—" : q.isHdr ? "Yes" : "No (SDR)"}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-indigo-900/60">
                        No quality metadata — submission predates the in-app picker.
                      </p>
                    )}
                    {notes ? (
                      <p className="whitespace-pre-wrap rounded-md border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-950">
                        {notes}
                      </p>
                    ) : null}
                    <SubmissionActions id={r.id} status={r.status} />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-indigo-100 bg-indigo-50/60 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-900/60">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-indigo-950">{value}</p>
    </div>
  );
}

type ActionTone = "emerald" | "amber" | "red" | "indigo";

const ACTION_META: Record<SubmissionStatus, { label: string; tone: ActionTone }> = {
  submitted: { label: "Mark submitted", tone: "indigo" }, // not used as a target normally
  approved: { label: "Approve", tone: "emerald" },
  revision: { label: "Request revision", tone: "amber" },
  rejected: { label: "Reject", tone: "red" },
  paid: { label: "Mark paid", tone: "indigo" }
};

function SubmissionActions({ id, status }: { id: string; status: SubmissionStatus }) {
  const actions = nextActions(status);
  if (actions.length === 0) {
    return (
      <p className="pt-1 text-xs text-indigo-900/60">
        Final state — no further actions.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {actions.map((to) => (
        <StatusButton key={to} id={id} to={to} {...ACTION_META[to]} />
      ))}
    </div>
  );
}

function StatusButton({
  id,
  to,
  label,
  tone
}: {
  id: string;
  to: SubmissionStatus;
  label: string;
  tone: ActionTone;
}) {
  const toneMap: Record<ActionTone, string> = {
    emerald: "border-emerald-200 text-emerald-800 hover:bg-emerald-50",
    amber: "border-amber-200 text-amber-800 hover:bg-amber-50",
    red: "border-red-200 text-red-700 hover:bg-red-50",
    indigo: "border-indigo-200 text-indigo-800 hover:bg-indigo-50"
  };
  return (
    <form
      action={async () => {
        "use server";
        await setSubmissionStatus(id, to);
      }}
    >
      <button
        type="submit"
        className={`rounded-md border bg-white px-3 py-1.5 text-xs font-medium transition ${toneMap[tone]}`}
      >
        {label}
      </button>
    </form>
  );
}
