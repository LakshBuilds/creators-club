import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import type { IgInsightsSummary } from "../lib/instagramOAuth";
import { bandFor, clearSummary, formatPct, loadSummary } from "../lib/creatorScore";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = {
  /** Optional override; otherwise the badge reads the cached summary from SecureStore. */
  summary?: IgInsightsSummary | null;
};

export function CreatorScoreBadge({ summary: controlled }: Props = {}) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [summary, setSummary] = useState<IgInsightsSummary | null>(controlled ?? null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (controlled !== undefined) {
      setSummary(controlled);
    }
  }, [controlled]);

  useFocusEffect(
    useCallback(() => {
      if (controlled !== undefined) return;
      let alive = true;
      // Source-of-truth check: ask the DB whether the *current* signed-in
      // user has an Instagram token. If no, the SecureStore cache is from a
      // previous account on this device — wipe it and render the placeholder.
      // Without this, a fresh sign-in on the same device shows the previous
      // user's score until Profile reloads insights.
      (async () => {
        if (!userId) {
          if (alive) setSummary(null);
          return;
        }
        try {
          const { data } = await supabase
            .from("creators")
            .select("ig_long_lived_token")
            .eq("profile_id", userId)
            .maybeSingle();
          const hasIg = !!data?.ig_long_lived_token;
          if (!alive) return;
          if (!hasIg) {
            await clearSummary();
            setSummary(null);
            return;
          }
          const s = await loadSummary();
          if (alive) setSummary(s);
        } catch {
          // On a network blip we render whatever's in cache rather than
          // wiping the score for a returning user.
          const s = await loadSummary();
          if (alive) setSummary(s);
        }
      })();
      return () => {
        alive = false;
      };
    }, [controlled, userId])
  );

  const band = bandFor(summary?.engagementPct);
  const pctLabel = formatPct(summary?.engagementPct);
  const flames = "🔥".repeat(band.emojiCount);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.badge, pressed && { opacity: 0.85 }]}
        accessibilityLabel={`Creator score ${pctLabel}`}
      >
        <Text style={styles.flames}>{summary?.engagementPct != null ? flames : "✨"}</Text>
        <Text style={styles.pct}>{summary?.engagementPct != null ? pctLabel : "Score"}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>Creator score</Text>
            <Text style={styles.sheetSub}>{band.label}</Text>

            <View style={styles.bigPctRow}>
              <Text style={styles.bigFlames}>{summary?.engagementPct != null ? flames : "✨"}</Text>
              <Text style={styles.bigPct}>{pctLabel}</Text>
            </View>

            <View style={styles.statsGrid}>
              <Stat label="Followers" value={fmt(summary?.followers)} />
              <Stat label="Avg likes" value={fmt(summary?.avgLikes)} />
              <Stat label="Avg comments" value={fmt(summary?.avgComments)} />
              <Stat label="Avg reach" value={fmt(summary?.avgReach)} />
            </View>

            {summary?.engagementPct == null ? (
              <Text style={styles.help}>
                Connect Instagram from Profile to compute your score. We need at least one reel older than 48 hours.
              </Text>
            ) : (
              <Text style={styles.help}>
                This is your Engagement Rate, calculated using this formula:{"\n"}
                <Text style={styles.helpFormula}>
                  (avg reach of last 5 reels ÷ followers) × 100
                </Text>{"\n\n"}
                We only consider reels older than 48 hours, since reels usually take time to reach
                their full audience. A higher rate means your content resonates well — brands love
                to see this.
              </Text>
            )}

            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Math.round(v).toString();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.accent
  },
  flames: { fontSize: 14 },
  pct: { ...typography.caption, fontWeight: "700", color: colors.brand.primaryDark },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: colors.surface.app,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md
  },
  sheetTitle: { ...typography.h2, color: colors.text.primary },
  sheetSub: { ...typography.caption, color: colors.text.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  bigPctRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  bigFlames: { fontSize: 36 },
  bigPct: { fontSize: 36, fontWeight: "800", color: colors.brand.primaryDark },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  stat: {
    flexBasis: "47%",
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  statLabel: { ...typography.caption, color: colors.text.muted },
  statValue: { ...typography.h3, color: colors.text.primary },
  help: { ...typography.caption, color: colors.text.muted, lineHeight: 18 },
  helpFormula: { color: colors.text.primary, fontWeight: "600" },
  closeBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center"
  },
  closeLabel: { ...typography.bodyStrong, color: colors.text.onDark }
});
