import "server-only";
import { getAdminClient } from "./admin-supabase";

const BUCKET = "trending-covers";
const UA = "facebookexternalhit/1.1";

/**
 * Download a remote image (typically the IG CDN URL we got from og:image)
 * and re-host it inside our own Supabase Storage bucket. Returns the
 * permanent public URL we can save on the trending row, so client-side
 * image loads no longer depend on Instagram's signed CDN URLs (which
 * expire roughly weekly).
 *
 * Falls back to returning the original URL if any step fails — never
 * blocks the admin from saving a row.
 */
export async function selfHostImage(
  remoteUrl: string,
  options: { keyPrefix: string }
): Promise<string> {
  if (!remoteUrl) return remoteUrl;
  try {
    const res = await fetch(remoteUrl, {
      headers: { "User-Agent": UA, Accept: "image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      console.warn("[poster-storage] download non-ok", res.status, remoteUrl.slice(0, 80));
      return remoteUrl;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = (contentType.match(/image\/(\w+)/)?.[1] ?? "jpg").replace("jpeg", "jpg");
    const path = `${options.keyPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const supabase = getAdminClient();
    const upload = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType,
      upsert: false,
      cacheControl: "31536000"
    });
    if (upload.error) {
      console.warn("[poster-storage] upload failed", upload.error.message);
      return remoteUrl;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("[poster-storage] threw — falling back to remote URL", e);
    return remoteUrl;
  }
}
