import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { generate } from "../../lib/ai";
import { createIdea, listMyIdeas, type CreatorIdea } from "../../lib/ideas";
import { createLogger } from "../../lib/logger";
import { useSession } from "../../lib/session";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const log = createLogger("ideas");

export default function IdeasScreen() {
  const { session } = useSession();
  const user = session?.user ?? null;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aiUsed, setAiUsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [items, setItems] = useState<CreatorIdea[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await listMyIdeas(user.id);
    if (error) log.warn("listMyIdeas failed", error);
    setItems(data ?? []);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function onAiAssist() {
    const seed = title.trim() || body.trim();
    if (!seed) {
      Alert.alert("Add a topic", "Type a few words about the idea first.");
      return;
    }
    setScriptLoading(true);
    try {
      const reply = await generate("script", seed);
      setBody(reply);
      setAiUsed(true);
    } catch (e) {
      Alert.alert("Helper unavailable", e instanceof Error ? e.message : "Try again.");
    } finally {
      setScriptLoading(false);
    }
  }

  async function onSubmit() {
    if (!user) {
      Alert.alert("Sign in required");
      return;
    }
    const t = title.trim();
    const b = body.trim();
    if (t.length < 3 || b.length < 8) {
      Alert.alert("Add more detail", "Give your idea a title and a quick description.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await createIdea({ creatorId: user.id, title: t, body: b, aiUsed });
      if (error) throw error;
      Alert.alert("Sent!", "Thanks — we'll review and get back to you.");
      setTitle("");
      setBody("");
      setAiUsed(false);
      load();
    } catch (e) {
      Alert.alert("Couldn't share", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.lead}>
            Got a reel concept, campaign idea, or product wishlist? Share it — we read every one.
          </Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. ‘Diwali gift card hauls under ₹999’"
            placeholderTextColor={colors.text.muted}
          />

          <Text style={styles.label}>Idea</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={body}
            onChangeText={(v) => {
              setBody(v);
              if (aiUsed) setAiUsed(false);
            }}
            placeholder="Walk us through it — what would creators shoot, what would viewers love?"
            placeholderTextColor={colors.text.muted}
            multiline
            numberOfLines={6}
          />

          <Pressable
            onPress={onAiAssist}
            disabled={scriptLoading}
            style={({ pressed }) => [styles.aiBtn, pressed && { opacity: 0.85 }, scriptLoading && { opacity: 0.6 }]}
          >
            {scriptLoading ? (
              <ActivityIndicator color={colors.brand.primary} />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color={colors.brand.primary} />
                <Text style={styles.aiBtnLabel}>AI: turn this into a 30s reel script</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push("/ai-helper")}
            style={({ pressed }) => [styles.helperLink, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="construct-outline" size={16} color={colors.text.muted} />
            <Text style={styles.helperLinkText}>Need a hook, caption, or bio? Open AI Helper</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
          </Pressable>

          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            style={({ pressed }) => [styles.cta, submitting && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.text.onDark} />
            ) : (
              <Text style={styles.ctaLabel}>Share with the team</Text>
            )}
          </Pressable>

          {items.length > 0 ? (
            <View style={styles.history}>
              <Text style={styles.historyTitle}>Your previous ideas</Text>
              {items.map((it) => (
                <View key={it.id} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyName}>{it.title}</Text>
                    <Text style={styles.historyStatus}>{it.status}</Text>
                  </View>
                  <Text style={styles.historyBody} numberOfLines={3}>{it.body}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface.app },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  lead: { ...typography.body, color: colors.text.secondary, lineHeight: 22 },
  label: { ...typography.caption, color: colors.text.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.sm },
  input: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md
  },
  textarea: { minHeight: 130, textAlignVertical: "top" },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.brand.accent
  },
  aiBtnLabel: { ...typography.caption, fontWeight: "700", color: colors.brand.primaryDark },
  helperLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  helperLinkText: { ...typography.caption, color: colors.text.secondary, flex: 1 },
  cta: {
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    marginTop: spacing.sm
  },
  ctaLabel: { ...typography.bodyStrong, color: colors.text.onDark },
  history: { marginTop: spacing.xl, gap: spacing.sm },
  historyTitle: { ...typography.h3, color: colors.text.primary },
  historyItem: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: 4
  },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyName: { ...typography.bodyStrong, color: colors.text.primary, flex: 1 },
  historyStatus: { ...typography.caption, color: colors.text.muted, textTransform: "uppercase" },
  historyBody: { ...typography.caption, color: colors.text.secondary, lineHeight: 18 }
});
