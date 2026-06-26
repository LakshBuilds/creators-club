import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/PrimaryButton";
import { createLogger } from "../lib/logger";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";
import { toUserMessage } from "../lib/to-user-message";
import { colors, radii, shadow, spacing, typography } from "../theme/tokens";

const log = createLogger("edit-profile");

export default function EditProfileScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("full_name, city")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) log.error("load profile failed", error);
        setFullName((data?.full_name as string) ?? "");
        setCity((data?.city as string) ?? "");
        setLoading(false);
      });
  }, [userId]);

  async function onSave() {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          city: city.trim() || null
        })
        .eq("id", userId);
      if (error) throw error;
      Alert.alert("Saved", "Your profile is up to date.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e) {
      log.error("save profile failed", e);
      Alert.alert("Couldn't save", toUserMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Edit profile",
          headerTintColor: colors.brand.primary,
          headerStyle: { backgroundColor: colors.surface.app },
          headerTitleStyle: { ...typography.h2, color: colors.brand.primary },
          headerShadowVisible: false
        }}
      />
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {loading ? (
              <ActivityIndicator color={colors.brand.primary} />
            ) : (
              <>
                <View style={styles.card}>
                  <Field
                    label="Full name"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Your name"
                  />
                  <Field
                    label="City"
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Mumbai"
                  />
                </View>

                <Text style={styles.hint}>
                  Email and phone are tied to your Buyhatke account and can't be edited here.
                </Text>

                <PrimaryButton label="Save changes" onPress={onSave} loading={saving} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.app },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadow.card
  },
  field: { gap: spacing.xs },
  fieldLabel: {
    ...typography.overline,
    color: colors.text.muted
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface.cardAlt
  },
  hint: {
    ...typography.caption,
    color: colors.text.muted,
    paddingHorizontal: spacing.sm
  }
});
