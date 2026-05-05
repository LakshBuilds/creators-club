import { NextResponse } from "next/server";
import { probeVideoBytes } from "@/lib/ffprobe";
import { uploadVideoToDrive } from "@/lib/google-drive";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Mobile POSTs the picked video here as multipart/form-data:
 *   field "file"           — the video bytes
 *   field "applicationId"  — uuid, used in Drive description for traceability
 *   field "filename"       — original filename hint (we still sanitise)
 *
 * Returns: { id, viewUrl, previewUrl } so mobile can persist a playable URL on
 * the submission row. We do not gate this with the JWT admin session because
 * mobile creators (Supabase auth) drive it; the upload is bounded by file size
 * and the DB row write happens client-side with their RLS-allowed insert.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid multipart body", detail: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }

  const file = form.get("file");
  const applicationId = String(form.get("applicationId") ?? "");
  const filenameHint = String(form.get("filename") ?? "draft.mp4");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (!applicationId) {
    return NextResponse.json({ error: "Missing 'applicationId' field" }, { status: 400 });
  }

  const safeName = filenameHint.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const finalName = `${applicationId}-${Date.now()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = (filenameHint.match(/\.([a-z0-9]+)$/i)?.[1] ?? "mp4").toLowerCase();

  // Probe first so we return rich metadata even if Drive later complains —
  // ffprobe is cheap (sub-second on most clips). Failures are non-fatal; we
  // just send `quality: null` and let the client fall back to its own summary.
  let quality = null as Awaited<ReturnType<typeof probeVideoBytes>>;
  try {
    quality = await probeVideoBytes(bytes, ext);
  } catch (e) {
    console.warn("[upload-draft] ffprobe failed:", e instanceof Error ? e.message : e);
  }

  try {
    const uploaded = await uploadVideoToDrive({
      bytes,
      filename: finalName,
      mimeType: file.type || "video/mp4",
      description: `applicationId=${applicationId}`
    });
    return NextResponse.json({
      id: uploaded.id,
      viewUrl: uploaded.webViewLink,
      previewUrl: uploaded.previewUrl,
      quality
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed", quality },
      { status: 500 }
    );
  }
}
