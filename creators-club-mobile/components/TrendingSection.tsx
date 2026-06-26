import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { FadeInView } from "./FadeInView";
import { PressScale } from "./PressScale";
import { Skeleton } from "./Skeleton";
import {
  fetchProductCategories,
  fetchTrendingAudio,
  fetchTrendingProducts,
  fetchTrendingReels,
  type TrendingAudio,
  type TrendingProduct,
  type TrendingReel
} from "../lib/trending";
import { colors, radii, spacing, typography } from "../theme/tokens";

function SectionHeader({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.headerRow}>
      <Ionicons name={icon} size={18} color={colors.brand.primary} />
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function openUrl(url: string | null | undefined) {
  if (!url) return;
  Linking.openURL(url).catch(() => undefined);
}

export function TrendingReels() {
  const [rows, setRows] = useState<TrendingReel[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTrendingReels(12).then(({ data }) => alive && setRows(data ?? []));
    return () => {
      alive = false;
    };
  }, []);

  if (rows === null) return <ReelSkeletonRow title="Trending reels" icon="play-circle-outline" />;
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader icon="play-circle-outline" title="Trending reels" />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <FadeInView index={index}>
            <PressScale onPress={() => openUrl(item.video_url)} style={styles.reelCard}>
              {item.poster_url ? (
                <Image source={{ uri: item.poster_url }} style={styles.reelPoster} />
              ) : (
                <View style={[styles.reelPoster, styles.reelPosterFallback]}>
                  <Ionicons name="logo-instagram" size={28} color={colors.text.onDarkMuted} />
                </View>
              )}
              <View style={styles.reelOverlay}>
                <Ionicons name="play" size={26} color={colors.text.onDark} />
              </View>
              {item.caption ? (
                <Text style={styles.reelCaption} numberOfLines={2}>
                  {item.caption}
                </Text>
              ) : null}
            </PressScale>
          </FadeInView>
        )}
      />
    </View>
  );
}

export function TrendingReelsGrid({ limit = 12 }: { limit?: number } = {}) {
  const [rows, setRows] = useState<TrendingReel[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTrendingReels(limit).then(({ data }) => alive && setRows(data ?? []));
    return () => {
      alive = false;
    };
  }, [limit]);

  if (rows === null) return <ReelSkeletonRow title="More trending reels" icon="grid-outline" />;
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader icon="grid-outline" title="More trending reels" />
      <View style={styles.gridWrap}>
        {rows.map((item, index) => (
          <FadeInView key={item.id} index={index} style={{ width: "48%" }}>
            <PressScale onPress={() => openUrl(item.video_url)} style={styles.gridCell}>
              {item.poster_url ? (
                <Image source={{ uri: item.poster_url }} style={styles.gridPoster} />
              ) : (
                <View style={[styles.gridPoster, styles.reelPosterFallback]}>
                  <Ionicons name="logo-instagram" size={32} color={colors.text.onDarkMuted} />
                </View>
              )}
              <View style={styles.gridOverlay}>
                <Ionicons name="play" size={28} color={colors.text.onDark} />
              </View>
              {item.caption ? (
                <Text style={styles.gridCaption} numberOfLines={2}>
                  {item.caption}
                </Text>
              ) : null}
            </PressScale>
          </FadeInView>
        ))}
      </View>
    </View>
  );
}

export function TrendingProducts() {
  const [rows, setRows] = useState<TrendingProduct[] | null>(null);
  const [allRows, setAllRows] = useState<TrendingProduct[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchTrendingProducts({ limit: 60 }), fetchProductCategories()]).then(
      ([{ data }, cats]) => {
        if (!alive) return;
        setAllRows(data ?? []);
        setRows(data ?? []);
        setCategories(cats);
      }
    );
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const source = allRows ?? rows ?? [];
    return active ? source.filter((r) => r.category === active) : source;
  }, [active, allRows, rows]);

  if (rows === null) return <ProductSkeletonRow />;
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader icon="pricetags-outline" title="Trending products" />
      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="All" active={active === null} onPress={() => setActive(null)} />
          {categories.map((c) => (
            <Chip key={c} label={c} active={active === c} onPress={() => setActive(c)} />
          ))}
        </ScrollView>
      ) : null}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        data={filtered}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <FadeInView index={index}>
            <PressScale onPress={() => openUrl(item.url)} style={styles.productCard}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, styles.reelPosterFallback]} />
              )}
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              {item.category ? (
                <Text style={styles.productCategory}>{item.category}</Text>
              ) : null}
            </PressScale>
          </FadeInView>
        )}
      />
    </View>
  );
}

