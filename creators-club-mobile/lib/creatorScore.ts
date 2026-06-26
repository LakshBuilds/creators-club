import * as SecureStore from "expo-secure-store";
import type { IgInsightsSummary } from "./instagramOAuth";
import { createLogger } from "./logger";

const log = createLogger("score");
const STORE_KEY = "creator_insights_v1";

export async function saveSummary(summary: IgInsightsSummary): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify({ ...summary, savedAt: Date.now() }));
  } catch (e) {
    log.warn("save failed", e);
  }
}

export async function loadSummary(): Promise<IgInsightsSummary | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IgInsightsSummary & { savedAt?: number };
    // Drop anything older than 7 days — stale cache from a previous account
    // on the same device should not bleed into a fresh sign-up.
    if (parsed.savedAt && Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
      void clearSummary();
      return null;
    }
    return parsed;
  } catch (e) {
    log.warn("load failed", e);
    return null;
  }
}

export async function clearSummary(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORE_KEY);
  } catch (e) {
    log.warn("clear failed", e);
  }
}

export type ScoreBand = {
  emoji: string;       // single fire emoji string for the badge
  emojiCount: number;  // 1–3, how many flames the badge should render
  label: string;       // short tier name shown in the breakdown sheet
};

// Buckets borrowed from creator-economy industry conventions:
// <1% is dormant, 1–3% solid, 3–6% strong, >6% top-tier.
export function bandFor(engagementPct: number | null | undefined): ScoreBand {
  if (engagementPct == null || !Number.isFinite(engagementPct)) {
    return { emoji: "✨", emojiCount: 1, label: "Connect IG to unlock" };
  }
  if (engagementPct >= 6) return { emoji: "🔥", emojiCount: 3, label: "Top-tier" };
  if (engagementPct >= 3) return { emoji: "🔥", emojiCount: 2, label: "Strong" };
  if (engagementPct >= 1) return { emoji: "🔥", emojiCount: 1, label: "Healthy" };
  return { emoji: "🌱", emojiCount: 1, label: "Growing" };
}

/** Round to 1 decimal but trim trailing .0 for the badge label. */
export function formatPct(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const r = Math.round(pct * 10) / 10;
  return Number.isInteger(r) ? `${r}%` : `${r.toFixed(1)}%`;
}
