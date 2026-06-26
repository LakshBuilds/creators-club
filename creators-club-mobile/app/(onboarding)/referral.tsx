import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/PrimaryButton";
import { createLogger } from "../../lib/logger";
import { useSession } from "../../lib/session";
import { supabase } from "../../lib/supabase";
import { toUserMessage } from "../../lib/to-user-message";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const log = createLogger("onboarding-referral");

export default function ReferralScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;

  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  async function persist(nextCode: string | null) {
    if (!userId) return;
    setSaving(true);
    log.info("save referral", { hasCode: !!nextCode });
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ referred_by_code: nextCode })
        .eq("id", userId);
      if (error) throw error;
      router.push("/(onboarding)/instagram");
    } catch (e) {
      log.error("save referral failed", e);
      Alert.alert("Save failed", toUserMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onNext() {
    const trimmed = code.trim();
    if (trimmed.length === 0) {
      Alert.alert(
        "Referral code",
        "Enter a code or tap Skip if you don’t have one."
      );
      return;
    }
    await persist(trimmed);
  }

  async function onSkip() {
    await persist(null);
  }

  return (
    <LinearGradient
      colors={[colors.gradient.heroStart, colors.gradient.heroEnd]}
      style={styles.root}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.inner}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.stepPill}>
              <Text style={styles.stepText}>Step 3 of 4</Text>
            </View>
            <Text style={styles.title}>Got a referral code?</Text>
            <Text style={styles.subtitle}>
              Paste the code from a friend or creator. Optional — skip if you don’t
              have one.
            </Text>

            <View style={styles.inputWrap}>
              <Ionicons
                name="pricetag-outline"
                size={18}
                color={colors.text.onDarkMuted}
              />
              <TextInput
                placeholder="Enter referral code"
                placeholderTextColor={colors.text.onDarkMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                value={code}
                onChangeText={setCode}
                style={styles.input}
              />
            </View>

            <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
              <PrimaryButton
                label="Next"
                onPress={onNext}
                loading={saving}
                variant="light"
              />
              <Pressable
                onPress={onSkip}
                disabled={saving}
                style={styles.skipBtn}
              >
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    marginBottom: spacing.xl
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)"
  },
  input: {
    flex: 1,
    color: colors.text.onDark,
    fontSize: 15,
    paddingVertical: 2,
    letterSpacing: 1
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: spacing.md
  },
  skipText: {
    ...typography.bodyStrong,
    color: colors.text.onDark,
    textDecorationLine: "underline"
  }
});
