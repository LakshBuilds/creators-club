import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
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
import { PrimaryButton } from "../components/PrimaryButton";
import { useBuyhatkeSession } from "../lib/buyhatkeSession";
import { createLogger } from "../lib/logger";
import { colors, radii, spacing, typography } from "../theme/tokens";

const log = createLogger("buyhatke-connect");

type Step = "email" | "otp";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function BuyhatkeConnectScreen() {
  const { generateOtp, verifyOtp, disconnect, status } = useBuyhatkeSession();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSendOtp() {
    const e = email.trim().toLowerCase();
    if (!isValidEmail(e)) {
      Alert.alert("Email", "Enter a valid email address.");
      return;
    }
    setLoading(true);
    log.info("send-otp", { emailTail: e.slice(-12) });
    const r = await generateOtp(e);
    setLoading(false);
    if (!r.ok) {
      Alert.alert("Couldn’t send OTP", r.err);
      return;
    }
    setEmail(e);
    setOtp("");
    setStep("otp");
    Alert.alert("OTP sent", "Check your email for the 6-digit code.");
  }

  async function onVerify() {
    const code = otp.replace(/\D/g, "").slice(0, 6);
    if (code.length < 4) {
      Alert.alert("OTP", "Enter the code from your email.");
      return;
    }
    setLoading(true);
    log.info("verify-otp");
    const r = await verifyOtp(email, code);
    setLoading(false);
    if (!r.ok) {
      Alert.alert("Verification failed", r.err);
      return;
    }
    log.info("connected");
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  function backToEmail() {
    setStep("email");
    setOtp("");
  }

  if (status === "connected") {
    // Avoid showing the connect form when already linked.
    return (
      <>
        <Stack.Screen options={{ title: "Connect Buyhatke" }} />
        <View style={styles.connectedWrap}>
          <Ionicons name="checkmark-circle" size={48} color={colors.brand.success} />
          <Text style={styles.connectedTitle}>Already connected</Text>
          <Text style={styles.connectedHint}>
            Your Buyhatke account is linked. Pull down on the home screen to refresh.
          </Text>
          <View style={{ height: spacing.lg }} />
          <PrimaryButton label="Done" onPress={() => router.back()} />
          <View style={{ height: spacing.sm }} />
          <Pressable
            onPress={() => {
              Alert.alert("Disconnect", "Sign out of Buyhatke on this device?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Disconnect",
                  style: "destructive",
                  onPress: async () => {
                    await disconnect();
                    setStep("email");
                    setEmail("");
                    setOtp("");
                  }
                }
              ]);
            }}
          >
            <Text style={styles.disconnectLink}>Disconnect</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Connect Buyhatke",
          headerTintColor: colors.text.primary
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconWrap}>
            <Ionicons name="gift" size={36} color={colors.brand.primary} />
          </View>
          <Text style={styles.title}>Link your Buyhatke account</Text>
          <Text style={styles.subtitle}>
            Sign in with the email you use on buyhatke.com to see your gift-card points and
            referral link.
          </Text>

          {step === "email" ? (
            <>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.text.muted} />
                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor={colors.text.muted}
                  autoComplete="email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                />
              </View>
              <View style={styles.buttonWrap}>
                <PrimaryButton
                  label="Send OTP"
                  onPress={onSendOtp}
                  loading={loading}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.otpHint}>Code sent to {email}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="keypad-outline" size={18} color={colors.text.muted} />
                <TextInput
                  placeholder="6-digit code"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  style={styles.input}
                />
              </View>
              <View style={styles.buttonWrap}>
                <PrimaryButton
                  label="Verify & connect"
                  onPress={onVerify}
                  loading={loading}
                />
              </View>
              <View style={styles.actionsRow}>
                <Pressable onPress={backToEmail} hitSlop={8}>
                  <Text style={styles.actionLink}>Change email</Text>
                </Pressable>
                <Text style={styles.actionDot}>·</Text>
                <Pressable onPress={onSendOtp} disabled={loading} hitSlop={8}>
                  <Text style={styles.actionLink}>Resend code</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface.app },
  content: {
    padding: spacing.xxl,
    gap: spacing.md
  },
  iconWrap: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.md
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    textAlign: "center"
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.lg
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    paddingVertical: 2
  },
  buttonWrap: { marginTop: spacing.sm },
  otpHint: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.sm
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  actionLink: {
    ...typography.bodyStrong,
    color: colors.brand.primary
  },
  actionDot: { color: colors.text.muted, fontSize: 14 },
  connectedWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    backgroundColor: colors.surface.app
  },
  connectedTitle: {
    ...typography.h1,
    color: colors.text.primary,
    marginTop: spacing.lg
  },
  connectedHint: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing.sm
  },
  disconnectLink: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: "center",
    textDecorationLine: "underline"
  }
});
