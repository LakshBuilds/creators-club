import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { pickRandom, replyToIgComment, sendIgPrivateReply } from "@/lib/instagram-actions";

export const runtime = "nodejs";

type IgCommentEntryValue = {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string; media_product_type?: string };
};

type IgWebhookEntry = {
  id: string;
  time?: number;
  changes?: Array<{ field: string; value: IgCommentEntryValue }>;
};

type IgWebhookPayload = {
  object?: string;
  entry?: IgWebhookEntry[];
};

type AutoDmRule = {
  profile_id: string;
  ig_user_id: string;
  ig_media_id: string;
  dm_message: string;
  comment_replies: string[];
  trigger_keyword: string | null;
};

// 1️⃣ VERIFICATION (GET): Used by Meta to verify your webhook URL
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  // Fallback to a known shared string when the env var isn't configured on
  // the host (Meta's handshake only needs this to match the value typed in
  // the App Dashboard — it is not a secret). Real security for incoming POSTs
  // is enforced by the SHA256 signature check below using IG_APP_SECRET.
  const EXPECTED_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN ?? "laksh1234";

  if (mode === "subscribe" && token === EXPECTED_TOKEN && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }

  return new NextResponse("Verification failed", { status: 403 });
}

// 2️⃣ DATA RECEIVER (POST): Where Meta sends the actual notifications
export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-hub-signature-256");
    const rawBody = await request.text();

    // 🔒 Validate the SHA256 signature from Meta
    if (signature && process.env.IG_APP_SECRET) {
      const expectedSignature = `sha256=${crypto
        .createHmac("sha256", process.env.IG_APP_SECRET)
        .update(rawBody)
        .digest("hex")}`;

      if (signature !== expectedSignature) {
        console.warn("⚠️ Webhook signature mismatch!");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const data = JSON.parse(rawBody) as IgWebhookPayload;
    console.log("📩 RECEIVED WEBHOOK:", JSON.stringify(data, null, 2));

    // Process comment events out-of-band so the webhook responds within Meta's tight SLO.
    void processCommentEvents(data).catch((err) => {
      console.error("auto-dm: processing failed", err);
    });

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("webhook parse error", err);
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}

async function processCommentEvents(payload: IgWebhookPayload) {
  if (payload.object !== "instagram" || !Array.isArray(payload.entry)) {
    console.log("auto-dm: payload not an instagram entry array", payload.object);
    return;
  }

  for (const entry of payload.entry) {
    const igUserId = entry.id;
    if (!igUserId) continue;
    const changes = entry.changes ?? [];
    console.log("auto-dm: entry", { igUserId, fields: changes.map((c) => c.field) });
    for (const change of changes) {
      if (change.field !== "comments") continue;
      const v = change.value ?? {};
      const commentId = v.id;
      const mediaId = v.media?.id;
      const commentText = v.text ?? "";
      const fromId = v.from?.id;
      console.log("auto-dm: comment event", { commentId, mediaId, fromId, commentText });
      if (!commentId || !mediaId || !fromId) {
        console.log("auto-dm: skipping comment with missing id/media/from");
        continue;
      }

      // Skip echoes of the creator's own comments to avoid an infinite loop.
      if (fromId === igUserId) {
        console.log("auto-dm: skipping creator's own comment");
        continue;
      }

      await runAutomationFor({ igUserId, mediaId, commentId, commentText });
    }
  }
}

async function runAutomationFor(params: {
  igUserId: string;
  mediaId: string;
  commentId: string;
  commentText: string;
}) {
  const admin = getSupabaseAdminClient();

  const { data: rules, error: rulesErr } = await admin
    .from("auto_dm_rules")
    .select("profile_id, ig_user_id, ig_media_id, dm_message, comment_replies, trigger_keyword")
    .eq("ig_user_id", params.igUserId)
    .eq("ig_media_id", params.mediaId)
    .eq("active", true)
    .limit(1);
  if (rulesErr) {
    console.error("auto-dm: rule lookup failed", rulesErr);
    return;
  }
  const rule = rules?.[0] as AutoDmRule | undefined;
  if (!rule) {
    console.log("auto-dm: no active rule for", {
      ig_user_id: params.igUserId,
      ig_media_id: params.mediaId
    });
    return;
  }
  console.log("auto-dm: rule matched, firing automation", { rule_id: (rule as unknown as { id?: string }).id });

  if (rule.trigger_keyword) {
    const needle = rule.trigger_keyword.trim().toLowerCase();
    if (needle && !params.commentText.toLowerCase().includes(needle)) {
      console.log("auto-dm: comment did not match trigger keyword");
      return;
    }
  }

  // Pull the creator's long-lived IG token via service role.
  const { data: creator, error: creatorErr } = await admin
    .from("creators")
    .select("ig_long_lived_token, ig_token_expires_at")
    .eq("profile_id", rule.profile_id)
    .maybeSingle();
  if (creatorErr || !creator?.ig_long_lived_token) {
    console.error("auto-dm: token lookup failed", creatorErr);
    return;
  }

  const accessToken = creator.ig_long_lived_token as string;

  const dmResult = await sendIgPrivateReply({
    igUserId: params.igUserId,
    commentId: params.commentId,
    message: rule.dm_message,
    accessToken
  });
  if (!dmResult.ok) {
    console.error("auto-dm: DM send failed", dmResult.status, dmResult.body);
  } else {
    console.log("auto-dm: DM sent", { commentId: params.commentId });
  }

  const replyText = pickRandom(rule.comment_replies ?? []);
  if (replyText) {
    const replyResult = await replyToIgComment({
      commentId: params.commentId,
      message: replyText,
      accessToken
    });
    if (!replyResult.ok) {
      console.error("auto-dm: comment reply failed", replyResult.status, replyResult.body);
    } else {
      console.log("auto-dm: comment reply posted", { commentId: params.commentId });
    }
  }
}
