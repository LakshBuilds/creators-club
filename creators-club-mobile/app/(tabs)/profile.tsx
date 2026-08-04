import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chip } from "../../components/Chip";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ProfileMenuSheet } from "../../components/ProfileMenuSheet";
import { StatCard } from "../../components/StatCard";
import {
  attachIgMediaInsights,
  fetchIgMe,
  fetchIgMediaInsights,
  fetchIgRecentMedia,
  isVideoMedia,
  startIgAuth,
  summarizeEngagement,
  type IgInsightsSummary,
  type IgRecentMedia
} from "../../lib/instagramOAuth";
import { saveSummary } from "../../lib/creatorScore";
import { igAdvancedEnabled } from "../../lib/features";
import { createLogger } from "../../lib/logger";
import { useSession } from "../../lib/session";
import { supabase } from "../../lib/supabase";
import { toUserMessage } from "../../lib/to-user-message";
import { userDisplayName } from "../../lib/userDisplayName";
import { colors, radii, shadow, spacing, typography } from "../../theme/tokens";

const log = createLogger("profile");

type CreatorRow = {
  ig_username: string | null;
  ig_user_id: string | null;
  ig_long_lived_token: string | null;
  ig_profile_picture_url: string | null;
  categories: string[] | null;
};

type ProfileRow = {
  full_name: string | null;
  city: string | null;
};

