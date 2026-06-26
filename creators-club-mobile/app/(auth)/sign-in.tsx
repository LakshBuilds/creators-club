import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedBackdrop } from "../../components/AnimatedBackdrop";
import { Logo } from "../../components/Logo";
import { PrimaryButton } from "../../components/PrimaryButton";
import { API_BASE_URL } from "../../lib/apiBase";
import {
  generateOtp as bhGenerateOtp,
  getStoredSessionCookie,
  verifyOtp as bhVerifyOtp
} from "../../lib/buyhatke";
import { LEGAL_LINKS } from "../../lib/legalLinks";
import { createLogger } from "../../lib/logger";
import { supabase } from "../../lib/supabase";
import { toUserMessage } from "../../lib/to-user-message";
import { brand, colors, radii, spacing, typography } from "../../theme/tokens";

const log = createLogger("sign-in");

type Mode = "signin" | "signup";
type Step = "email" | "otp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BRIDGE_URL = `${API_BASE_URL}/api/auth/buyhatke-bridge`;

function maskEmail(email: string | null): string {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const head = user.slice(0, Math.min(2, user.length));
  return `${head}${"•".repeat(Math.max(1, user.length - head.length))}@${domain}`;
}

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>("signup");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    const value = (step === "otp" ? pendingEmail : email.trim().toLowerCase()) ?? email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      Alert.alert("Email", "Enter a valid email address.");
      return;
    }
    setLoading(true);
    log.info("sendCode (buyhatke)", { mode, emailTail: value.slice(-12) });
    try {
      const r = await bhGenerateOtp(value);
      if (r.status !== 1) {
        // "OTP already sent" means the previous code is still active — navigate
        // to the OTP step so the user can enter it instead of being stuck.
        const stillPending = /already|exist|wait|pending/i.test(r.err ?? "");
        if (stillPending) {
          setPendingEmail(value);
          setStep("otp");
          setOtp("");
          Alert.alert("Code already sent", "Use the code already in your inbox.");
          return;
        }
        throw new Error(r.err ?? "Couldn’t send OTP");
      }
      setPendingEmail(value);
      setStep("otp");
      setOtp("");
      Alert.alert("Code sent", "Check your inbox for a 6-digit code.");
    } catch (e) {
      log.error("sendCode failed", e);
      Alert.alert("Couldn’t send code", toUserMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!pendingEmail) {
      Alert.alert("Session expired", "Go back and request a new code.");
      return;
    }
    const code = otp.replace(/\D/g, "").slice(0, 6);
    if (code.length < 4) {
      Alert.alert("Code", "Enter the code from your email.");
      return;
    }
    setLoading(true);
    log.info("verifyOtp (buyhatke + bridge)", { emailTail: pendingEmail.slice(-12) });
    try {
      // 1. Verify OTP with Buyhatke — sets the X-Bh-Session cookie in SecureStore.
      const v = await bhVerifyOtp(pendingEmail, code);
      if (v.status !== 1) {
        throw new Error(v.err ?? "Invalid OTP");
      }

      // 2. Read the freshly-saved Buyhatke session cookie to send to our bridge.
      const cookie = await getStoredSessionCookie();
      if (!cookie) {
        throw new Error("Buyhatke session was not stored. Try again.");
      }

      // 3. Bridge: server validates the cookie with Buyhatke, then mints a
      //    Supabase session for the same email. One OTP, two identities.
      const bridgeRes = await fetch(BRIDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ sessionCookie: cookie })
      });
      const bridgeJson = (await bridgeRes.json()) as {
        access_token?: string;
        refresh_token?: string;
        error?: string;
        message?: string;
      };
      if (bridgeRes.status === 403 && bridgeJson.error === "account_paused") {
        Alert.alert(
          "Account paused",
          bridgeJson.message ??
            "Your account is paused. Email support@buyhatke.com to reactivate."
        );
        return;
      }
      if (!bridgeRes.ok || !bridgeJson.access_token || !bridgeJson.refresh_token) {
        throw new Error(bridgeJson.message ?? bridgeJson.error ?? `Bridge failed (${bridgeRes.status})`);
      }

      // 4. Hand the tokens to the Supabase client. The session listener in
      //    SessionProvider picks this up and AuthGate routes us into the app.
      const { error: setErr } = await supabase.auth.setSession({
        access_token: bridgeJson.access_token,
        refresh_token: bridgeJson.refresh_token
      });
      if (setErr) throw setErr;

      log.info("buyhatke→supabase bridge ok");
    } catch (e) {
      log.error("verifyOtp failed", e);
      Alert.alert("Verification failed", toUserMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function goBackToEmail() {
    setStep("email");
    setOtp("");
    setPendingEmail(null);
  }

  return (
    <LinearGradient
      colors={[colors.gradient.heroStart, colors.gradient.heroEnd]}
      style={styles.root}
    >
      <AnimatedBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <View style={styles.inner}>
            <View style={styles.logoWrap}>
              <Logo size="lg" tone="light" />
            </View>

            <Text style={styles.title}>
              {mode === "signup" ? "Sign up as Creator!" : "Welcome back"}
            </Text>

            {step === "email" ? (
              <>
                <View style={styles.perks}>
                  <Perk label="Top brand collabs" />
                  <Perk label="Gift card rewards" />
                </View>

                <Text style={styles.hint}>
                  {mode === "signup"
                    ? "We’ll email you a code to verify."
                    : "Sign in with the email you used before."}
                </Text>

                <View style={styles.inputWrap}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={colors.text.onDarkMuted}
                  />
                  <TextInput
                    placeholder="you@example.com"
                    placeholderTextColor={colors.text.onDarkMuted}
                    autoComplete="email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                  />
                </View>

                <View style={styles.buttonWrap}>
                  <PrimaryButton
                    label="Send email code"
                    onPress={sendCode}
                    loading={loading}
                    variant="light"
                  />
                </View>

                <Text style={styles.legal}>
                  By continuing you agree to our{" "}
                  <Text
                    style={styles.legalLink}
                    onPress={() => WebBrowser.openBrowserAsync(LEGAL_LINKS.terms)}
                  >
                    Terms
                  </Text>
                  {" "}and{" "}
                  <Text
                    style={styles.legalLink}
                    onPress={() => WebBrowser.openBrowserAsync(LEGAL_LINKS.privacy)}
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.hint}>Code sent to {maskEmail(pendingEmail)}</Text>

                <View style={styles.inputWrap}>
                  <Ionicons
                    name="keypad-outline"
                    size={18}
                    color={colors.text.onDarkMuted}
                  />
                  <TextInput
                    placeholder="6-digit code"
                    placeholderTextColor={colors.text.onDarkMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    style={styles.input}
                  />
                </View>

                <View style={styles.buttonWrap}>
                  <PrimaryButton
                    label="Verify & continue"
                    onPress={verifyOtp}
                    loading={loading}
                    variant="light"
                  />
                </View>

                <View style={styles.otpActions}>
                  <Pressable onPress={goBackToEmail} hitSlop={8}>
                    <Text style={styles.switchStrong}>Change email</Text>
                  </Pressable>
                  <Text style={styles.otpDot}>·</Text>
                  <Pressable
                    onPress={sendCode}
                    disabled={loading}
                    hitSlop={8}
                  >
                    <Text style={styles.switchStrong}>Resend code</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.taglineBox}>
              <Text style={styles.tagline}>{brand.tagline}</Text>
            </View>

            {step === "email" ? (
              <Pressable
                onPress={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  goBackToEmail();
                }}
              >
                <Text style={styles.switch}>
                  {mode === "signin" ? "New here? " : "Already a user? "}
                  <Text style={styles.switchStrong}>
                    {mode === "signin" ? "Sign up" : "Log in"}
                  </Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Perk({ label }: { label: string }) {
  return (
    <View style={styles.perk}>
      <View style={styles.perkDot}>
        <Ionicons name="checkmark" size={12} color={colors.text.onDark} />
      </View>
      <Text style={styles.perkLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: "center",
    gap: spacing.md
  },
  logoWrap: { alignItems: "center", marginBottom: spacing.md },
  title: {
    ...typography.display,
    color: colors.text.onDark,
    textAlign: "center",
    marginBottom: spacing.xs
  },
  hint: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    textAlign: "center",
    marginBottom: spacing.sm
  },
  perks: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginBottom: spacing.md
  },
  perk: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  perkDot: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.success,
    alignItems: "center",
    justifyContent: "center"
  },
  perkLabel: { ...typography.caption, color: colors.text.onDark, fontWeight: "700" },
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
    paddingVertical: 2
  },
  buttonWrap: { marginTop: spacing.sm },
  otpActions: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  otpDot: { color: colors.text.onDarkMuted, fontSize: 14 },
  taglineBox: {
    marginTop: spacing.xxxl,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)"
  },
  tagline: {
    ...typography.caption,
    color: colors.text.onDark,
    textAlign: "center"
  },
  switch: {
    marginTop: spacing.lg,
    textAlign: "center",
    color: colors.text.onDarkMuted,
    fontSize: 14
  },
  switchStrong: {
    color: colors.text.onDark,
    fontWeight: "700",
    textDecorationLine: "underline"
  },
  legal: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    textAlign: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg
  },
  legalLink: {
    color: colors.text.onDark,
    textDecorationLine: "underline",
    fontWeight: "600"
  }
});
