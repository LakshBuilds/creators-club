import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createLogger } from "../lib/logger";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";
import { colors, radii, shadow, spacing, typography } from "../theme/tokens";

const log = createLogger("wallet");

type Payout = {
  id: string;
  amount_inr: number;
  status: string;
  provider: string | null;
  provider_ref: string | null;
  created_at: string;
};

export default function WalletScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: c, error: cErr } = await supabase
        .from("creators")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();
      if (cErr) log.error("creator lookup failed", cErr);
      const cid = (c?.id as string | undefined) ?? null;
      setCreatorId(cid);
      if (cid) {
        const { data, error } = await supabase
          .from("payouts")
          .select("id, amount_inr, status, provider, provider_ref, created_at")
          .eq("creator_id", cid)
          .order("created_at", { ascending: false });
        if (error) log.error("payouts fetch failed", error);
        setPayouts((data as Payout[] | null) ?? []);
      }
      setLoading(false);
    })();
  }, [userId]);

  const paid = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount_inr, 0);
  const pending = payouts
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((s, p) => s + p.amount_inr, 0);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Wallet",
          headerTintColor: colors.brand.primary,
          headerStyle: { backgroundColor: colors.surface.app },
          headerTitleStyle: { ...typography.h2, color: colors.brand.primary },
          headerShadowVisible: false
        }}
      />
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total earned</Text>
            <Text style={styles.balanceAmount}>₹{paid.toLocaleString("en-IN")}</Text>
            <View style={styles.pendingPill}>
              <Ionicons name="time-outline" size={14} color={colors.brand.primary} />
              <Text style={styles.pendingText}>
                ₹{pending.toLocaleString("en-IN")} pending
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Recent payouts</Text>

          {loading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.lg }} />
          ) : !creatorId ? (
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={28} color={colors.text.muted} />
              <Text style={styles.emptyText}>
                Complete onboarding to start earning from campaigns.
              </Text>
            </View>
          ) : payouts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={28} color={colors.text.muted} />
              <Text style={styles.emptyText}>
                No payouts yet. Apply to campaigns and submit drafts to start earning.
              </Text>
            </View>
          ) : (
            payouts.map((p) => <PayoutRow key={p.id} payout={p} />)
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function PayoutRow({ payout }: { payout: Payout }) {
  const date = new Date(payout.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const statusColor =
    payout.status === "paid"
      ? "#15803D"
      : payout.status === "failed"
      ? colors.feedback.dangerFg
      : colors.text.muted;
  return (
    <View style={styles.payoutCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.payoutAmount}>
          ₹{payout.amount_inr.toLocaleString("en-IN")}
        </Text>
        <Text style={styles.payoutMeta}>
          {payout.provider ?? "Razorpay"} · {date}
        </Text>
      </View>
      <Text style={[styles.payoutStatus, { color: statusColor }]}>
        {payout.status.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.app },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  balanceCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.card
  },
  balanceLabel: {
    ...typography.overline,
    color: colors.text.muted
  },
  balanceAmount: {
    ...typography.display,
    color: colors.brand.primary
  },
  pendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    marginTop: spacing.sm
  },
  pendingText: {
    ...typography.caption,
    color: colors.brand.primary,
    fontWeight: "600"
  },
  sectionLabel: {
    ...typography.overline,
    color: colors.text.muted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs
  },
  empty: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.card
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: "center"
  },
  payoutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadow.card
  },
  payoutAmount: {
    ...typography.h2,
    color: colors.text.primary
  },
  payoutMeta: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.xs
  },
  payoutStatus: {
    ...typography.caption,
    fontWeight: "700",
    letterSpacing: 0.5
  }
});
