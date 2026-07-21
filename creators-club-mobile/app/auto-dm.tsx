import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedBackdrop } from "../components/AnimatedBackdrop";
import { PrimaryButton } from "../components/PrimaryButton";
import { brand } from "../theme/tokens";
import {
  fetchIgRecentMedia,
  fetchLatestIgComment,
  isVideoMedia,
  sendIgPrivateReply,
  type IgRecentMedia
} from "../lib/instagramOAuth";
import { createLogger } from "../lib/logger";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";
import { toUserMessage } from "../lib/to-user-message";
import { colors, radii, shadow, spacing, typography } from "../theme/tokens";

const log = createLogger("auto-dm");

const DEFAULT_DM = "Hey! Thanks for commenting — here’s the link you asked for: https://buyhatke.com";
const DEFAULT_REPLIES = [
  "Thanks! Check your DMs 💌",
  "Sent it to your inbox 📩",
  "DM is on the way 🚀"
];

type CreatorRow = {
  ig_user_id: string | null;
  ig_long_lived_token: string | null;
};

type AutoDmRule = {
  id: string;
  profile_id: string;
  ig_user_id: string;
  ig_media_id: string;
  dm_message: string;
  comment_replies: string[];
  trigger_keyword: string | null;
  active: boolean;
};

const INTRO_SEEN_KEY = "auto_dm_intro_seen_v1";

