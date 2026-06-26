import { API_BASE_URL } from "./apiBase";
import { createLogger } from "./logger";

const log = createLogger("ai");

export type AiTool = "hook" | "caption" | "bio" | "story" | "content" | "script" | "support";

export type AiMessage = { role: "user" | "assistant"; content: string };

const ENDPOINT = `${API_BASE_URL}/api/groq/chat`;

/** One-shot generation. The proxy injects the Buyhatke system prompt + tool guidance. */
export async function generate(tool: AiTool, prompt: string): Promise<string> {
  return runChat({ tool, prompt });
}

/** Multi-turn chat (chatbot or follow-up Qs). The full conversation is replayed so the
 * model has memory; the proxy still pre-pends its system prompt. */
export async function chat(tool: AiTool, messages: AiMessage[]): Promise<string> {
  return runChat({ tool, messages });
}

async function runChat(payload: {
  tool: AiTool;
  prompt?: string;
  messages?: AiMessage[];
}): Promise<string> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      log.warn("non-2xx", { status: res.status, body: text.slice(0, 200) });
      throw new Error(`Helper unavailable (${res.status})`);
    }
    const json = (await res.json()) as { reply?: string; error?: string };
    if (json.error) throw new Error(json.error);
    return (json.reply ?? "").trim();
  } catch (e) {
    log.error("ai chat failed", e);
    throw e instanceof Error ? e : new Error("Helper unavailable");
  }
}
