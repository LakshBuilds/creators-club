import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { chat as aiChat, type AiMessage } from "../lib/ai";
import { useSession } from "../lib/session";
import { brand, colors, radii, spacing, typography } from "../theme/tokens";

const QUICK_PROMPTS = [
  "When will I get my payout?",
  "Why was my video rejected?",
  "How do I set up Auto DM?",
  "What's the difference between Boosted and Normal?"
];

export default function ChatScreen() {
  const { session } = useSession();
  const firstName = useMemo(() => {
    const meta = (session?.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    const raw = (meta.full_name ?? meta.name ?? "").trim();
    if (!raw) return "";
    return raw.split(/\s+/)[0];
  }, [session]);

  const greeting = firstName
    ? `Hey ${firstName} 👋`
    : "Hey there 👋";

  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      content: `${greeting} I'm here to help with payouts, video approvals, campaigns, Auto-DM, your referral link — pretty much anything about the app. Anything I can't see, I'll loop in the team. What's on your mind?`
    }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  async function send(text?: string) {
    const value = (text ?? input).trim();
    if (!value || busy) return;
    setInput("");
    const next: AiMessage[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    try {
      // Tiny delay so the typing indicator gets a chance to render — feels less
      // like an instant API and more like someone actually thinking.
      const [reply] = await Promise.all([
        aiChat("support", next),
        new Promise((r) => setTimeout(r, 350))
      ]);
      setMessages([
        ...next,
        { role: "assistant", content: reply || "(empty reply — try again)" }
      ]);
    } catch (e) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "Couldn't reach the helper just now — give it a moment and try again, or tap 'Talk to a human' below and I'll bring in the team."
        }
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Helper Chat",
          headerTintColor: colors.brand.primary,
          headerStyle: { backgroundColor: colors.surface.app },
          headerTitleStyle: { ...typography.h2, color: colors.brand.primary },
          headerShadowVisible: false
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                m.role === "user" ? styles.bubbleUser : styles.bubbleBot
              ]}
            >
              <Text
                style={[styles.bubbleText, m.role === "user" && styles.bubbleTextUser]}
                selectable
              >
                {m.content}
              </Text>
            </View>
          ))}
          {busy ? <TypingBubble /> : null}

          {messages.length <= 1 ? (
            <View style={styles.suggestions}>
              <Text style={styles.suggestLabel}>Quick prompts</Text>
              <View style={styles.suggestRow}>
                {QUICK_PROMPTS.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => send(q)}
                    style={({ pressed }) => [styles.suggestChip, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.suggestText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={`Type a question for ${brand.name} helper…`}
            placeholderTextColor={colors.text.muted}
            multiline
          />
          <Pressable
            onPress={() => send()}
            disabled={busy || !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (busy || !input.trim()) && { opacity: 0.5 },
              pressed && { opacity: 0.85 }
            ]}
          >
            <Ionicons name="send" size={18} color={colors.text.onDark} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

/** Three pulsing dots that animate independently so the bubble feels alive
 * instead of a static "Loading…" label. */
function TypingBubble() {
  return (
    <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
      <TypingDot delay={0} />
      <TypingDot delay={160} />
      <TypingDot delay={320} />
    </View>
  );
}

function TypingDot({ delay }: { delay: number }) {
  const v = useSharedValue(0);

  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 280, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 280, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [v, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + v.value * 0.7,
    transform: [{ translateY: -v.value * 3 }]
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface.app },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md
  },
  bubbleBot: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.brand.primary
  },
  bubbleText: { ...typography.body, color: colors.text.primary, lineHeight: 22 },
  bubbleTextUser: { color: colors.text.onDark },
  typingBubble: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text.muted },
  suggestions: { marginTop: spacing.md, gap: spacing.sm },
  suggestLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  suggestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  suggestText: { ...typography.caption, color: colors.text.primary },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface.app,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.primary,
    alignItems: "center",
    justifyContent: "center"
  }
});
