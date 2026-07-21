import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { createLogger } from "../lib/logger";
import { fetchIgMe, isIgProfessionalAccountType } from "../lib/instagramOAuth";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";
import { toUserMessage } from "../lib/to-user-message";
import { colors, spacing, typography } from "../theme/tokens";

const log = createLogger("auth-callback");

/**
 * Deep-link handler for the Instagram OAuth return.
 *
 * The server callback redirects to `creatorsclub://auth?access_token=…&user_id=…&username=…`
 * (or `?error=…`). In Expo Go the in-app auth session captures this and the
 * onboarding screen finishes the link. In a standalone build the redirect is
 * delivered to the OS as a deep link and routed here instead — so this screen
 * performs the same finish-up: verify the account is professional, link it via
 * the RPC, mark onboarding done, and enter the app. Without this route the link
 * would land on Expo Router's "Unmatched Route" page.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    access_token?: string;
    user_id?: string;
    username?: string;
    error?: string;
  }>();
  const router = useRouter();
  const { session, loading, refreshOnboarding } = useSession();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    // Wait until the persisted session has loaded before deciding anything.
    if (loading) return;

    const accessToken = params.access_token;
    const igUserId = params.user_id;

    // Server bounced an error back through the deep link.
    if (params.error) {
      handled.current = true;
      Alert.alert("Instagram link failed", String(params.error));
      router.replace("/(onboarding)/instagram");
      return;
    }

    // Missing the token/user — nothing to link. Route somewhere sane.
    if (!accessToken || !igUserId) {
      handled.current = true;
      router.replace(session ? "/(onboarding)/instagram" : "/(auth)/sign-in");
      return;
    }

    // The RPC links to the signed-in user (auth.uid). If there's no session we
    // can't attach the account — send them to sign in first.
    if (!session) {
      handled.current = true;
      router.replace("/(auth)/sign-in");
      return;
    }

    handled.current = true;
    void (async () => {
      try {
        // Confirm the account is professional (Business/Creator). Meta doesn't
        // let apps convert a personal account, so we gate and guide instead.
        let username = params.username;
        try {
          const me = await fetchIgMe(accessToken);
          username = me.username ?? username;
          if (!isIgProfessionalAccountType(me.account_type)) {
            Alert.alert(
              "We need a professional Instagram account",
              "Open Instagram and switch to a Creator or Business profile, then verify again."
            );
            router.replace("/(onboarding)/instagram");
            return;
          }
        } catch (e) {
          log.error("fetchIgMe failed", e);
          Alert.alert("Couldn’t read Instagram", toUserMessage(e));
          router.replace("/(onboarding)/instagram");
          return;
        }

        const expiresAt = new Date(
          Date.now() + 60 * 60 * 24 * 60 * 1000
        ).toISOString();
        const { error } = await supabase.rpc("link_instagram_account", {
          p_ig_user_id: igUserId,
          p_ig_username: username ?? null,
          p_handle: username ?? null,
          p_token: accessToken,
          p_expires_at: expiresAt
        });
        if (error) throw error;

        // Instagram is the final onboarding step — mark it complete and enter
        // the app. (Idempotent, so re-linking later from Profile is harmless.)
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", session.user.id);
        await refreshOnboarding();
        router.replace("/(tabs)/profile");
      } catch (e) {
        log.error("link_instagram_account failed", e);
        Alert.alert("Instagram link failed", toUserMessage(e));
        router.replace("/(onboarding)/instagram");
      }
    })();
  }, [loading, session, params, router, refreshOnboarding]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.brand.primary} size="large" />
      <Text style={styles.text}>Finishing your Instagram connection…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.app,
    padding: spacing.xl
  },
  text: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    textAlign: "center"
  }
});
