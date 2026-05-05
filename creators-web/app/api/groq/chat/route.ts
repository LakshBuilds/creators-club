import { NextResponse } from "next/server";
import { BUYHATKE_SYSTEM_PROMPT } from "@/lib/buyhatke-context";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Fast + free-tier-friendly. Llama-3 8B handles short-form copy well.
const DEFAULT_MODEL = "llama-3.1-8b-instant";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Tool-specific guidance layered on top of the global system prompt. Keeping
// the tools small and explicit avoids the model drifting into long-form essays
// when the UI expects a short list.
const TOOL_PROMPTS: Record<string, string> = {
  hook: `Tool: REEL HOOK GENERATOR.
Given the creator's topic or brand, output 5 reel hooks (first-line scroll-stoppers). Each on its own line, no numbering, ≤120 chars, conversational Indian-English. Don't introduce yourself, don't add explanations.`,

  caption: `Tool: REEL CAPTION GENERATOR.
Given the creator's reel idea, output 3 captions for Instagram. Each on its own line, no numbering, ≤180 chars. Add 4–6 relevant hashtags at the end of each caption (Indian creator economy + product niche).`,

  bio: `Tool: INSTAGRAM BIO GENERATOR.
Given the creator's niche/personality, output 3 bio variants. Each ≤150 chars, line breaks via | between phrases, max 3 emojis per bio. No hashtags.`,

  story: `Tool: STORY IDEA GENERATOR.
Given the creator's niche or campaign, output 5 Instagram Story ideas. Each one bullet, 1–2 sentences. Mention which sticker/feature to use (poll, Q&A, slider, countdown, link).`,

  content: `Tool: CONTENT IDEA GENERATOR.
Given the creator's niche, output 5 reel concepts they can shoot this week. Each idea: one line for the concept + one line "Hook: …" + one line "Why it works: …". Separate ideas with a blank line.`,

  script: `Tool: REEL SCRIPT WRITER.
Given the topic, write a 30–45 second reel script. Format strictly:
[0-3s HOOK] …
[3-15s VALUE] …
[15-30s PROOF / DEMO] …
[30-45s CTA] …
Then a final line with a 1-sentence on-screen text overlay suggestion.`,

  support: `Tool: CREATOR SUPPORT CHATBOT.
Talk to the creator like a friendly teammate they already know — not a help
desk. Always reply in plain conversational English (never Hindi or Hinglish).
Match their energy: a frustrated user gets a "Yeah, that's annoying — here's
what's happening…" before the explanation; a curious user gets a quick warm
answer. Keep replies short (2–4 sentences, under 80 words), no headings or
bullets unless they're asking for a list.

Topics you handle: payouts, video approval flow, campaign rules, referral
mechanics, Buyhatke gift cards, IG OAuth issues, auto-DM setup, score /
engagement questions, basic IG growth tips. If a question needs internal
data (their specific payout amount, approval status of a particular video,
etc.) say something natural like "I can't see that from here — tap 'Talk to
a human' and the team will pull it up for you" (vary the wording, don't
parrot the same line). Never invent rupee amounts, dates, or names. Never
share API keys, tokens, or internal URLs.

Don't open with "Sure!", "Great question!", or any AI-disclaimer ("As an
AI…"). Don't end with "Hope this helps!" — instead, end with one concrete
next step or a question that nudges the conversation forward.`
};

type RequestBody = {
  tool?: keyof typeof TOOL_PROMPTS;
  // For chatbot: full message history. For one-shot tools: a single user prompt is fine.
  messages?: ChatMessage[];
  prompt?: string;
  model?: string;
  temperature?: number;
};

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const tool = body.tool && TOOL_PROMPTS[body.tool] ? body.tool : undefined;
  const toolGuidance = tool ? TOOL_PROMPTS[tool] : "";
  const system: ChatMessage = {
    role: "system",
    content: toolGuidance
      ? `${BUYHATKE_SYSTEM_PROMPT}\n\n${toolGuidance}`
      : BUYHATKE_SYSTEM_PROMPT
  };

  // Build the message stack. Caller can either pass a single prompt OR a
  // running conversation; we always sandwich them after the system prompt.
  const messages: ChatMessage[] = [system];
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    for (const m of body.messages) {
      if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
        messages.push({ role: m.role, content: m.content });
      }
    }
  } else if (typeof body.prompt === "string" && body.prompt.trim().length > 0) {
    messages.push({ role: "user", content: body.prompt.trim() });
  } else {
    return NextResponse.json({ error: "missing_prompt" }, { status: 400 });
  }

  const model = body.model || DEFAULT_MODEL;
  const temperature = typeof body.temperature === "number" ? body.temperature : 0.7;

  let upstream: Response;
  try {
    upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: 800 })
    });
  } catch (e) {
    return NextResponse.json(
      { error: "upstream_unreachable", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json({ error: "upstream_error", status: upstream.status, body: text.slice(0, 500) }, { status: 502 });
  }

  const json = (await upstream.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = json.choices?.[0]?.message?.content?.trim() ?? "";

  return NextResponse.json({ reply, model, tool: tool ?? null });
}
