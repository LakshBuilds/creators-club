import "server-only";

const GRAPH_BASE = "https://graph.instagram.com/v25.0";

/** Sends a private DM as a reply to a public comment. Requires instagram_business_manage_messages. */
export async function sendIgPrivateReply(opts: {
  igUserId: string;
  commentId: string;
  message: string;
  accessToken: string;
}): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${GRAPH_BASE}/${opts.igUserId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.accessToken}`
    },
    body: JSON.stringify({
      recipient: { comment_id: opts.commentId },
      message: { text: opts.message }
    })
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/** Posts a reply on a comment. Requires instagram_business_manage_comments. */
export async function replyToIgComment(opts: {
  commentId: string;
  message: string;
  accessToken: string;
}): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = new URL(`${GRAPH_BASE}/${opts.commentId}/replies`);
  url.searchParams.set("message", opts.message);
  url.searchParams.set("access_token", opts.accessToken);
  const res = await fetch(url.toString(), { method: "POST" });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

export function pickRandom<T>(items: T[]): T | null {
  if (!items || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}