export function TrendingAudios() {
  const [rows, setRows] = useState<TrendingAudio[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTrendingAudio(12).then(({ data }) => alive && setRows(data ?? []));
    return () => {
      alive = false;
    };
  }, []);

  if (rows === null) return <AudioSkeletonRow />;
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader icon="musical-notes-outline" title="Trending audio" />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <FadeInView index={index}>
            <PressScale onPress={() => openUrl(item.preview_url)} style={styles.audioCard}>
              {item.cover_url ? (
                <Image source={{ uri: item.cover_url }} style={styles.audioCover} />
              ) : (
                <View style={[styles.audioCover, styles.reelPosterFallback]}>
                  <Ionicons name="musical-notes" size={28} color={colors.text.onDarkMuted} />
                </View>
              )}
              <Text style={styles.audioTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.artist ? (
                <Text style={styles.audioArtist} numberOfLines={1}>
                  {item.artist}
                </Text>
              ) : null}
            </PressScale>
          </FadeInView>
        )}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressScale
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </PressScale>
  );
}

function ReelSkeletonRow({
  title,
  icon
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader icon={icon} title={title} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.reelCard}>
            <Skeleton width={140} height={220} radius={radii.md} />
            <Skeleton width="80%" height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ProductSkeletonRow() {
  return (
    <View style={styles.section}>
      <SectionHeader icon="pricetags-outline" title="Trending products" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.productCard}>
            <Skeleton width={130} height={130} radius={radii.md} />
            <Skeleton width="90%" height={10} style={{ marginTop: 6 }} />
            <Skeleton width="50%" height={9} style={{ marginTop: 4 }} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function AudioSkeletonRow() {
  return (
    <View style={styles.section}>
      <SectionHeader icon="musical-notes-outline" title="Trending audio" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.audioCard}>
            <Skeleton width={130} height={130} radius={radii.md} />
            <Skeleton width="80%" height={10} style={{ marginTop: 6 }} />
            <Skeleton width="40%" height={9} style={{ marginTop: 4 }} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, gap: spacing.sm },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  headerTitle: { ...typography.h3, color: colors.text.primary },
  row: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 8 },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 8 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...typography.caption, color: colors.text.primary },
  chipTextActive: { color: colors.text.onDark, fontWeight: "600" },
  reelCard: { width: 140, gap: 6 },
  reelPoster: {
    width: 140,
    height: 220,
    borderRadius: radii.md,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center"
  },
  reelPosterFallback: { backgroundColor: colors.surface.chip },
  reelOverlay: {
    position: "absolute",
    top: 90,
    left: 0,
    right: 0,
    alignItems: "center"
  },
  reelCaption: { ...typography.caption, color: colors.text.secondary, lineHeight: 16 },
  productCard: { width: 130, gap: 4 },
  productImage: {
    width: 130,
    height: 130,
    borderRadius: radii.md,
    backgroundColor: colors.surface.card,
    resizeMode: "cover"
  },
  productName: { ...typography.caption, color: colors.text.primary, fontWeight: "600" },
  productCategory: { ...typography.caption, color: colors.text.muted, fontSize: 11 },
  audioCard: { width: 130, gap: 4 },
  audioCover: {
    width: 130,
    height: 130,
    borderRadius: radii.md,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center"
  },
  audioTitle: { ...typography.caption, color: colors.text.primary, fontWeight: "600" },
  audioArtist: { ...typography.caption, color: colors.text.muted, fontSize: 11 },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg
  },
  gridCell: {
    gap: 6
  },
  gridPoster: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: radii.md,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center"
  },
  gridOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  gridCaption: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 16
  }
});
