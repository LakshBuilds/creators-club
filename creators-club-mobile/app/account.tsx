import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Divider, Row, Section, settingsStyles } from "../components/SettingsRow";
import { API_BASE_URL } from "../lib/apiBase";
import { createLogger } from "../lib/logger";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";
import { toUserMessage } from "../lib/to-user-message";
import { colors, typography } from "../theme/tokens";

const log = createLogger("account");
const SUPPORT_EMAIL = "support@buyhatke.com";

export default function AccountScreen() {
  const { signOut } = useSession();
  const [pausing, setPausing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function performPause() {
    setPausing(true);
    try {
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No active session");
      const res = await fetch(`${API_BASE_URL}/api/account/pause`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ paused: true })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text?.slice(0, 200) || `Request failed (${res.status})`);
      }
      Alert.alert(
        "Account paused",
        `You'll be signed out now. Email ${SUPPORT_EMAIL} when you're ready to reactivate.`,
        [{ text: "OK", onPress: () => signOut() }]
      );
    } catch (e) {
      log.error("pause failed", e);
      Alert.alert("Couldn't pause account", toUserMessage(e));
    } finally {
      setPausing(false);
    }
  }

  function onPauseAccount() {
    Alert.alert(
      "Pause account?",
      `Pausing hides you from brands and freezes new campaigns. You'll be signed out and won't be able to sign back in until you email ${SUPPORT_EMAIL} to reactivate.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Pause", style: "destructive", onPress: performPause }
      ]
    );
  }

  async function performDelete() {
    setDeleting(true);
    try {
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No active session");
      const res = await fetch(`${API_BASE_URL}/api/account/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (res.status === 404) {
          throw new Error(
            "Account delete is not available on the server yet. Email " +
              SUPPORT_EMAIL +
              " for help."
          );
        }
        const trimmed =
          text && text.length > 0 && !text.trim().startsWith("<")
            ? text.slice(0, 200)
            : "";
        throw new Error(trimmed || `Request failed (${res.status})`);
      }
      await signOut();
    } catch (e) {
      log.error("delete failed", e);
      Alert.alert("Couldn't delete account", toUserMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  function onDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "This permanently removes your profile, Instagram link, applications, and submissions. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDelete }
      ]
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Account",
          headerTintColor: colors.brand.primary,
          headerStyle: { backgroundColor: colors.surface.app },
          headerTitleStyle: { ...typography.h2, color: colors.brand.primary },
          headerShadowVisible: false
        }}
      />
      <SafeAreaView style={settingsStyles.safe} edges={["bottom"]}>
        <ScrollView contentContainerStyle={settingsStyles.content}>
          <Section>
            <Row
              icon="pause-circle-outline"
              label="Pause account"
              hint="Temporarily hide your profile from brands"
              onPress={onPauseAccount}
              loading={pausing}
            />
            <Divider />
            <Row
              icon="trash-outline"
              label="Delete account"
              hint="Permanently remove your account and data"
              onPress={onDeleteAccount}
              loading={deleting}
              destructive
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

