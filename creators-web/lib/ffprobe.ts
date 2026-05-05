import "server-only";
import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export type ProbedQuality = {
  durationSec: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
  bitrateKbps: number | null;
  /** True if color metadata indicates HDR10 / HLG / Dolby Vision-ish. */
  isHdr: boolean;
  /** "4K", "2K", "1080p", "720p", "SD" — based on height. */
  resolutionClass: "4K" | "2K" | "1080p" | "720p" | "SD" | null;
  /** Container hint, e.g. "mov", "mp4", "matroska,webm". */
  container: string | null;
};

const FFPROBE_BIN = process.env.FFPROBE_BIN ?? "ffprobe";

type FfprobeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  bit_rate?: string;
  color_transfer?: string;
  color_primaries?: string;
  color_space?: string;
};
type FfprobeOutput = {
  streams?: FfprobeStream[];
  format?: { duration?: string; bit_rate?: string; format_name?: string };
};

function parseFps(rate: string | undefined): number | null {
  if (!rate) return null;
  const [num, den] = rate.split("/").map(Number);
  if (!num || !den) return null;
  const v = num / den;
  return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
}

function classifyResolution(
  width: number | null,
  height: number | null
): ProbedQuality["resolutionClass"] {
  // Convention: "1080p" = 1080 px on the SHORT side. Works for both
  // landscape (1920×1080) and vertical reels (1080×1920).
  if (!width || !height) return null;
  const short = Math.min(width, height);
  if (short >= 2160) return "4K";
  if (short >= 1440) return "2K";
  if (short >= 1080) return "1080p";
  if (short >= 720) return "720p";
  return "SD";
}

function isHdrFromStream(s: FfprobeStream): boolean {
  const transfer = (s.color_transfer ?? "").toLowerCase();
  const primaries = (s.color_primaries ?? "").toLowerCase();
  if (/smpte2084|arib-std-b67|bt2020-10|bt2020-12/.test(transfer)) return true;
  if (/bt2020/.test(primaries)) return true;
  return false;
}

function runFfprobe(path: string): Promise<FfprobeOutput> {
  return new Promise((resolve, reject) => {
    const args = [
      "-v", "error",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      path
    ];
    const proc = spawn(FFPROBE_BIN, args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (e) => reject(new Error(`ffprobe spawn failed: ${e.message}`)));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exit ${code}: ${stderr.trim() || "(no stderr)"}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as FfprobeOutput);
      } catch (e) {
        reject(new Error(`ffprobe JSON parse failed: ${e instanceof Error ? e.message : String(e)}`));
      }
    });
  });
}

export async function probeVideoBytes(bytes: Uint8Array, ext = "mp4"): Promise<ProbedQuality | null> {
  const tmpPath = join(tmpdir(), `probe-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  await writeFile(tmpPath, bytes);
  try {
    const out = await runFfprobe(tmpPath);
    const video = (out.streams ?? []).find((s) => s.codec_type === "video");
    if (!video) return null;
    const width = video.width ?? null;
    const height = video.height ?? null;
    const fps = parseFps(video.r_frame_rate ?? video.avg_frame_rate);
    const codec = video.codec_name ?? null;
    const formatBit = out.format?.bit_rate ? Number(out.format.bit_rate) : null;
    const streamBit = video.bit_rate ? Number(video.bit_rate) : null;
    const bitrateKbps = formatBit
      ? Math.round(formatBit / 1000)
      : streamBit
        ? Math.round(streamBit / 1000)
        : null;
    const durationSec = out.format?.duration ? Number(out.format.duration) : null;
    return {
      durationSec: Number.isFinite(durationSec) && durationSec ? durationSec : null,
      width,
      height,
      fps,
      codec,
      bitrateKbps,
      isHdr: isHdrFromStream(video),
      resolutionClass: classifyResolution(width, height),
      container: out.format?.format_name ?? null
    };
  } finally {
    await unlink(tmpPath).catch(() => undefined);
  }
}