export default function AutoDmScreen() {
  const { session } = useSession();
  const userId = session?.user.id;

  const [creator, setCreator] = useState<CreatorRow | null>(null);
  const [reels, setReels] = useState<IgRecentMedia[]>([]);
  const [rules, setRules] = useState<Record<string, AutoDmRule>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<IgRecentMedia | null>(null);
  /** null = still loading flag from storage, true = show intro, false = show list. */
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;
    const key = `${INTRO_SEEN_KEY}_${userId}`;
    AsyncStorage.getItem(key)
      .then((v) => setShowIntro(v !== "1"))
      .catch(() => setShowIntro(true));
  }, [userId]);

  async function dismissIntro() {
    if (!userId) return;
    setShowIntro(false);
    try {
      await AsyncStorage.setItem(`${INTRO_SEEN_KEY}_${userId}`, "1");
    } catch {
      /* non-fatal */
    }
  }

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("creators")
      .select("ig_user_id, ig_long_lived_token")
      .eq("profile_id", userId)
      .maybeSingle();
    if (error) log.error("creator fetch failed", error);
    setCreator((data as CreatorRow | null) ?? null);

    const { data: ruleRows, error: ruleErr } = await supabase
      .from("auto_dm_rules")
      .select("*")
      .eq("profile_id", userId);
    if (ruleErr) log.error("rules fetch failed", ruleErr);
    const next: Record<string, AutoDmRule> = {};
    for (const r of (ruleRows ?? []) as AutoDmRule[]) {
      next[r.ig_media_id] = r;
    }
    setRules(next);

    if (data?.ig_long_lived_token) {
      try {
        const media = await fetchIgRecentMedia(data.ig_long_lived_token, 25);
        setReels(media.filter((m) => isVideoMedia(m)));
      } catch (e) {
        log.error("media fetch failed", e);
      }
    }
  }, [userId]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function toggleActive(mediaId: string, next: boolean) {
    const rule = rules[mediaId];
    if (!rule) {
      // No rule yet — create with defaults so the toggle has something to flip.
      const reel = reels.find((r) => r.id === mediaId);
      if (!reel) return;
      await openEditor(reel, next);
      return;
    }
    const { error } = await supabase
      .from("auto_dm_rules")
      .update({ active: next })
      .eq("id", rule.id);
    if (error) {
      log.error("toggle failed", error);
      Alert.alert("Couldn’t update", toUserMessage(error));
      return;
    }
    setRules((prev) => ({ ...prev, [mediaId]: { ...rule, active: next } }));
  }

  async function openEditor(reel: IgRecentMedia, makeActive = true) {
    if (!userId || !creator?.ig_user_id) return;
    let rule = rules[reel.id];
    if (!rule) {
      const insert = {
        profile_id: userId,
        ig_user_id: creator.ig_user_id,
        ig_media_id: reel.id,
        dm_message: DEFAULT_DM,
        comment_replies: DEFAULT_REPLIES,
        trigger_keyword: null,
        active: makeActive
      };
      const { data, error } = await supabase
        .from("auto_dm_rules")
        .insert(insert)
        .select("*")
        .maybeSingle();
      if (error || !data) {
        log.error("rule insert failed", error);
        Alert.alert("Couldn’t set up", toUserMessage(error));
        return;
      }
      rule = data as AutoDmRule;
      setRules((prev) => ({ ...prev, [reel.id]: rule }));
    }
    setEditing(reel);
  }

  async function saveRule(updated: AutoDmRule) {
    const { error } = await supabase
      .from("auto_dm_rules")
      .update({
        dm_message: updated.dm_message,
        comment_replies: updated.comment_replies,
        trigger_keyword: updated.trigger_keyword,
        active: updated.active
      })
      .eq("id", updated.id);
    if (error) {
      log.error("rule update failed", error);
      Alert.alert("Couldn’t save", toUserMessage(error));
      return;
    }
    setRules((prev) => ({ ...prev, [updated.ig_media_id]: updated }));
    setEditing(null);
  }

  if (showIntro === true) {
    return <IntroView onCreate={dismissIntro} />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Auto DM",
          headerTintColor: colors.brand.primary,
          headerStyle: { backgroundColor: colors.surface.app },
          headerTitleStyle: { ...typography.h2, color: colors.brand.primary },
          headerShadowVisible: false
        }}
      />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.intro}>
            <Text style={styles.title}>Reply automatically when fans comment</Text>
            <Text style={styles.subtitle}>
              Pick a reel, write the DM, and we’ll send it to anyone who comments — plus a quick public reply so they know to check their inbox.
            </Text>
          </View>

          {!creator?.ig_long_lived_token ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="logo-instagram"
                size={28}
                color={colors.brand.primary}
              />
              <Text style={styles.emptyTitle}>Connect Instagram first</Text>
              <Text style={styles.emptyText}>
                Go to Profile → Verify Instagram, then come back here.
              </Text>
            </View>
          ) : loading ? (
            <View style={{ marginTop: spacing.xxl, alignItems: "center" }}>
              <ActivityIndicator color={colors.brand.primary} />
            </View>
          ) : reels.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="film-outline" size={28} color={colors.brand.primary} />
              <Text style={styles.emptyTitle}>No reels yet</Text>
              <Text style={styles.emptyText}>
                Post a reel from Instagram and pull to refresh.
              </Text>
            </View>
          ) : (
            reels.map((reel) => {
              const rule = rules[reel.id];
              const active = rule?.active ?? false;
              return (
                <Pressable
                  key={reel.id}
                  style={styles.row}
                  onPress={() => openEditor(reel)}
                  accessibilityRole="button"
                  accessibilityLabel="Configure auto DM for this reel"
                >
                  {reel.thumbnail_url || reel.media_url ? (
                    <Image
                      source={{ uri: reel.thumbnail_url ?? reel.media_url ?? "" }}
                      style={styles.thumb}
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="film" size={22} color={colors.text.muted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={styles.rowTitle}>
                      {reel.caption?.trim() || "Untitled reel"}
                    </Text>
                    <Text style={styles.rowHint}>
                      {rule
                        ? active
                          ? "Auto DM is on — tap to edit"
                          : "Saved, currently off — tap to edit"
                        : "Tap to set up"}
                    </Text>
                  </View>
                  <Switch
                    value={active}
                    onValueChange={(v) => toggleActive(reel.id, v)}
                    trackColor={{ true: colors.brand.primary, false: colors.surface.border }}
                  />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      <RuleEditorModal
        reel={editing}
        rule={editing ? rules[editing.id] ?? null : null}
        creatorToken={creator?.ig_long_lived_token ?? null}
        onClose={() => setEditing(null)}
        onSave={saveRule}
      />
    </>
  );
}

function IntroView({ onCreate }: { onCreate: () => void }) {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "",
          headerTintColor: colors.brand.primary,
          headerStyle: { backgroundColor: colors.surface.app },
          headerShadowVisible: false
        }}
      />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <AnimatedBackdrop />
        <ScrollView contentContainerStyle={styles.introContent}>
          <Text style={styles.introTitle}>{brand.name} Auto-DMs</Text>
          <Text style={styles.introSubtitle}>Turn engagement into growth.</Text>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewDot} />
              <Text style={styles.previewLabel}>AUTOMATION PREVIEW</Text>
            </View>

            <View style={styles.previewBubbleRow}>
              <View style={styles.previewAvatar}>
                <Ionicons name="person" size={18} color={colors.text.onDark} />
              </View>
              <View style={styles.previewIncoming}>
                <Text style={styles.previewIncomingStrong}>Hi!</Text>
                <Text style={styles.previewIncomingText}>Thanks for texting</Text>
                <Text style={styles.previewIncomingText}>
                  Here is the link <Text style={{ color: "#E11D48" }}>💯</Text>
                </Text>
                <View style={styles.previewClickBtn}>
                  <Text style={styles.previewClickText}>Click Me</Text>
                </View>
              </View>
            </View>

            <View style={styles.previewOutgoingWrap}>
              <View style={styles.previewOutgoing}>
                <Text style={styles.previewOutgoingText}>Thanks</Text>
              </View>
            </View>

            <View style={styles.previewComposer}>
              <View style={styles.previewComposerCam}>
                <Ionicons name="camera" size={14} color={colors.text.onDark} />
              </View>
              <Text style={styles.previewComposerPlaceholder}>Message…</Text>
              <View style={styles.previewComposerIcons}>
                <Ionicons name="image-outline" size={16} color={colors.text.muted} />
                <Ionicons name="happy-outline" size={16} color={colors.text.muted} />
                <Ionicons name="add-circle-outline" size={16} color={colors.text.muted} />
              </View>
            </View>
          </View>

          <Text style={styles.introHeading}>Launch your first{"\n"}automation</Text>
          <Text style={styles.introBody}>
            Automate your Instagram DMs and grow fast on Instagram. Auto-reply to reels, stories, and more.
          </Text>

          <Pressable
            onPress={onCreate}
            style={({ pressed }) => [styles.introCta, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Create automation"
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.text.onDark} />
            <Text style={styles.introCtaText}>Create automation</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function RuleEditorModal({
  reel,
  rule,
  creatorToken,
  onClose,
  onSave
}: {
  reel: IgRecentMedia | null;
  rule: AutoDmRule | null;
  creatorToken: string | null;
  onClose: () => void;
  onSave: (rule: AutoDmRule) => void | Promise<void>;
}) {
  const [dm, setDm] = useState("");
  const [replies, setReplies] = useState<[string, string, string]>(["", "", ""]);
  const [keyword, setKeyword] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!rule) return;
    setDm(rule.dm_message);
    const r = rule.comment_replies ?? [];
    setReplies([r[0] ?? "", r[1] ?? "", r[2] ?? ""]);
    setKeyword(rule.trigger_keyword ?? "");
    setActive(rule.active);
  }, [rule?.id]);

  if (!reel || !rule) return null;

  async function onSubmit() {
    if (!rule) return;
    if (!dm.trim()) {
      Alert.alert("DM message can’t be empty");
      return;
    }
    const cleanReplies = replies.map((r) => r.trim()).filter(Boolean);
    if (cleanReplies.length === 0) {
      Alert.alert("Add at least one comment reply");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...rule,
        dm_message: dm.trim(),
        comment_replies: cleanReplies,
        trigger_keyword: keyword.trim() || null,
        active
      });
    } finally {
      setSaving(false);
    }
  }

  // Live send action for App Review: fire the DM as a private reply to the most
  // recent comment on this reel, straight from the app UI. Instagram only allows
  // a DM as a reply to a user-initiated comment, so there must be a comment first.
  async function onSendNow() {
    if (!rule || !reel) return;
    if (!creatorToken) {
      Alert.alert("Connect Instagram first", "Reconnect your Instagram account, then try again.");
      return;
    }
    if (!dm.trim()) {
      Alert.alert("Add a DM message first");
      return;
    }
    setSending(true);
    try {
      const comment = await fetchLatestIgComment(reel.id, creatorToken);
      if (!comment) {
        Alert.alert(
          "No comment to reply to yet",
          "Comment on this reel from another Instagram account, then tap Send now."
        );
        return;
      }
      await sendIgPrivateReply(rule.ig_user_id, comment.id, dm.trim(), creatorToken);
      Alert.alert(
        "Sent ✓",
        "The DM was sent as a private reply to the latest commenter. Open that account’s Instagram inbox to see it."
      );
    } catch (e) {
      log.error("send now failed", e);
      Alert.alert("Couldn’t send", toUserMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Auto DM rule</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
            <Text style={styles.fieldLabel}>DM message</Text>
            <TextInput
              value={dm}
              onChangeText={setDm}
              multiline
              style={[styles.input, { minHeight: 90 }]}
              placeholder="What should the DM say?"
              placeholderTextColor={colors.text.muted}
            />

            <Text style={styles.fieldLabel}>Comment replies (one will be picked at random)</Text>
            {[0, 1, 2].map((i) => (
              <TextInput
                key={i}
                value={replies[i]}
                onChangeText={(text) => {
                  const next: [string, string, string] = [...replies] as [string, string, string];
                  next[i] = text;
                  setReplies(next);
                }}
                style={styles.input}
                placeholder={`Reply ${i + 1}`}
                placeholderTextColor={colors.text.muted}
              />
            ))}

            <Text style={styles.fieldLabel}>Trigger keyword (optional)</Text>
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              style={styles.input}
              placeholder="e.g. link — leave empty to fire on any comment"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
            />

            <View style={styles.activeRow}>
              <Text style={styles.fieldLabel}>Active</Text>
              <Switch
                value={active}
                onValueChange={setActive}
                trackColor={{ true: colors.brand.primary, false: colors.surface.border }}
              />
            </View>

            <PrimaryButton label="Save" onPress={onSubmit} loading={saving} />

            <Pressable
              onPress={onSendNow}
              disabled={sending}
              style={({ pressed }) => [styles.testBtn, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="Send a test reply now"
            >
              {sending ? (
                <ActivityIndicator color={colors.brand.primary} />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane-outline"
                    size={16}
                    color={colors.brand.primary}
                  />
                  <Text style={styles.testBtnText}>Send now (test reply)</Text>
                </>
              )}
            </Pressable>
            <Text style={styles.testHint}>
              Sends the DM above as a private reply to the most recent comment on
              this reel — use it to preview the automation.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.app },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  intro: { marginBottom: spacing.lg },
  title: { ...typography.h2, color: colors.text.primary },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs
  },
  emptyCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.card
  },
  emptyTitle: { ...typography.h3, color: colors.text.primary, marginTop: spacing.sm },
  emptyText: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: "center"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card
  },
  thumb: {
    width: 56,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: colors.surface.cardAlt
  },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  rowTitle: { ...typography.bodyStrong, color: colors.text.primary },
  rowHint: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: colors.surface.app,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: "85%"
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  modalTitle: { ...typography.h2, color: colors.text.primary },
  fieldLabel: {
    ...typography.overline,
    color: colors.text.muted,
    marginTop: spacing.md,
    marginBottom: spacing.xs
  },
  input: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.surface.border,
    marginBottom: spacing.sm
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: spacing.md
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    backgroundColor: colors.surface.card,
    minHeight: 48
  },
  testBtnText: {
    ...typography.bodyStrong,
    color: colors.brand.primary
  },
  testHint: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.xs,
    textAlign: "center"
  },
  introContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    alignItems: "center"
  },
  introTitle: {
    ...typography.display,
    fontSize: 32,
    color: colors.brand.primary,
    textAlign: "center"
  },
  introSubtitle: {
    ...typography.body,
    color: colors.text.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
    textAlign: "center"
  },
  previewCard: {
    width: "100%",
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.lg,
    ...shadow.card
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
    marginBottom: spacing.md
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.primary
  },
  previewLabel: {
    ...typography.overline,
    color: colors.text.muted,
    letterSpacing: 1
  },
  previewBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  previewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  previewIncoming: {
    backgroundColor: colors.surface.cardAlt,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: "75%"
  },
  previewIncomingStrong: {
    ...typography.bodyStrong,
    color: colors.text.primary
  },
  previewIncomingText: {
    ...typography.body,
    color: colors.text.primary
  },
  previewClickBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.text.onDark,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    alignSelf: "center"
  },
  previewClickText: {
    ...typography.bodyStrong,
    color: colors.text.primary
  },
  previewOutgoingWrap: {
    alignItems: "flex-end",
    marginBottom: spacing.md
  },
  previewOutgoing: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2
  },
  previewOutgoingText: {
    ...typography.bodyStrong,
    color: colors.text.onDark
  },
  previewComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface.cardAlt,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.xs
  },
  previewComposerCam: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.text.muted,
    alignItems: "center",
    justifyContent: "center"
  },
  previewComposerPlaceholder: {
    flex: 1,
    ...typography.body,
    color: colors.text.muted
  },
  previewComposerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  introHeading: {
    ...typography.display,
    fontSize: 26,
    color: colors.text.primary,
    textAlign: "center",
    marginTop: spacing.xxl
  },
  introBody: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22
  },
  introCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    alignSelf: "stretch"
  },
  introCtaText: {
    ...typography.bodyStrong,
    color: colors.text.onDark,
    fontSize: 16
  }
});
