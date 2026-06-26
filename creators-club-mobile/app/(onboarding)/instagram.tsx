import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/PrimaryButton";
import { createLogger } from "../../lib/logger";
import {
  fetchIgMe,
  IG_APP_URL,
  IG_PROFESSIONAL_HELP_URL,
  isIgProfessionalAccountType,
  startIgAuth
} from "../../lib/instagramOAuth";
import { useSession } from "../../lib/session";
import { supabase } from "../../lib/supabase";
import { toUserMessage } from "../../lib/to-user-message";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const log = createLogger("onboarding-ig");

async function markOnboardingDone(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId);
  if (error) throw error;
}

export default function InstagramConnectScreen() {
  const router = useRouter();
  const { session, refreshOnboarding } = useSession();
  const userId = session?.user.id;

  const [connecting, setConnecting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [linked, setLinked] = useState<{ username?: string; userId: string } | null>(null);
  /** Meta API cannot turn a personal account pro — we guide the user; null = not blocked. */
  const [professionalGate, setProfessionalGate] = useState<{
    username?: string;
    reason: "personal" | "unknown";
  } | null>(null);
  const verifyInFlight = useRef(false);

  function openIgApp() {
    void Linking.openURL(IG_APP_URL);
  }
  function openProHelp() {
    void Linking.openURL(IG_PROFESSIONAL_HELP_URL);
  }

  async function onVerify() {
    if (!userId) return;
    if (verifyInFlight.current) return;
    verifyInFlight.current = true;
    setConnecting(true);
    log.info("verify instagram start");
    setProfessionalGate(null);
    try {
      const result = await startIgAuth();
      if (!result) {
        log.info("auth cancelled or no token");
        return;
      }
      let username = result.username;
      try {
        const me = await fetchIgMe(result.accessToken);
        username = me.username ?? username;
        if (!isIgProfessionalAccountType(me.account_type)) {
          const isPersonal = me.account_type?.toUpperCase() === "PERSONAL";
          setProfessionalGate({
            username: me.username,
            reason: isPersonal ? "personal" : "unknown"
          });
          log.info("instagram account not professional", { account_type: me.account_type });
          return;
        }
      } catch (e) {
        log.error("fetchIgMe failed", e);
        Alert.alert("Couldn’t read Instagram", toUserMessage(e));
        return;
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
      setLinked({ username, userId: result.userId });
    } catch (e) {
      log.error("verify instagram failed", e);
      Alert.alert("Instagram link failed", toUserMessage(e));
    } finally {
      setConnecting(false);
      verifyInFlight.current = false;
    }
  }

  async function onDone() {
    if (!userId) return;
    setFinishing(true);
    try {
      await markOnboardingDone(userId);
      await refreshOnboarding();
      router.replace("/(tabs)");
    } catch (e) {
      log.error("finish onboarding failed", e);
      Alert.alert("Finish failed", toUserMessage(e));
    } finally {
      setFinishing(false);
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
            <Text style={styles.stepText}>Step 4 of 4</Text>
          </View>
          <Text style={styles.title}>Verify your Instagram</Text>
          <Text style={styles.subtitle}>
            Connect your creator / business account so brands can see real
            insights. We never post on your behalf.
          </Text>

          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons
                name="logo-instagram"
                size={32}
                color={colors.brand.primary}
              />
            </View>
            {linked ? (
              <>
                <Text style={styles.cardTitle}>
                  Connected{linked.username ? ` as @${linked.username}` : ""}
                </Text>
                <Text style={styles.cardHint}>
                  Head to your profile to see followers, reach, and engagement.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Not connected yet</Text>
                <Text style={styles.cardHint}>
                  Tap the button below — you’ll be taken to Instagram to authorize
                  Buyhatke Creators, then brought right back. You need a{" "}
                  <Text style={styles.cardEm}>Creator or Business</Text> account (we
                  can’t change this for you — Instagram only allows you to switch in
                  their app).
                </Text>
              </>
            )}
          </View>

          {professionalGate ? (
            <View style={styles.proGate}>
              <Ionicons
                name="information-circle"
                size={22}
                color={colors.brand.accent}
              />
              <Text style={styles.proGateTitle}>
                {professionalGate.reason === "personal"
                  ? "This Instagram is still a personal account"
                  : "We need a professional Instagram account"}
              </Text>
              <Text style={styles.proGateBody}>
                {professionalGate.reason === "personal"
                  ? `Apps can’t turn your account into Creator/Business for you — only you can, in the Instagram app. ${
                      professionalGate.username
                        ? `You’re @${professionalGate.username}.`
                        : ""
                    }`
                  : "We couldn’t confirm the account type. In Instagram, use a Creator or Business profile linked to the login you use here."}
              </Text>
              <View style={styles.proSteps}>
                <Text style={styles.proStep}>
                  1. Open the Instagram app (same account you use for creators).
                </Text>
                <Text style={styles.proStep}>
                  2. Profile → Menu → Settings and activity → For professionals →
                  Account type and tools.
                </Text>
                <Text style={styles.proStep}>
                  3. Switch to Creator or Business, then come back and tap
                  &quot;Connect again&quot; below.
                </Text>
              </View>
              <View style={styles.proRow}>
                <Pressable
                  onPress={openIgApp}
                  style={({ pressed }) => [styles.proLinkBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.proLinkText}>Open Instagram</Text>
                </Pressable>
                <Pressable
                  onPress={openProHelp}
                  style={({ pressed }) => [styles.proLinkBtnOutline, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.proLinkTextOutline}>How it works (Meta)</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            {linked ? (
              <PrimaryButton
                label="Done"
                onPress={onDone}
                loading={finishing}
                variant="light"
              />
            ) : (
              <>
                <Pressable
                  onPress={onVerify}
                  disabled={connecting || finishing}
                  style={({ pressed }) => [
                    styles.verifyBtn,
                    (pressed || connecting) && { opacity: 0.75 }
                  ]}
                >
                  <Ionicons
                    name="logo-instagram"
                    size={20}
                    color={colors.text.onDark}
                  />
                  <Text style={styles.verifyText}>
                    {connecting
                      ? "Connecting…"
                      : professionalGate
                        ? "Connect again"
                        : "Verify with Instagram"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onDone}
                  disabled={connecting || finishing}
                  style={styles.skipBtn}
                >
                  <Text style={styles.skipText}>
                    {finishing ? "Finishing…" : "Skip for now"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
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
  card: {
    backgroundColor: colors.text.onDark,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  cardTitle: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: "center"
  },
  cardHint: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: "center"
  },
  cardEm: { fontWeight: "800", color: colors.text.primary },
  proGate: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    gap: spacing.sm
  },
  proGateTitle: {
    ...typography.bodyStrong,
    color: colors.text.onDark,
    marginTop: spacing.xs
  },
  proGateBody: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    lineHeight: 20
  },
  proSteps: { gap: spacing.xs, marginTop: spacing.xs },
  proStep: {
    ...typography.caption,
    color: colors.text.onDark,
    lineHeight: 20
  },
  proRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  proLinkBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.text.onDark,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: "center"
  },
  proLinkText: { ...typography.caption, fontWeight: "800", color: colors.brand.primary },
  proLinkBtnOutline: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: "center"
  },
  proLinkTextOutline: { ...typography.caption, fontWeight: "700", color: colors.text.onDark },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#E1306C",
    borderRadius: radii.pill,
    paddingVertical: spacing.lg
  },
  verifyText: {
    ...typography.bodyStrong,
    color: colors.text.onDark
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
