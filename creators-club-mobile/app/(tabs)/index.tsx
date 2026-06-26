import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedBackdrop } from "../../components/AnimatedBackdrop";
import { CampaignCard, CampaignCardSkeleton } from "../../components/CampaignCard";
import { CreatorScoreBadge } from "../../components/CreatorScoreBadge";
import { FadeInView } from "../../components/FadeInView";
import { GradientHero } from "../../components/GradientHero";
import { PressScale } from "../../components/PressScale";
import { QuickActionTile } from "../../components/QuickActionTile";
import { Skeleton } from "../../components/Skeleton";
import {
  TrendingAudios,
  TrendingProducts,
  TrendingReels
} from "../../components/TrendingSection";
import { useBuyhatkeSession } from "../../lib/buyhatkeSession";
import { fetchOpenCampaignsWithBrands, type CampaignWithBrand } from "../../lib/campaigns";
import {
  fetchRecentCreatorEarnings,
  formatInrCompact,
  type CreatorEarning
} from "../../lib/earnings";
import { createLogger } from "../../lib/logger";
import { useSession } from "../../lib/session";
import { colors, radii, shadow, spacing, typography } from "../../theme/tokens";

const log = createLogger("home");

export default function HomeScreen() {
  const [rows, setRows] = useState<CampaignWithBrand[]>([]);
  const [earnings, setEarnings] = useState<CreatorEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const buyhatke = useBuyhatkeSession();
  const { session } = useSession();

  const firstName = useMemo(() => {
    const meta = (session?.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    const raw = (meta.full_name ?? meta.name ?? "").trim();
    if (!raw) return "";
    return raw.split(/\s+/)[0];
  }, [session]);

  const load = useCallback(async () => {
    const [{ data, error }, { data: e, error: eErr }] = await Promise.all([
      fetchOpenCampaignsWithBrands({ limit: 6 }),
      fetchRecentCreatorEarnings(12)
    ]);
    if (error) log.error("load campaigns failed", error);
    if (eErr) log.error("load earnings failed", eErr);
    setRows(data ?? []);
    setEarnings(e ?? []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([load(), buyhatke.refresh()]);
    setRefreshing(false);
  }

  const totalWorth = rows.reduce((sum, c) => sum + (c.budget_inr ?? 0), 0);
  const openCount = rows.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AnimatedBackdrop />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.greetingCol}>
            <Text style={styles.greetingHello}>{getTimeGreeting()}</Text>
            <Text style={styles.greetingName} numberOfLines={1}>
              {firstName ? `${firstName} 👋` : "Welcome 👋"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <CreatorScoreBadge />
            <TopIcon
              icon="notifications-outline"
              onPress={() => router.push("/notifications")}
              label="Open notifications"
            />
            <TopIcon
              icon="chatbubble-ellipses-outline"
              onPress={() => router.push("/chat")}
              label="Open messages"
            />
          </View>
        </View>

        <GradientHero rounded style={styles.hero}>
          <Text style={styles.heroLabel}>Active campaign worth</Text>
          <Text style={styles.heroValue}>{formatCrore(totalWorth)}</Text>
          <Text style={styles.heroSub}>
            {openCount > 0
              ? `${openCount} open ${openCount === 1 ? "campaign" : "campaigns"} • ready to apply`
              : "New campaigns drop weekly — check back soon"}
          </Text>

          <View style={styles.quickRow}>
            <QuickActionTile
              icon="megaphone-outline"
              label="Browse campaigns"
              onPress={() => router.push("/(tabs)/campaigns")}
            />
            <QuickActionTile
              icon="chatbubbles-outline"
              label="Auto DM"
              onPress={() => router.push("/auto-dm")}
            />
            <QuickActionTile
              icon="gift-outline"
              label="Refer & earn"
              onPress={() => router.push("/refer")}
            />
          </View>
        </GradientHero>

        {earnings.length > 0 ? (
          <View style={styles.marqueeBlock}>
            <EarningsMarquee earnings={earnings} />
          </View>
        ) : null}

        <GiftCardSection />

        <TrendingReels />
        <TrendingAudios />
        <TrendingProducts />

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Paid campaigns</Text>
            <Text style={styles.sectionHint}>Real brands. Real money.</Text>
          </View>
          <PressScale
            onPress={() => router.push("/(tabs)/campaigns")}
            hitSlop={8}
            style={styles.seeAllPill}
          >
            <Text style={styles.seeAll}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.brand.primary} />
          </PressScale>
        </View>

        {loading ? (
          <View style={styles.cardList}>
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
          </View>
        ) : rows.length === 0 ? (
          <FadeInView>
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={28} color={colors.brand.primary} />
              <Text style={styles.emptyTitle}>No open campaigns</Text>
              <Text style={styles.emptyBody}>
                We post fresh ones every week. Pull down to refresh.
              </Text>
            </View>
          </FadeInView>
        ) : (
          <View style={styles.cardList}>
            {rows.map((c, i) => (
              <FadeInView key={c.id} index={i}>
                <CampaignCard
                  title={c.title}
                  brief={c.brief}
                  brand={c.brands?.name}
                  budgetInr={c.budget_inr}
                  deadline={c.deadline}
                  requiresInPass={c.budget_inr >= 5000}
                  onPress={() => router.push("/(tabs)/campaigns")}
                />
              </FadeInView>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function GiftCardSection() {
  const { status, loading, info, referralCode, joinUrl } = useBuyhatkeSession();

  if (loading && status === "unknown") {
    return (
      <View style={[styles.giftCard]}>
        <View style={styles.giftHeaderRow}>
          <Skeleton width={36} height={36} radius={radii.pill} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="80%" height={10} />
          </View>
        </View>
      </View>
    );
  }

  if (status !== "connected") {
    return (
      <PressScale
        onPress={() => router.push("/buyhatke-connect")}
        style={styles.giftCard}
      >
        <View style={styles.giftHeaderRow}>
          <View style={styles.giftIconWrap}>
            <Ionicons name="gift" size={20} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.giftTitle}>Gift card earnings</Text>
            <Text style={styles.giftSubtitle}>
              Connect Buyhatke to see points & your referral link
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
        </View>
      </PressScale>
    );
  }

  async function onCopyLink() {
    if (!joinUrl) return;
    try {
      await Clipboard.setStringAsync(joinUrl);
      Alert.alert("Copied", "Referral link copied to clipboard.");
    } catch {
      Alert.alert("Copy failed", "Try again.");
    }
  }

  async function onShareLink() {
    if (!joinUrl) return;
    try {
      await Share.share({
        message: `Join the Club 🤝 — earn rewards on every purchase: ${joinUrl}`,
        url: joinUrl
      });
    } catch {
      /* dismissed */
    }
  }

  return (
    <View style={styles.giftCard}>
      <View style={styles.giftHeaderRow}>
        <View style={styles.giftIconWrap}>
          <Ionicons name="gift" size={20} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.giftTitle}>Gift card earnings</Text>
          <Text style={styles.giftSubtitle}>From your Buyhatke account</Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <Stat label="Redeemable" value={info.redeemable} accent={colors.brand.primary} />
        <Stat label="Pending" value={info.pending} accent={colors.text.secondary} />
        <Stat label="Lifetime" value={info.lifetime} accent={colors.brand.primaryDark} />
      </View>

      <PressScale
        onPress={() => router.push("/refer")}
        style={styles.claimBtn}
      >
        <Ionicons name="gift-outline" size={18} color={colors.text.onDark} />
        <Text style={styles.claimText}>Claim rewards</Text>
      </PressScale>

      {referralCode && joinUrl ? (
        <View style={styles.joinBlock}>
          <Text style={styles.joinTitle}>Your invite link</Text>
          <View style={styles.joinLinkRow}>
            <Text style={styles.joinLinkText} numberOfLines={1} selectable>
              {joinUrl}
            </Text>
            <PressScale
              onPress={onCopyLink}
              hitSlop={8}
              style={styles.linkIconBtn}
              accessibilityLabel="Copy referral link"
            >
              <Ionicons name="copy-outline" size={18} color={colors.brand.primary} />
            </PressScale>
            <PressScale
              onPress={onShareLink}
              hitSlop={8}
              style={styles.linkIconBtn}
              accessibilityLabel="Share referral link"
            >
              <Ionicons name="share-social-outline" size={18} color={colors.brand.primary} />
            </PressScale>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EarningsMarquee({ earnings }: { earnings: CreatorEarning[] }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const items = earnings.length > 0 ? [...earnings, earnings[0]] : [];

  useEffect(() => {
    if (trackWidth === 0 || earnings.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = indexRef.current + 1;
      Animated.timing(translateX, {
        toValue: -nextIndex * trackWidth,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start(() => {
        if (nextIndex >= earnings.length) {
          indexRef.current = 0;
          translateX.setValue(0);
        } else {
          indexRef.current = nextIndex;
        }
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [trackWidth, earnings.length, translateX]);

  return (
    <View style={styles.marqueeBox}>
      <View style={styles.marqueeBadge}>
        <Text style={styles.marqueeBadgeText}>PAID OUT</Text>
      </View>
      <View
        style={{ flex: 1, overflow: "hidden" }}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View style={[styles.marqueeTrack, { transform: [{ translateX }] }]}>
          {items.map((e, i) => (
            <View
              key={`${e.display_name}-${i}`}
              style={[styles.marqueeSlide, { width: trackWidth }]}
            >
              <Ionicons name="checkmark-circle" size={14} color={colors.brand.success} />
              <Text style={styles.earningName} numberOfLines={1}>
                {e.display_name}
              </Text>
              <Text style={styles.earningAmount} numberOfLines={1}>
                +{formatInrCompact(e.amount_inr)}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

function TopIcon({
  icon,
  onPress,
  label
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
}) {
  return (
    <PressScale
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      style={styles.topIconBtn}
    >
      <Ionicons name={icon} size={18} color={colors.text.primary} />
    </PressScale>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

function formatCrore(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.app },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.md
  },
  greetingCol: { flex: 1, minWidth: 0 },
  greetingHello: {
    ...typography.caption,
    color: colors.text.secondary
  },
  greetingName: {
    ...typography.brandScript,
    fontSize: 26,
    color: colors.text.primary,
    marginTop: 2
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card
  },

  hero: { gap: spacing.lg },
  heroLabel: {
    ...typography.overline,
    color: colors.text.onDarkMuted
  },
  heroValue: {
    ...typography.display,
    color: colors.brand.accent,
    fontSize: 42,
    marginTop: -spacing.xs,
    textShadowColor: "rgba(0,0,0,0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  heroSub: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    marginTop: -spacing.sm
  },
  quickRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },

  marqueeBlock: { marginTop: spacing.lg },
  marqueeBox: {
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadow.card
  },
  marqueeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.brand.success,
    borderRadius: radii.pill,
    marginRight: spacing.md
  },
  marqueeBadgeText: {
    ...typography.overline,
    color: colors.text.onDark,
    fontSize: 10
  },
  marqueeTrack: { flexDirection: "row" },
  marqueeSlide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm
  },
  earningName: {
    ...typography.bodyStrong,
    color: colors.text.primary,
    flexShrink: 1
  },
  earningAmount: {
    ...typography.caption,
    color: colors.brand.success,
    fontWeight: "700"
  },

  sectionHeader: {
    marginTop: spacing.xxl,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.md
  },
  sectionTitle: { ...typography.h2, color: colors.text.primary },
  sectionHint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2
  },
  seeAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primarySoft
  },
  seeAll: { ...typography.bodyStrong, color: colors.brand.primary, fontSize: 13 },
  cardList: { gap: spacing.md },

  emptyState: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  emptyTitle: { ...typography.h3, color: colors.text.primary },
  emptyBody: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: "center"
  },

  giftCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...shadow.card
  },
  giftCardCenter: { alignItems: "center", justifyContent: "center", minHeight: 100 },
  giftHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  giftIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  giftTitle: { ...typography.h3, color: colors.text.primary },
  giftSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface.cardAlt,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center"
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800"
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2
  },
  claimBtn: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.md
  },
  claimText: {
    ...typography.bodyStrong,
    color: colors.text.onDark
  },
  joinBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border
  },
  joinTitle: {
    ...typography.bodyStrong,
    color: colors.text.primary,
    marginBottom: spacing.sm
  },
  joinLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface.cardAlt,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  joinLinkText: {
    flex: 1,
    ...typography.caption,
    color: colors.text.primary
  },
  linkIconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center"
  }
});
