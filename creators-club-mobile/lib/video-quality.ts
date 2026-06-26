/**
 * Lightweight video quality summary derived from the metadata expo-image-picker
 * gives us. Without a native ffmpeg binding we cannot read fps / bitrate, so
 * we focus on the gates that actually matter for short-form vertical video:
 * minimum resolution, 9:16 aspect, max file size, sane duration.
 */

export type VideoQuality = {
  durationSec: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  mimeType: string | null;
  aspectRatio: number | null;
  /** Friendly resolution label like "1080×1920". */
  resolutionLabel: string | null;
  /** "1.0:1", "9:16", etc. Approximate. */
  aspectLabel: string | null;
  /** "12.4 MB" formatted size. */
  sizeLabel: string | null;
  /** "0:24" formatted duration. */
  durationLabel: string | null;
  /** Soft warnings — informational, do not block upload. */
  warnings: string[];
  /** Hard issues — should block upload. */
  errors: string[];
};

const MIN_HEIGHT = 720;
const MAX_SIZE_MB = 200;
const MIN_DURATION = 3;
const MAX_DURATION = 90;

export function summarize(asset: {
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  mimeType?: string | null;
}): VideoQuality {
  const durationSec = asset.duration != null ? asset.duration / 1000 : null;
  const width = asset.width ?? null;
  const height = asset.height ?? null;
  const sizeBytes = asset.fileSize ?? null;
  const mimeType = asset.mimeType ?? null;
  const aspectRatio = width && height ? width / height : null;

  const warnings: string[] = [];
  const errors: string[] = [];

  if (height != null && height < MIN_HEIGHT) {
    errors.push(`Resolution too low — need at least 720p (got ${width}×${height}).`);
  }
  if (sizeBytes != null && sizeBytes > MAX_SIZE_MB * 1024 * 1024) {
    errors.push(`File too large — keep it under ${MAX_SIZE_MB} MB.`);
  }
  if (durationSec != null && durationSec < MIN_DURATION) {
    errors.push(`Too short — minimum ${MIN_DURATION}s.`);
  }
  if (durationSec != null && durationSec > MAX_DURATION) {
    warnings.push(`Long for a reel (${Math.round(durationSec)}s) — consider trimming under ${MAX_DURATION}s.`);
  }
  if (aspectRatio != null) {
    const target = 9 / 16;
    if (Math.abs(aspectRatio - target) > 0.05) {
      warnings.push("Not 9:16 vertical — reels look best in portrait.");
    }
  }

  return {
    durationSec,
    width,
    height,
    sizeBytes,
    mimeType,
    aspectRatio,
    resolutionLabel: width && height ? `${width}×${height}` : null,
    aspectLabel: aspectRatio
      ? aspectRatio < 1
        ? "Portrait (9:16)"
        : aspectRatio > 1
          ? "Landscape"
          : "Square"
      : null,
    sizeLabel:
      sizeBytes != null
        ? sizeBytes >= 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${(sizeBytes / 1024).toFixed(0)} KB`
        : null,
    durationLabel:
      durationSec != null
        ? `${Math.floor(durationSec / 60)}:${String(Math.round(durationSec % 60)).padStart(2, "0")}`
        : null,
    warnings,
    errors
  };
}