export default function ProfileScreen() {
  const { session } = useSession();
  const userId = session?.user.id;

  const [creator, setCreator] = useState<CreatorRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [insights, setInsights] = useState<IgInsightsSummary | null>(null);
  const [recentMedia, setRecentMedia] = useState<IgRecentMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<IgRecentMedia | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<Record<string, number> | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const openMediaInsights = useCallback(
    async (item: IgRecentMedia) => {
      // Insights (reach/views) need manage_insights, which isn't approved for
      // public accounts yet. For them, tapping a post just opens it in
      // Instagram instead of the (would-fail) insights sheet.
      if (!igAdvancedEnabled(creator?.ig_username)) {
        if (item.permalink) Linking.openURL(item.permalink).catch(() => {});
        return;
      }
      setSelectedMedia(item);
      setSelectedMetrics(null);
      const token = creator?.ig_long_lived_token;
      if (!token) {
        log.warn("media insights tap skipped — no token");
        return;
      }
      setSelectedLoading(true);
      log.info("media insights tap fetch start", { mediaId: item.id, isVideo: isVideoMedia(item) });
      try {
        const metrics = isVideoMedia(item) ? ["views", "reach", "likes", "comments"] : ["reach", "likes", "comments"];
        const data = await fetchIgMediaInsights(item.id, token, metrics);
        log.info("media insights tap fetch ok", { mediaId: item.id, data });
        setSelectedMetrics(data);
      } catch (e) {
        log.error("media insights tap failed", e);
      } finally {
        setSelectedLoading(false);
      }
    },
    [creator?.ig_long_lived_token, creator?.ig_username]
  );

  const closeMediaInsights = useCallback(() => {
    setSelectedMedia(null);
    setSelectedMetrics(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [{ data: c, error: cErr }, { data: p, error: pErr }] = await Promise.all([
      supabase
        .from("creators")
        .select(
          "ig_username, ig_user_id, ig_long_lived_token, ig_profile_picture_url, categories"
        )
        .eq("profile_id", userId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name, city")
        .eq("id", userId)
        .maybeSingle()
    ]);
    if (cErr) log.error("fetch creator failed", cErr);
    if (pErr) log.error("fetch profile failed", pErr);
    setCreator((c as CreatorRow | null) ?? null);
    setProfile((p as ProfileRow | null) ?? null);
  }, [userId]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const loadInsights = useCallback(async () => {
    if (!creator?.ig_long_lived_token) return;
    setInsightsLoading(true);
    try {
      const token = creator.ig_long_lived_token;
      const [me, media] = await Promise.all([
        fetchIgMe(token),
        fetchIgRecentMedia(token, 15).catch((e) => {
          log.error("media fetch failed", e);
          return [] as IgRecentMedia[];
        })
      ]);
      // Initial summary from like/comment counts; reach + views land below and we recompute.
      const initialSummary = summarizeEngagement(me, media);
      setInsights(initialSummary);
      void saveSummary(initialSummary);
      // reach/views come from manage_insights, which is test-users-only until
      // re-approval. Skip the insights fetch for public accounts — the basic
      // summary (followers, likes) is all their UI shows.
      if (igAdvancedEnabled(creator.ig_username)) {
        await attachIgMediaInsights(media, token);
      }
      setRecentMedia([...media]);
      const finalSummary = summarizeEngagement(me, media);
      setInsights(finalSummary);
      void saveSummary(finalSummary);
      if (userId && (me.followers_count != null || me.username)) {
        await supabase
          .from("creators")
          .update({
            followers_count: me.followers_count ?? null,
            ig_username: me.username ?? creator.ig_username,
            ig_name: me.name ?? null,
            ig_profile_picture_url: me.profile_picture_url ?? null
          })
          .eq("profile_id", userId);
        // Optimistically reflect the freshly fetched IG profile picture in this session.
        if (me.profile_picture_url) {
          setCreator((prev) =>
            prev ? { ...prev, ig_profile_picture_url: me.profile_picture_url ?? null } : prev
          );
        }
      }
    } catch (e) {
      log.error("insights load failed", e);
    } finally {
      setInsightsLoading(false);
    }
  }, [creator?.ig_long_lived_token, creator?.ig_username, userId]);

  useEffect(() => {
    if (creator?.ig_long_lived_token) loadInsights();
  }, [creator?.ig_long_lived_token, loadInsights]);

  async function onVerifyInstagram() {
    if (!userId) return;
    setConnecting(true);
    log.info("verify instagram start");
    try {
      const result = await startIgAuth();
      if (!result) return;
      let username = result.username;
      try {
        const me = await fetchIgMe(result.accessToken);
        username = me.username ?? username;
      } catch (e) {
        log.error("fetchIgMe failed", e);
      }
      const expiresAt = new Date(
        Date.now() + 60 * 60 * 24 * 60 * 1000
      ).toISOString();
      const { error } = await supabase.rpc("link_instagram_account", {
        p_ig_user_id: result.userId,
        p_ig_username: username ?? null,
        p_handle: username ?? null,
        p_token: result.accessToken,
        p_expires_at: expiresAt
      });
      if (error) throw error;
      await refresh();
    } catch (e) {
      log.error("verify instagram failed", e);
      Alert.alert("Instagram link failed", toUserMessage(e));
    } finally {
      setConnecting(false);
    }
  }

  const displayName =
    profile?.full_name?.trim() || userDisplayName(session?.user);
  const savedHandle = creator?.ig_username ?? null;
  const igAdvanced = igAdvancedEnabled(savedHandle);
  const niches = creator?.categories ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <LinearGradient
          colors={[colors.gradient.heroStart, colors.gradient.heroEnd]}
          style={styles.headerGradient}
        >
          <View style={styles.headerActions}>
            <HeaderBtn icon="share-social-outline" />
            <HeaderBtn
              icon="menu-outline"
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Open profile menu"
            />
          </View>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {creator?.ig_profile_picture_url ? (
                <Image
                  source={{ uri: creator.ig_profile_picture_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person" size={44} color={colors.brand.primary} />
              )}
            </View>
          </View>
          <Text style={styles.name}>{titleCase(displayName)}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={colors.text.onDarkMuted} />
            <Text style={styles.location}>{profile?.city ?? "Add your city"}</Text>
          </View>
        </LinearGradient>

        <View style={styles.statsCard}>
          <StatCard
            label="Followers"
            value={formatCount(insights?.followers) ?? (savedHandle ? "—" : "0")}
          />
          <Divider />
          {/* Engagement % and Avg Reach come from manage_insights — hidden for
              public accounts until that permission is re-approved. */}
          {igAdvanced ? (
            <>
              <StatCard
                label="Engagement %"
                value={
                  insights?.engagementPct != null
                    ? `${insights.engagementPct.toFixed(1)}%`
                    : "—"
                }
              />
              <Divider />
              <StatCard label="Avg Reach" value={formatCount(insights?.avgReach) ?? "—"} />
              <Divider />
            </>
          ) : null}
          <StatCard label="Avg Likes" value={formatCount(insights?.avgLikes) ?? "—"} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Instagram profile</Text>
          {loading ? (
            <ActivityIndicator color={colors.brand.primary} />
          ) : (
            <>
              <View style={styles.currentRow}>
                <Ionicons
                  name="logo-instagram"
                  size={18}
                  color={colors.brand.primary}
                />
                <Text style={styles.currentText}>
                  {savedHandle ? `@${savedHandle}` : "Not linked yet"}
                </Text>
                {insightsLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                    style={{ marginLeft: spacing.sm }}
                  />
                ) : null}
              </View>
              {savedHandle ? null : (
                <PrimaryButton
                  label="Verify with Instagram"
                  onPress={onVerifyInstagram}
                  loading={connecting}
                />
              )}
              <Text style={styles.hint}>
                {savedHandle
                  ? igAdvanced
                    ? "Connected via Meta — followers, reach and engagement refresh automatically."
                    : "Connected via Meta — your follower count refreshes automatically."
                  : igAdvanced
                    ? "Login once — we fetch followers, reach, and engagement directly from Meta."
                    : "Login once — we fetch your Instagram profile directly from Meta."}
              </Text>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your niches</Text>
          {niches.length === 0 ? (
            <Text style={styles.hint}>No categories picked yet.</Text>
          ) : (
            <View style={styles.chipRow}>
              {niches.map((n) => (
                <Chip key={n} label={n} />
              ))}
            </View>
          )}
        </View>

        {savedHandle ? (
          <View style={styles.section}>
            <View style={styles.gridHeader}>
              <Text style={styles.sectionLabel}>Recent posts</Text>
              {insightsLoading ? (
                <ActivityIndicator size="small" color={colors.brand.primary} />
              ) : null}
            </View>
            {recentMedia.length === 0 ? (
              <Text style={styles.hint}>
                {insightsLoading ? "Loading recent posts…" : "No posts found yet."}
              </Text>
            ) : (
              <MediaGrid items={recentMedia} onSelect={openMediaInsights} />
            )}
          </View>
        ) : null}

      </ScrollView>

      <ProfileMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />

      <Modal
        visible={selectedMedia !== null}
        transparent
        animationType="slide"
        onRequestClose={closeMediaInsights}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeMediaInsights}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            {selectedMedia ? (
              <>
                {(selectedMedia.thumbnail_url || selectedMedia.media_url) ? (
                  <Image
                    source={{
                      uri: selectedMedia.thumbnail_url ?? selectedMedia.media_url
                    }}
                    style={styles.modalImage}
                  />
                ) : null}
                <Text style={styles.modalTitle}>
                  {isVideoMedia(selectedMedia) ? "Reel insights" : "Post insights"}
                </Text>
                {selectedLoading ? (
                  <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: spacing.lg }} />
                ) : (
                  <View style={styles.modalMetrics}>
                    {isVideoMedia(selectedMedia) ? (
                      <ModalMetric
                        label="Views"
                        value={formatCount(selectedMetrics?.views ?? selectedMedia.view_count ?? null)}
                      />
                    ) : null}
                    <ModalMetric
                      label="Reach"
                      value={formatCount(selectedMetrics?.reach ?? selectedMedia.reach ?? null)}
                    />
                    <ModalMetric
                      label="Likes"
                      value={formatCount(selectedMetrics?.likes ?? selectedMedia.like_count ?? null)}
                    />
                    <ModalMetric
                      label="Comments"
                      value={formatCount(selectedMetrics?.comments ?? selectedMedia.comments_count ?? null)}
                    />
                  </View>
                )}
                {selectedMedia.permalink ? (
                  <PrimaryButton
                    label="Open in Instagram"
                    onPress={() => {
                      const url = selectedMedia.permalink!;
                      closeMediaInsights();
                      Linking.openURL(url).catch(() => {});
                    }}
                  />
                ) : null}
                <Pressable onPress={closeMediaInsights} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function ModalMetric({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.modalMetric}>
      <Text style={styles.modalMetricValue}>{value ?? "—"}</Text>
      <Text style={styles.modalMetricLabel}>{label}</Text>
    </View>
  );
}

function MediaGrid({
  items,
  onSelect
}: {
  items: IgRecentMedia[];
  onSelect: (item: IgRecentMedia) => void;
}) {
  // Two paddings: profile section (spacing.lg * 2) and section content (spacing.lg * 2).
  const screenWidth = Dimensions.get("window").width;
  const horizontalChrome = spacing.lg * 4;
  const gap = spacing.xs;
  const tileSize = Math.floor((screenWidth - horizontalChrome - gap * 2) / 3);

  return (
    <View style={[styles.gridWrap, { gap }]}>
      {items.map((item) => {
        const thumb = item.thumbnail_url ?? item.media_url ?? null;
        const isVideo = isVideoMedia(item);
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item)}
            style={[styles.tile, { width: tileSize, height: tileSize }]}
            accessibilityRole="button"
            accessibilityLabel={isVideo ? "Open reel" : "Open post"}
          >
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.tileImage} />
            ) : (
              <View style={[styles.tileImage, styles.tilePlaceholder]}>
                <Ionicons
                  name="image-outline"
                  size={28}
                  color={colors.text.muted}
                />
              </View>
            )}
            {isVideo ? (
              <View style={styles.tileTopRight}>
                <Ionicons name="play" size={12} color={colors.text.onDark} />
              </View>
            ) : null}
            <View style={styles.tileBottom}>
              {isVideo && item.view_count != null ? (
                <View style={styles.tileMetric}>
                  <Ionicons name="eye" size={11} color={colors.text.onDark} />
                  <Text style={styles.tileMetricText}>{formatCount(item.view_count)}</Text>
                </View>
              ) : null}
              {item.like_count != null ? (
                <View style={styles.tileMetric}>
                  <Ionicons name="heart" size={11} color={colors.text.onDark} />
                  <Text style={styles.tileMetricText}>{formatCount(item.like_count)}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function HeaderBtn({
  icon,
  onPress,
  accessibilityLabel
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.headerBtn}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={20} color={colors.text.onDark} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function titleCase(s: string) {
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function formatCount(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(0);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.app },
  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl + spacing.xxl,
    alignItems: "center",
    paddingHorizontal: spacing.lg
  },
  headerActions: {
    position: "absolute",
    top: spacing.md,
    right: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarWrap: { marginTop: spacing.xl },
  avatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.text.onDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.35)",
    overflow: "hidden"
  },
  avatarImage: {
    width: 124,
    height: 124,
    borderRadius: 62,
    resizeMode: "cover"
  },
  name: {
    ...typography.h1,
    color: colors.text.onDark,
    marginTop: spacing.lg
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  location: { ...typography.caption, color: colors.text.onDarkMuted },
  statsCard: {
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xxl,
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    ...shadow.card
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: colors.surface.border,
    marginVertical: spacing.sm
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadow.card
  },
  sectionLabel: {
    ...typography.overline,
    color: colors.text.muted,
    marginBottom: spacing.md
  },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  currentText: {
    ...typography.bodyStrong,
    color: colors.text.primary
  },
  hint: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.md
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  gridHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  tile: {
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.surface.cardAlt,
    position: "relative"
  },
  tileImage: {
    width: "100%",
    height: "100%"
  },
  tilePlaceholder: {
    alignItems: "center",
    justifyContent: "center"
  },
  tileTopRight: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center"
  },
  tileBottom: {
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 4
  },
  tileMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0,0,0,0.55)"
  },
  tileMetricText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.onDark,
    fontWeight: "700"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  modalSheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: "stretch"
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface.border,
    marginBottom: spacing.md
  },
  modalImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    resizeMode: "cover"
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.md
  },
  modalMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  modalMetric: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface.cardAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "flex-start"
  },
  modalMetricValue: {
    ...typography.h2,
    color: colors.text.primary
  },
  modalMetricLabel: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.xs
  },
  modalClose: {
    marginTop: spacing.md,
    padding: spacing.md,
    alignItems: "center"
  },
  modalCloseText: {
    ...typography.bodyStrong,
    color: colors.text.muted
  }
});
