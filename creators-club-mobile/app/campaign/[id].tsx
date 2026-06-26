import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PressScale } from "../../components/PressScale";
import {
  applyToCampaign,
  fetchApplicationsByStatus,
  fetchCampaignById,
  fetchCreatorIdForProfile,
  type ApplicationStatus,
  type CampaignWithBrand
} from "../../lib/campaigns";
import { createLogger } from "../../lib/logger";
import { useSession } from "../../lib/session";
import { toUserMessage } from "../../lib/to-user-message";
import { colors, radii, shadow, spacing, typography } from "../../theme/tokens";

const log = createLogger("campaign-detail");

type Brief = CampaignWithBrand & { deliverable?: string | null };

export default function CampaignDetailScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const params = useLocalSearchParams<{ id?: string }>();
  const campaignId = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Brief | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState<ApplicationStatus | null>(null);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId || !userId) return;
    const [{ data: c }, { data: cid }] = await Promise.all([
      fetchCampaignById(campaignId),
      fetchCreatorIdForProfile(userId)
    ]);
    setCampaign((c as Brief) ?? null);
    setCreatorId(cid ?? null);
    if (cid) {
      const [pending, accepted, rejected] = await Promise.all([
        fetchApplicationsByStatus(cid, ["pending"]),
        fetchApplicationsByStatus(cid, ["accepted"]),
        fetchApplicationsByStatus(cid, ["rejected"])
      ]);
      const has = (rows: typeof pending.data, status: ApplicationStatus) =>
        rows.find((r) => r.id === campaignId) ? status : null;
      const next =
        has(accepted.data, "accepted") ??
        has(pending.data, "pending") ??
        has(rejected.data, "rejected") ??
        null;
      setAppStatus(next);
    }
    setLoading(false);
  }, [campaignId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onApply() {
    if (!creatorId || !campaign) {
      Alert.alert(
        "Connect Instagram first",
        "Brands review your reach before approving — head to Profile → Verify Instagram, then come back."
      );
      return;
    }
    if (appStatus) {
      Alert.alert("Already applied", "We'll let you know when the brand responds.");
      return;
    }
    Alert.alert(
      "Apply to this campaign?",
      `${campaign.brands?.name ?? "Brand"} · ₹${campaign.budget_inr.toLocaleString("en-IN")}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apply",
          onPress: async () => {
            setApplying(true);
            try {
              const { error } = await applyToCampaign({
                creatorId,
                campaignId
              });
              if (error) throw error;
              setAppStatus("pending");
              Alert.alert("Application sent", "We'll notify you on a decision.", [
                { text: "OK", onPress: () => router.back() }
              ]);
            } catch (e) {
              log.error("apply failed", e);
              Alert.alert("Couldn't apply", toUserMessage(e));
            } finally {
              setApplying(false);
            }
          }
        }
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Campaign",
          headerTintColor: colors.text.primary,
          headerStyle: { backgroundColor: colors.surface.app },
          headerShadowVisible: false
        }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : !campaign ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.text.muted} />
          <Text style={styles.emptyText}>Couldn't load campaign.</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.brandRow}>
              <Ionicons name="business-outline" size={14} color={colors.brand.primary} />
              <Text style={styles.brand}>{campaign.brands?.name ?? "Buyhatke"}</Text>
            </View>
            <Text style={styles.title}>{campaign.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.budgetPill}>
                <Ionicons name="cash-outline" size={14} color={colors.brand.primary} />
                <Text style={styles.budgetText}>
                  ₹{campaign.budget_inr.toLocaleString("en-IN")}
                </Text>
              </View>
              {campaign.deadline ? (
                <View style={styles.deadlinePill}>
                  <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.deadlineText}>
                    by {new Date(campaign.deadline).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </Text>
                </View>
              ) : null}
              {campaign.budget_inr >= 5000 ? (
                <View style={styles.inPassPill}>
                  <Ionicons name="ribbon-outline" size={14} color={colors.text.primary} />
                  <Text style={styles.inPassText}>inPass required</Text>
                </View>
              ) : null}
            </View>

            <Section title="About this campaign">
              <Text style={styles.body}>{campaign.brief}</Text>
            </Section>

            {campaign.deliverable ? (
              <Section title="What you'll deliver">
                <Text style={styles.body}>{campaign.deliverable}</Text>
              </Section>
            ) : null}

            <Section title="How payment works">
              <Bullet>Apply now — brand reviews your reach + niche.</Bullet>
              <Bullet>If selected, upload a draft video for review.</Bullet>
              <Bullet>Once approved, post on Instagram and paste the link.</Bullet>
              <Bullet>Payment lands within 7 working days of going live.</Bullet>
            </Section>

            <View style={{ height: 120 }} />
          </ScrollView>

          <View style={styles.applyBar}>
            {appStatus === "accepted" ? (
              <PressScale
                onPress={() => router.replace("/(tabs)/campaigns")}
                style={[styles.applyBtn, { backgroundColor: colors.brand.success }]}
              >
                <Ionicons name="trophy" size={18} color={colors.text.onDark} />
                <Text style={styles.applyLabel}>Selected — open Selected tab</Text>
              </PressScale>
            ) : appStatus === "pending" ? (
              <View style={[styles.applyBtn, { backgroundColor: colors.brand.primarySoft }]}>
                <Ionicons name="time-outline" size={18} color={colors.brand.primary} />
                <Text style={[styles.applyLabel, { color: colors.brand.primary }]}>
                  Application sent — awaiting brand
                </Text>
              </View>
            ) : appStatus === "rejected" ? (
              <View style={[styles.applyBtn, { backgroundColor: colors.feedback.dangerBg }]}>
                <Ionicons name="close-circle" size={18} color={colors.feedback.dangerFg} />
                <Text style={[styles.applyLabel, { color: colors.feedback.dangerFg }]}>
                  Brand picked someone else
                </Text>
              </View>
            ) : (
              <PressScale onPress={onApply} disabled={applying} style={styles.applyBtn}>
                {applying ? (
                  <ActivityIndicator color={colors.text.onDark} />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color={colors.text.onDark} />
                    <Text style={styles.applyLabel}>Apply to this campaign</Text>
                  </>
                )}
              </PressScale>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.app },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.text.muted },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brand: {
    ...typography.overline,
    color: colors.brand.primary
  },
  title: { ...typography.h1, color: colors.text.primary, marginTop: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  budgetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6
  },
  budgetText: { ...typography.bodyStrong, color: colors.brand.primary },
  deadlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  deadlineText: { ...typography.caption, color: colors.text.secondary },
  inPassPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6
  },
  inPassText: { ...typography.caption, color: colors.text.primary, fontWeight: "700" },
  section: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.lg,
    ...shadow.card
  },
  sectionTitle: { ...typography.h3, color: colors.text.primary, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.text.secondary, lineHeight: 22 },
  bulletRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
    alignItems: "flex-start"
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
    marginTop: 8
  },
  bulletText: { ...typography.body, color: colors.text.secondary, flex: 1, lineHeight: 22 },
  applyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.app,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    minHeight: 48
  },
  applyLabel: { ...typography.bodyStrong, color: colors.text.onDark }
});
