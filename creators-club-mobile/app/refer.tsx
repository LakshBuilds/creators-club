import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { TabSwitch } from "../components/TabSwitch";
import { BRAND_CATEGORIES, type BrandCommission, getBrandCommissions } from "../lib/buyhatke";
import { useBuyhatkeSession } from "../lib/buyhatkeSession";
import { brand, colors, radii, shadow, spacing, typography } from "../theme/tokens";

type HistoryTab = "successful" | "pending";

export default function ReferScreen() {
  const { status, loading: sessionLoading, referralCode, joinUrl } = useBuyhatkeSession();
  const [historyTab, setHistoryTab] = useState<HistoryTab>("successful");
  const [commissions, setCommissions] = useState<BrandCommission[] | null>(null);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null); // null = All
  const [boosted, setBoosted] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const searchWrapY = useRef<number>(0);

  useEffect(() => {
    if (status !== "connected") return;
    let active = true;
    setCommissionsLoading(true);
    getBrandCommissions()
      .then((res) => {
        if (!active) return;
        setCommissions(res.status === 1 ? res.data ?? [] : []);
      })
      .finally(() => active && setCommissionsLoading(false));
    return () => {
      active = false;
    };
  }, [status]);

  const shareTarget = joinUrl ?? "";
  const displayCode = referralCode ?? "";

  async function onCopy() {
    if (!displayCode) return;
    try {
      await Clipboard.setStringAsync(displayCode);
      Alert.alert("Copied", "Referral code copied to the clipboard.");
    } catch {
      Alert.alert("Copy failed", "Try again.");
    }
  }

  async function onShare() {
    if (!shareTarget) return;
    try {
      await Share.share({
        message: `Join ${brand.name} with my referral link: ${shareTarget}\n\nCreators get paid for brand reels — come create with us.`,
        title: `Refer ${brand.name}`,
        url: shareTarget
      });
    } catch {
      /* user dismissed */
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Refer & Earn",
          headerTintColor: colors.text.onDark,
          headerStyle: { backgroundColor: colors.gradient.heroEnd },
          headerTitleStyle: { ...typography.h2, color: colors.text.onDark },
          headerShadowVisible: false
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        style={styles.flex}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <LinearGradient
          colors={[colors.gradient.heroStart, colors.gradient.heroEnd]}
          style={styles.hero}
        >
          <Text style={styles.heroLine}>Earn 50% on every referral</Text>
          <View style={styles.coinRow} accessibilityLabel="Referral reward illustration">
            <Text style={styles.coin}>₹</Text>
            <Text style={styles.coin}>₹</Text>
            <Text style={styles.coin}>₹</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Invite your friends and earn <Text style={styles.bold}>50%</Text> on every successful
              paid creator payout they unlock with {brand.name}.
            </Text>
          </View>
          <View style={[styles.infoCard, styles.infoCardHighlight]}>
            <Text style={styles.infoText}>
              Top users are already earning <Text style={styles.bold}>₹55K+ per month</Text>
            </Text>
          </View>

          {sessionLoading || status === "unknown" ? (
            // Reserve roughly the same height as the connected/disconnected
            // states so the page doesn't yank up/down when bootstrap finishes.
            <View style={styles.referBlockSkeleton}>
              <ActivityIndicator color={colors.text.onDark} />
            </View>
          ) : status === "connected" && displayCode ? (
            <LinearGradient
              colors={[colors.gradient.heroStart, colors.brand.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.referBlock}
            >
              <View style={styles.referBlockTitleRow}>
                <Ionicons name="people" size={18} color={colors.text.onDark} />
                <Text style={styles.referBlockTitle}>Invite your friends</Text>
              </View>
              <View style={styles.codeRow}>
                <View style={styles.codePill}>
                  <Text style={styles.codeText} selectable>
                    {displayCode}
                  </Text>
                  <Pressable
                    onPress={onCopy}
                    style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.75 }]}
                    accessibilityLabel="Copy referral code"
                  >
                    <Ionicons name="copy-outline" size={20} color={colors.text.primary} />
                  </Pressable>
                </View>
                <Pressable
                  onPress={onShare}
                  style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.9 }]}
                  accessibilityLabel="Share referral code"
                >
                  <Ionicons name="share-social" size={22} color={colors.text.onDark} />
                </Pressable>
              </View>
              {joinUrl ? (
                <Text style={styles.referLinkText} numberOfLines={1} selectable>
                  {joinUrl}
                </Text>
              ) : null}
              {joinUrl ? (
                <View style={styles.qrCard}>
                  <View style={styles.qrFrame}>
                    <QRCode
                      value={joinUrl}
                      size={180}
                      color={colors.text.primary}
                      backgroundColor={colors.text.onDark}
                    />
                  </View>
                  <Text style={styles.qrCaption}>
                    Scan to open the app & join with your link
                  </Text>
                </View>
              ) : null}
            </LinearGradient>
          ) : (
            <Pressable
              onPress={() => router.push("/buyhatke-connect")}
              style={({ pressed }) => [styles.connectCard, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="link" size={20} color={colors.brand.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.connectTitle}>Connect Buyhatke to get your link</Text>
                <Text style={styles.connectHint}>
                  Sign in with email to fetch your referral link & rewards balance.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </Pressable>
          )}

          {status === "connected" ? (
            <View style={styles.commissionSection}>
              <View style={styles.commissionHeader}>
                <Text style={styles.commissionTitle}>Brand commissions</Text>
                <Text style={styles.commissionSubtitle}>
                  When friends shop, you get the reward and they get the discount.
                </Text>
              </View>

              <View
                style={styles.searchWrap}
                onLayout={(e) => {
                  searchWrapY.current = e.nativeEvent.layout.y;
                }}
              >
                <Ionicons name="search" size={16} color={colors.text.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search brand"
                  placeholderTextColor={colors.text.muted}
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onFocus={() => {
                    // Scroll the search row near the top so the brand list below stays visible
                    // above the keyboard.
                    setTimeout(() => {
                      scrollRef.current?.scrollTo({
                        y: Math.max(0, searchWrapY.current - 16),
                        animated: true
                      });
                    }, 250);
                  }}
                />
                {search.length > 0 ? (
                  <Pressable onPress={() => setSearch("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {[{ id: null as number | null, name: "All" }, ...BRAND_CATEGORIES].map((cat) => {
                  const active = categoryFilter === cat.id;
                  return (
                    <Pressable
                      key={cat.name}
                      onPress={() => setCategoryFilter(cat.id)}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                    >
                      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.boostRow}>
                <Text style={styles.boostLabel}>Sort by:</Text>
                <Pressable
                  onPress={() => setBoosted(false)}
                  style={[styles.boostChip, !boosted && styles.boostChipActive]}
                >
                  <Text style={[styles.boostChipText, !boosted && styles.boostChipTextActive]}>Normal</Text>
                </Pressable>
                <Pressable
                  onPress={() => setBoosted(true)}
                  style={[styles.boostChip, boosted && styles.boostChipActive]}
                >
                  <Text style={[styles.boostChipText, boosted && styles.boostChipTextActive]}>Boosted</Text>
                </Pressable>
              </View>

              {commissionsLoading && !commissions ? (
                <View style={styles.commissionLoading}>
                  <ActivityIndicator color={colors.brand.primary} />
                </View>
              ) : (() => {
                const q = search.trim().toLowerCase();
                const filtered = (commissions ?? []).filter(
                  (c) =>
                    (categoryFilter === null || c.categories.includes(categoryFilter)) &&
                    (q === "" || c.name.toLowerCase().includes(q))
                );
                const sorted = [...filtered].sort((a, b) =>
                  (boosted ? b.yourRewardBoosted - a.yourRewardBoosted : b.yourRewardNormal - a.yourRewardNormal)
                );
                return sorted.slice(0, 100).map((c) => (
                  <View key={`${c.siteId}-${c.voucherType}`} style={styles.commissionItem}>
                    <View style={styles.commissionNameRow}>
                      {c.logo ? (
                        <Image source={{ uri: c.logo }} style={styles.commissionLogo} />
                      ) : (
                        <View style={styles.commissionLogo} />
                      )}
                      <Text style={styles.commissionBrandName} numberOfLines={1}>{c.name}</Text>
                    </View>
                    <View style={styles.commissionPctRow}>
                      <Text style={styles.commissionPctLabel}>Your reward </Text>
                      <Text style={styles.commissionPctValue}>
                        {boosted ? c.yourRewardBoosted : c.yourRewardNormal}%
                      </Text>
                      <Text style={styles.commissionPctLabel}>   ·   Friend </Text>
                      <Text style={styles.commissionPctValue}>
                        {c.platformDiscount > 0
                          ? `${c.platformDiscount}% + ${boosted ? c.friendBonusBoosted : c.friendBonusNormal}%`
                          : `${boosted ? c.friendBonusBoosted : c.friendBonusNormal}%`}
                      </Text>
                    </View>
                  </View>
                ));
              })()}
              {!commissionsLoading && (commissions ?? []).length === 0 ? (
                <Text style={styles.commissionEmpty}>No brand commissions available right now.</Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>History</Text>
              <Text style={styles.historyTotal}>Total: 0</Text>
            </View>
            <TabSwitch<HistoryTab>
              value={historyTab}
              onChange={setHistoryTab}
              options={[
                { id: "successful", label: "Successful" },
                { id: "pending", label: "Pending" }
              ]}
            />
            <View style={styles.historyInfo}>
              <Ionicons name="information-circle-outline" size={18} color={colors.text.muted} />
              <Text style={styles.historyInfoText}>
                Creators who sign up with your referral and complete their first paid submission will
                show here. Payout rules apply per campaign.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface.app },
  scroll: { flex: 1, backgroundColor: colors.surface.app },
  scrollContent: { paddingBottom: 320 },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl
  },
  heroLine: {
    ...typography.h1,
    color: colors.text.onDark,
    textAlign: "center",
    marginTop: spacing.sm
  },
  coinRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.lg
  },
  coin: {
    fontSize: 32,
    color: colors.brand.accent,
    fontWeight: "800"
  },
  body: {
    marginTop: -spacing.lg,
    backgroundColor: colors.surface.app,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  infoCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card
  },
  infoCardHighlight: {
    borderColor: colors.brand.accent
  },
  infoText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22
  },
  bold: { ...typography.bodyStrong, color: colors.text.primary },
  referBlock: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg
  },
  referBlockSkeleton: {
    minHeight: 380,
    borderRadius: radii.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gradient.heroEnd
  },
  referBlockTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  referBlockTitle: {
    ...typography.bodyStrong,
    color: colors.text.onDark
  },
  codeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  codePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.text.onDark,
    borderRadius: radii.pill,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 48
  },
  codeText: {
    ...typography.bodyStrong,
    fontSize: 17,
    letterSpacing: 1,
    color: colors.text.primary
  },
  copyBtn: {
    padding: spacing.sm,
    borderRadius: radii.pill
  },
  shareBtn: {
    width: 50,
    height: 50,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)"
  },
  historySection: { paddingBottom: spacing.lg },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  historyTitle: { ...typography.h2, color: colors.text.primary },
  historyTotal: { ...typography.caption, color: colors.text.muted },
  historyInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  historyInfoText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18
  },
  referLinkText: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    marginTop: spacing.md
  },
  connectCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary
  },
  connectTitle: {
    ...typography.bodyStrong,
    color: colors.text.primary
  },
  connectHint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2
  },
  qrCard: {
    marginTop: spacing.lg,
    alignItems: "center",
    gap: spacing.sm
  },
  qrFrame: {
    backgroundColor: colors.text.onDark,
    padding: spacing.md,
    borderRadius: radii.lg
  },
  qrCaption: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    textAlign: "center"
  },
  commissionSection: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadow.card
  },
  commissionHeader: {
    marginBottom: spacing.md
  },
  commissionTitle: {
    ...typography.h3,
    color: colors.text.primary
  },
  commissionSubtitle: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2
  },
  commissionTableHeader: {
    flexDirection: "row",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border
  },
  commissionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border
  },
  commissionCell: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    textAlign: "right"
  },
  commissionCellBrand: {
    flex: 1.4,
    textAlign: "left"
  },
  commissionCellHeader: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600"
  },
  commissionBrandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  commissionLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.border
  },
  commissionBrandName: {
    ...typography.body,
    color: colors.text.primary,
    flexShrink: 1
  },
  commissionValue: {
    ...typography.body,
    color: colors.brand.primary,
    fontWeight: "600"
  },
  commissionLoading: {
    paddingVertical: spacing.xl,
    alignItems: "center"
  },
  commissionEmpty: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: "center",
    paddingVertical: spacing.lg
  },
  commissionItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border
  },
  commissionNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  commissionPctRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
    paddingLeft: 28 + 8 // align with brand name (logo width + gap)
  },
  commissionPctLabel: {
    ...typography.caption,
    color: colors.text.muted
  },
  commissionPctValue: {
    ...typography.caption,
    color: colors.brand.primary,
    fontWeight: "700"
  },
  commissionCard: {
    backgroundColor: colors.surface.app,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  commissionCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  commissionCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border
  },
  commissionStat: {
    flex: 1,
    alignItems: "flex-start"
  },
  commissionStatLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontSize: 10,
    marginBottom: 2
  },
  commissionStatValue: {
    ...typography.body,
    color: colors.brand.primary,
    fontWeight: "700"
  },
  commissionStatDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: colors.surface.border,
    marginHorizontal: spacing.md
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface.app,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.surface.border,
    marginTop: spacing.sm
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: 0
  },
  categoryRow: {
    paddingVertical: spacing.sm,
    gap: spacing.sm
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  categoryChipActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.text.primary
  },
  categoryChipTextActive: {
    color: colors.text.onDark,
    fontWeight: "600"
  },
  boostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  boostLabel: {
    ...typography.caption,
    color: colors.text.muted,
    marginRight: spacing.xs
  },
  boostChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  boostChipActive: {
    backgroundColor: colors.brand.accent,
    borderColor: colors.brand.accent
  },
  boostChipText: {
    ...typography.caption,
    color: colors.text.primary
  },
  boostChipTextActive: {
    color: colors.text.primary,
    fontWeight: "700"
  }
});
