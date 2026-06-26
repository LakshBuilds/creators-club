import { API_BASE_URL } from "./apiBase";
import { createLogger } from "./logger";

const log = createLogger("storage");

const ENDPOINT = `${API_BASE_URL}/api/upload-draft`;

export type ServerProbedQuality = {
  durationSec: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
  bitrateKbps: number | null;
  isHdr: boolean;
  resolutionClass: "4K" | "2K" | "1080p" | "720p" | "SD" | null;
  container: string | null;
};

/**
 * Send a picked video to the Next.js `/api/upload-draft` endpoint, which uses
 * a Google service account to upload it into the brand-shared Drive folder.
 * Returns the playable URL plus the server-side ffprobe metadata.
 */
export async function uploadVideoToStorage(opts: {
  localUri: string;
  applicationId: string;
  mimeType?: string | null;
  onProgress?: (pct: number) => void;
}): Promise<{ url: string; path: string; quality: ServerProbedQuality | null }> {
  const filename = filenameFromUri(opts.localUri);
  const mimeType = opts.mimeType ?? "video/mp4";

  // React Native FormData handles `{ uri, name, type }` natively and streams
  // the file to the server without us reading it into JS memory first.
  const form = new FormData();
  form.append("file", {
    uri: opts.localUri,
    name: filename,
    type: mimeType
  } as unknown as Blob);
  form.append("applicationId", opts.applicationId);
  form.append("filename", filename);

  opts.onProgress?.(0.2);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, { method: "POST", body: form });
  } catch (e) {
    log.error("upload network error", e);
    throw new Error(e instanceof Error ? e.message : "Network error");
  }

  opts.onProgress?.(0.95);

  if (!res.ok) {
    const text = await res.text();
    log.error("upload non-2xx", { status: res.status, body: text.slice(0, 300) });
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    id?: string;
    viewUrl?: string;
    previewUrl?: string;
    quality?: ServerProbedQuality | null;
    error?: string;
  };
  if (json.error || !json.viewUrl || !json.id) {
    throw new Error(json.error ?? "Upload returned no URL");
  }
  opts.onProgress?.(1);
  // We persist the canonical Drive viewer URL; admin embeds the preview form.
  return { url: json.viewUrl, path: json.id, quality: json.quality ?? null };
}

function filenameFromUri(uri: string): string {
  const m = uri.match(/[^/]+$/);
  return m ? m[0] : "draft.mp4";
}
