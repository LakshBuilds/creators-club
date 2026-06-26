import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedBackdrop } from "../../components/AnimatedBackdrop";
import { CampaignCard } from "../../components/CampaignCard";
import { EmptyState } from "../../components/EmptyState";
import { TabSwitch } from "../../components/TabSwitch";
import {
  fetchApplicationsByStatus,
  fetchCreatorIdForProfile,
  fetchInReviewSubmissions,
  fetchOpenCampaignsWithBrands,
  type CampaignWithApplication,
  type CampaignWithBrand,
  type SubmissionWithCampaign
} from "../../lib/campaigns";
import {
  fetchPostsForSubmissions,
  isValidIgPostUrl,
  submitIgPost
} from "../../lib/posts";
import { createLogger } from "../../lib/logger";
import { useSession } from "../../lib/session";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const log = createLogger("campaigns");

type Tab = "explore" | "applied" | "selected";

const OPTIONS: { id: Tab; label: string }[] = [
  { id: "explore", label: "Explore" },
  { id: "applied", label: "Applied" },
  { id: "selected", label: "Selected" }
];

export default function CampaignsScreen() {
  const { session } = useSession();
  const userId = session?.user.id;

  const [tab, setTab] = useState<Tab>("explore");
  const [creatorId, setCreatorId] = useState<string | null>(null);

  const [open, setOpen] = useState<CampaignWithBrand[]>([]);
  const [applied, setApplied] = useState<CampaignWithApplication[]>([]);
  const [selected, setSelected] = useState<CampaignWithApplication[]>([]);
  const [inReview, setInReview] = useState<SubmissionWithCampaign[]>([]);
  // submission_id → live IG post url, populated alongside inReview
  const [postBySubmission, setPostBySubmission] = useState<Map<string, string>>(new Map());
  // submission_id → in-progress IG URL the creator is typing
  const [postDraftBySubmission, setPostDraftBySubmission] = useState<Record<string, string>>({});
  const [postSubmittingId, setPostSubmittingId] = useState<string | null>(null);
  // Per-campaign current application status — drives the badge + tap behaviour
  // on the Explore tab so admin accept/reject is reflected immediately.
  const [statusById, setStatusById] = useState<Map<string, "pending" | "accepted" | "rejected">>(
    new Map()
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    const [{ data: openData, error: openErr }, { data: cid, error: cidErr }] =
      await Promise.all([
        fetchOpenCampaignsWithBrands(),
        fetchCreatorIdForProfile(userId)
      ]);
    if (openErr) log.error("load open campaigns failed", openErr);
    if (cidErr) log.error("load creator id failed", cidErr);
    setOpen(openData ?? []);
    setCreatorId(cid ?? null);

    if (cid) {
      const [pendingApps, acceptedApps, rejectedApps, submissions] = await Promise.all([
        fetchApplicationsByStatus(cid, ["pending"]),
        fetchApplicationsByStatus(cid, ["accepted"]),
        fetchApplicationsByStatus(cid, ["rejected"]),
        fetchInReviewSubmissions(cid)
      ]);
      if (pendingApps.error) log.error("load applied failed", pendingApps.error);
      if (acceptedApps.error) log.error("load selected failed", acceptedApps.error);
      if (rejectedApps.error) log.error("load rejected failed", rejectedApps.error);
      if (submissions.error) log.error("load submissions failed", submissions.error);
      // Applied tab now lists pending + rejected so the creator sees outcomes
      // (with a red "Not selected" badge for rejected).
      setApplied([...pendingApps.data, ...rejectedApps.data]);
      setSelected(acceptedApps.data);
      setInReview(submissions.data);
      const submissionIds = submissions.data.map((s) => s.submission_id);
      setPostBySubmission(await fetchPostsForSubmissions(submissionIds));
      const next = new Map<string, "pending" | "accepted" | "rejected">();
      for (const a of rejectedApps.data) next.set(a.id, "rejected");
      for (const a of pendingApps.data) next.set(a.id, "pending");
      // Accepted wins over pending/rejected if multiple exist (defensive).
      for (const a of acceptedApps.data) next.set(a.id, "accepted");
      setStatusById(next);
    }
  }, [userId]);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  // Refresh whenever the Campaigns tab regains focus so admin accept/reject
  // changes that happened while the screen was backgrounded show up instantly.
  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AnimatedBackdrop density="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
      <View style={styles.header}>
        <Text style={styles.title}>Campaigns</Text>
      </View>

      <TabSwitch value={tab} onChange={setTab} options={OPTIONS} />

      <View style={styles.helperBar}>
        <Text style={styles.helperText}>{helperFor(tab)}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : tab === "explore" ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={open}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <EmptyState
              icon="megaphone-outline"
              title="No open campaigns yet"
              message="New briefs will land here. Pull to refresh in a bit."
            />
          }
          renderItem={({ item }) => {
            const status = statusById.get(item.id);
            return (
              <View>
                <CampaignCard
                  title={item.title}
                  brief={item.brief}
                  brand={item.brands?.name}
                  budgetInr={item.budget_inr}
                  deadline={item.deadline}
                  requiresInPass={item.budget_inr >= 5000}
                  onPress={() => {
                    if (status === "accepted") setTab("selected");
                    else if (status === "pending") setTab("applied");
                    else if (status === "rejected") {
                      Alert.alert(
                        "Brand passed on this one",
                        "They went with another creator for this campaign. Try another from Explore."
                      );
                    } else {
                      // No application yet — open the detail page; user reviews
                      // brief + budget + deliverable before tapping Apply.
                      router.push({
                        pathname: "/campaign/[id]",
                        params: { id: item.id }
                      });
                    }
                  }}
                />
                {status === "accepted" ? (
                  <View style={[styles.statusBadge, styles.statusBadgeAccepted]}>
                    <Ionicons name="trophy" size={14} color={colors.text.onDark} />
                    <Text style={[styles.statusBadgeText, { color: colors.text.onDark }]}>
                      Selected
                    </Text>
                  </View>
                ) : status === "pending" ? (
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.brand.primary} />
                    <Text style={styles.statusBadgeText}>Applied</Text>
                  </View>
                ) : status === "rejected" ? (
                  <View style={[styles.statusBadge, styles.statusBadgeRejected]}>
                    <Ionicons name="close-circle" size={14} color={colors.feedback.dangerFg} />
                    <Text style={[styles.statusBadgeText, { color: colors.feedback.dangerFg }]}>
                      Not selected
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      ) : tab === "applied" ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={applied}
          keyExtractor={(c) => c.application_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <EmptyState
              icon="hourglass-outline"
              title="No applications yet"
              message="Apply from the Explore tab and they'll show up here."
            />
          }
          renderItem={({ item }) => {
            const isRejected = item.application_status === "rejected";
            return (
              <View>
                <CampaignCard
                  title={item.title}
                  brief={item.brief}
                  brand={item.brands?.name}
                  budgetInr={item.budget_inr}
                  deadline={item.deadline}
                  requiresInPass={item.budget_inr >= 5000}
                />
                {isRejected ? (
                  <View style={[styles.statusBadge, styles.statusBadgeRejected]}>
                    <Ionicons name="close-circle" size={14} color={colors.feedback.dangerFg} />
                    <Text style={[styles.statusBadgeText, { color: colors.feedback.dangerFg }]}>
                      Not selected
                    </Text>
                  </View>
                ) : (
                  <View style={styles.statusBadge}>
                    <Ionicons name="time-outline" size={14} color={colors.brand.primary} />
                    <Text style={styles.statusBadgeText}>Awaiting brand response</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      ) : (
        // Selected tab — combines accepted applications with their submission
        // state. Cards reflect: no draft yet (Upload draft CTA) / draft in
        // review / draft approved + IG URL form / posted live.
        <FlatList
          contentContainerStyle={styles.list}
          data={selected}
          keyExtractor={(c) => c.application_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          ListEmptyComponent={
            <EmptyState
              icon="trophy-outline"
              title="Nothing selected yet"
              message="Once a brand picks you, it'll appear here so you can start creating."
            />
          }
          renderItem={({ item }) => {
            const sub = inReview.find((s) => s.application_id === item.application_id) ?? null;
            const liveUrl = sub ? postBySubmission.get(sub.submission_id) : undefined;
            const subStatus = sub?.submission_status;
            const isApprovedNoPost = subStatus === "approved" && !liveUrl;
            const isLive = subStatus === "approved" && !!liveUrl;

            return (
              <View>
                <CampaignCard
                  title={item.title}
                  brief={item.brief}
                  brand={item.brands?.name}
                  budgetInr={item.budget_inr}
                  deadline={item.deadline}
                  requiresInPass={item.budget_inr >= 5000}
                />

                {/* Status badge — top-right of the card */}
                {isLive ? (
                  <View style={[styles.statusBadge, styles.statusBadgeLive]}>
                    <Ionicons name="radio" size={14} color={colors.text.onDark} />
                    <Text style={[styles.statusBadgeText, { color: colors.text.onDark }]}>Live</Text>
                  </View>
                ) : isApprovedNoPost ? (
                  <View style={[styles.statusBadge, styles.statusBadgeApproved]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.text.onDark} />
                    <Text style={[styles.statusBadgeText, { color: colors.text.onDark }]}>Approved</Text>
                  </View>
                ) : sub ? (
                  <View style={styles.statusBadge}>
                    <Ionicons name="eye-outline" size={14} color={colors.brand.primary} />
                    <Text style={styles.statusBadgeText}>
                      {subStatus === "revision" ? "Revision requested" : "In review"}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusBadgeAccepted]}>
                    <Ionicons name="trophy" size={14} color={colors.text.onDark} />
                    <Text style={[styles.statusBadgeText, { color: colors.text.onDark }]}>Selected</Text>
                  </View>
                )}

                {/* Below-card area: action depends on submission state */}
                {!sub ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/submit-draft",
                        params: { campaignId: item.id, campaignTitle: item.title }
                      })
                    }
                    style={({ pressed }) => [styles.draftCta, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color={colors.text.onDark} />
                    <Text style={styles.draftCtaLabel}>Upload draft</Text>
                  </Pressable>
                ) : subStatus === "revision" ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/submit-draft",
                        params: { campaignId: item.id, campaignTitle: item.title }
                      })
                    }
                    style={({ pressed }) => [styles.draftCta, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="refresh" size={16} color={colors.text.onDark} />
                    <Text style={styles.draftCtaLabel}>Upload revised draft</Text>
                  </Pressable>
                ) : null}

                {isApprovedNoPost && sub && creatorId ? (
                  <View style={styles.postBlock}>
                    <Text style={styles.postBlockTitle}>
                      🎉 Brand approved your draft. Now post it to Instagram and paste the link here.
                    </Text>
                    <TextInput
                      placeholder="https://instagram.com/reel/…"
                      placeholderTextColor={colors.text.muted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      style={styles.postInput}
                      value={postDraftBySubmission[sub.submission_id] ?? ""}
                      onChangeText={(t) =>
                        setPostDraftBySubmission((prev) => ({
                          ...prev,
                          [sub.submission_id]: t
                        }))
                      }
                    />
                    <Pressable
                      disabled={postSubmittingId === sub.submission_id}
                      onPress={async () => {
                        const raw = (postDraftBySubmission[sub.submission_id] ?? "").trim();
                        if (!isValidIgPostUrl(raw)) {
                          Alert.alert(
                            "Bad link",
                            "Paste the public Instagram URL of the reel/post — e.g. https://instagram.com/reel/Cabc123/."
                          );
                          return;
                        }
                        setPostSubmittingId(sub.submission_id);
                        try {
                          const { error } = await submitIgPost({
                            submissionId: sub.submission_id,
                            applicationId: sub.application_id,
                            creatorId,
                            campaignId: item.id,
                            igPostUrl: raw
                          });
                          if (error) throw error;
                          setPostBySubmission((prev) =>
                            new Map(prev).set(sub.submission_id, raw)
                          );
                          Alert.alert("Saved", "Your post is now linked to this campaign.");
                        } catch (e) {
                          log.error("submitIgPost failed", e);
                          Alert.alert(
                            "Couldn't save",
                            e instanceof Error ? e.message : "Try again."
                          );
                        } finally {
                          setPostSubmittingId(null);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.postBtn,
                        (postSubmittingId === sub.submission_id || pressed) && { opacity: 0.85 }
                      ]}
                    >
                      {postSubmittingId === sub.submission_id ? (
                        <ActivityIndicator color={colors.text.onDark} />
                      ) : (
                        <>
                          <Ionicons name="logo-instagram" size={16} color={colors.text.onDark} />
                          <Text style={styles.postBtnLabel}>Save Instagram link</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : null}

                {isLive && liveUrl ? (
                  <Pressable
                    onPress={() => Linking.openURL(liveUrl).catch(() => undefined)}
                    style={({ pressed }) => [styles.liveLinkRow, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="logo-instagram" size={14} color={colors.brand.primary} />
                    <Text style={styles.liveLinkText} numberOfLines={1}>
                      {liveUrl}
                    </Text>
                    <Ionicons name="open-outline" size={14} color={colors.brand.primary} />
                  </Pressable>
                ) : null}
              </View>
            );
          }}
        />
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function helperFor(tab: Tab): string {
  switch (tab) {
    case "explore":
      return "Tap a campaign to apply. Brands reach out once they pick you.";
    case "applied":
      return "Pending applications and brand decisions show up here.";
    case "selected":
      return "Brands picked you. Upload a draft, get approved, then post.";
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.app },
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  title: { ...typography.brandScript, fontSize: 32, color: colors.brand.primary },
  helperBar: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    backgroundColor: colors.brand.primarySoft
  },
  helperText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 16
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 120
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  statusBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand.primarySoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill
  },
  statusBadgeText: {
    ...typography.caption,
    color: colors.brand.primary,
    fontWeight: "700"
  },
  statusBadgeAccepted: {
    backgroundColor: colors.brand.success
  },
  statusBadgeRejected: {
    backgroundColor: colors.feedback.dangerBg
  },
  statusBadgeApproved: {
    backgroundColor: colors.brand.success
  },
  statusBadgeLive: {
    backgroundColor: colors.brand.primary
  },
  postBlock: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.brand.primarySoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    gap: spacing.sm
  },
  postBlockTitle: {
    ...typography.caption,
    color: colors.brand.primaryDark,
    fontWeight: "600"
  },
  postInput: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    fontSize: 13
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    minHeight: 36
  },
  postBtnLabel: {
    ...typography.caption,
    color: colors.text.onDark,
    fontWeight: "700"
  },
  liveLinkRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brand.primarySoft,
    borderRadius: radii.sm
  },
  liveLinkText: {
    ...typography.caption,
    color: colors.brand.primaryDark,
    flex: 1
  },
  draftCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.sm
  },
  draftCtaLabel: {
    ...typography.caption,
    color: colors.text.onDark,
    fontWeight: "700"
  }
});
