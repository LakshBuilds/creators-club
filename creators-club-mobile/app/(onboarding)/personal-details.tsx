import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { OptionPickerModal } from "../../components/OptionPickerModal";
import { PrimaryButton } from "../../components/PrimaryButton";
import { INDIAN_CITIES } from "../../lib/cities";
import { createLogger } from "../../lib/logger";
import { useSession } from "../../lib/session";
import { supabase } from "../../lib/supabase";
import { toUserMessage } from "../../lib/to-user-message";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const log = createLogger("onboarding-personal");

type Gender = "male" | "female" | "other";

const GENDER_OPTS: Array<{ value: Gender; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Prefer not to disclose" }
];

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, age, city, gender")
        .eq("id", userId)
        .maybeSingle();
      if (error) log.error("prefill failed", error);
      if (data) {
        if (data.full_name) setName(data.full_name);
        if (data.age != null) setAge(String(data.age));
        if (data.city) setCity(data.city);
        if (data.gender) setGender(data.gender as Gender);
      }
      setLoaded(true);
    })();
  }, [userId]);

  async function onNext() {
    if (!userId) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      Alert.alert("Name", "Enter your full name.");
      return;
    }
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 13 || ageNum > 100) {
      Alert.alert("Age", "Enter a valid age (13–100).");
      return;
    }
    if (!city) {
      Alert.alert("City", "Select your city.");
      return;
    }
    if (!gender) {
      Alert.alert("Gender", "Select an option.");
      return;
    }
    setSaving(true);
    log.info("save personal", { ageNum, city, gender });
    try {
      // Upsert: if handle_new_user never created profiles (e.g. old account), update alone matched 0 rows
      // and later creators insert fails with creators_profile_id_fkey (see terminal).
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: trimmedName,
          age: ageNum,
          city,
          gender
        },
        { onConflict: "id" }
      );
      if (error) throw error;
      router.push("/(onboarding)/categories");
    } catch (e) {
      log.error("save personal failed", e);
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.inner}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.stepPill}>
              <Text style={styles.stepText}>Step 1 of 4</Text>
            </View>
            <Text style={styles.title}>Personal details</Text>
            <Text style={styles.subtitle}>
              Tell us a bit about you so brands can find the right fit.
            </Text>

            <Field icon="person-outline" label="Full name">
              <TextInput
                placeholder="Your name"
                placeholderTextColor={colors.text.onDarkMuted}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                style={styles.input}
                editable={loaded}
              />
            </Field>

            <Field icon="calendar-outline" label="Age">
              <TextInput
                placeholder="e.g. 22"
                placeholderTextColor={colors.text.onDarkMuted}
                keyboardType="number-pad"
                maxLength={3}
                value={age}
                onChangeText={(t) => setAge(t.replace(/\D/g, ""))}
                style={styles.input}
                editable={loaded}
              />
            </Field>

            <Field icon="location-outline" label="City">
              <Pressable
                onPress={() => setShowCityPicker(true)}
                style={styles.pickerInner}
              >
                <Text
                  style={[
                    styles.input,
                    !city && { color: colors.text.onDarkMuted }
                  ]}
                  numberOfLines={1}
                >
                  {city ?? "Select your city"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={colors.text.onDarkMuted}
                />
              </Pressable>
            </Field>

            <Text style={styles.groupLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTS.map((g) => {
                const active = gender === g.value;
                return (
                  <Pressable
                    key={g.value}
                    onPress={() => setGender(g.value)}
                    style={[
                      styles.genderBtn,
                      active && styles.genderBtnActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        active && styles.genderTextActive
                      ]}
                    >
                      {g.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: spacing.xxl }}>
              <PrimaryButton
                label="Continue"
                onPress={onNext}
                loading={saving}
                variant="light"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <OptionPickerModal
        visible={showCityPicker}
        title="Select your city"
        options={INDIAN_CITIES}
        selected={city}
        onClose={() => setShowCityPicker(false)}
        onSelect={setCity}
        searchPlaceholder="Search city"
      />
    </LinearGradient>
  );
}

function Field({
  icon,
  label,
  children
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={colors.text.onDarkMuted} />
        {children}
      </View>
    </View>
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
  field: { marginBottom: spacing.md },
  fieldLabel: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    marginBottom: spacing.xs,
    marginLeft: spacing.sm
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
    paddingVertical: 2
  },
  pickerInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  groupLabel: {
    ...typography.caption,
    color: colors.text.onDarkMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm
  },
  genderRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  genderBtn: {
    flexGrow: 1,
    flexBasis: "30%",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center"
  },
  genderBtnActive: {
    backgroundColor: colors.text.onDark,
    borderColor: colors.text.onDark
  },
  genderText: {
    ...typography.caption,
    color: colors.text.onDark,
    fontWeight: "700",
    textAlign: "center"
  },
  genderTextActive: { color: colors.brand.primary }
});
