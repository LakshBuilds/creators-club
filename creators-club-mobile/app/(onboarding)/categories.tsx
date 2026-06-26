import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OptionPickerModal } from "../../components/OptionPickerModal";
import { PrimaryButton } from "../../components/PrimaryButton";
import { CREATOR_CATEGORIES } from "../../lib/cities";
import { createLogger } from "../../lib/logger";
import { useSession } from "../../lib/session";
import { supabase } from "../../lib/supabase";
import { toUserMessage } from "../../lib/to-user-message";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const log = createLogger("onboarding-categories");

const MAX_PICKS = 5;

export default function CategoriesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;

  const [picks, setPicks] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("creators")
        .select("categories")
        .eq("profile_id", userId)
        .maybeSingle();
      if (error) log.error("prefill failed", error);
      if (data?.categories?.length) setPicks(data.categories);
    })();
  }, [userId]);

  const selectedSet = useMemo(() => new Set(picks), [picks]);
  const atMax = picks.length >= MAX_PICKS;

  function toggle(cat: string) {
    setPicks((curr) => {
      if (curr.includes(cat)) return curr.filter((c) => c !== cat);
      if (curr.length >= MAX_PICKS) return curr;
      return [...curr, cat];
    });
  }

  async function onNext() {
    if (!userId) return;
    if (picks.length === 0) {
      Alert.alert("Pick at least one", "Choose up to 5 categories.");
      return;
    }
    setSaving(true);
    log.info("save categories", { picks });
    try {
      const { error } = await supabase
        .from("creators")
        .upsert(
          { profile_id: userId, categories: picks },
          { onConflict: "profile_id" }
        );
      if (error) throw error;
      router.push("/(onboarding)/referral");
    } catch (e) {
      log.error("save categories failed", e);
      Alert.alert("Save failed", toUserMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <LinearGradient
      colors={[colors.gradient.heroStart, colors.gradient.heroEnd]}
      style={styles.root}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.inner}>
          <View style={styles.stepPill}>
            <Text style={styles.stepText}>Step 2 of 4</Text>
          </View>
          <Text style={styles.title}>Help us know you better</Text>
          <Text style={styles.subtitle}>
            Select up to {MAX_PICKS} categories you create content in.
          </Text>

          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {picks.length} / {MAX_PICKS} selected
            </Text>
          </View>

          <View style={styles.chipsBox}>
            {picks.length === 0 ? (
              <Text style={styles.emptyHint}>
                Nothing picked yet — tap the button below.
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {picks.map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text style={styles.chipText}>{c}</Text>
                    <Pressable onPress={() => toggle(c)} hitSlop={8}>
                      <Ionicons
                        name="close"
                        size={14}
                        color={colors.brand.primary}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Pressable
            onPress={() => setShowPicker(true)}
            style={styles.addBtn}
          >
            <Ionicons
              name="add"
              size={18}
              color={colors.text.onDark}
            />
            <Text style={styles.addText}>
              {picks.length === 0 ? "Select category" : "Add more"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={colors.text.onDarkMuted}
            />
          </Pressable>

          {atMax ? (
            <Text style={styles.maxHint}>
              You’ve picked the max. Remove one to swap.
            </Text>
          ) : null}

          <View style={{ marginTop: spacing.xxxl }}>
            <PrimaryButton
              label="Next"
              onPress={onNext}
              loading={saving}
              variant="light"
              disabled={picks.length === 0}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      <OptionPickerModal
        visible={showPicker}
        title={`Select up to ${MAX_PICKS}`}
        options={CREATOR_CATEGORIES}
        selectedSet={selectedSet}
        disabledSet={atMax ? new Set(CREATOR_CATEGORIES) : undefined}
        multi
        onClose={() => setShowPicker(false)}
        onSelect={toggle}
        searchPlaceholder="Search categories"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  stepPill: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    marginBottom: spacing.md
  },
  stepText: {
    ...typography.caption,
    color: colors.text.onDark,
    fontWeight: "700"
  },
  title: {
    ...typography.display,
    color: colors.text.onDark,
    marginBottom: spacing.xs
  },
  subtitle: {
    ...typography.body,
    color: colors.text.onDarkMuted,
    marginBottom: spacing.lg
  },
  countRow: { marginBottom: spacing.sm },
  countText: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    fontWeight: "700"
  },
  chipsBox: {
    minHeight: 92,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  emptyHint: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    textAlign: "center",
    paddingVertical: spacing.lg
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.text.onDark,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  chipText: {
    ...typography.caption,
    color: colors.brand.primary,
    fontWeight: "700"
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    paddingVertical: spacing.md
  },
  addText: {
    ...typography.bodyStrong,
    color: colors.text.onDark
  },
  maxHint: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    textAlign: "center",
    marginTop: spacing.sm
  }
});
