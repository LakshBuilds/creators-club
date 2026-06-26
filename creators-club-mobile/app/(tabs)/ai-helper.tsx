import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { generate, type AiTool } from "../../lib/ai";
import { colors, radii, spacing, typography } from "../../theme/tokens";

type Tool = {
  id: AiTool;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
};

const TOOLS: Tool[] = [
  { id: "hook", label: "Reel Hook", icon: "flash", placeholder: "What's the reel about? e.g. ‘Amazon Prime gift card under 999’" },
  { id: "caption", label: "Caption", icon: "chatbubble-ellipses", placeholder: "Describe the reel and the vibe you want" },
  { id: "bio", label: "Insta Bio", icon: "person-circle", placeholder: "Your niche + personality e.g. ‘fashion budget hauls, GenZ humour’" },
  { id: "story", label: "Story Idea", icon: "albums", placeholder: "Niche or campaign you want story ideas for" },
  { id: "content", label: "Content Idea", icon: "bulb", placeholder: "Tell me what you create — I'll suggest 5 reels for this week" },
  { id: "script", label: "Reel Script", icon: "film", placeholder: "Topic + product. Output is a 30–45s timestamped script" }
];

export default function AiHelperScreen() {
  const [tool, setTool] = useState<Tool>(TOOLS[0]);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => prompt.trim().length > 4 && !loading, [prompt, loading]);

  async function onGenerate() {
    if (!canSubmit) return;
    setLoading(true);
    setOutput("");
    try {
      const reply = await generate(tool.id, prompt.trim());
      setOutput(reply || "(no response)");
    } catch (e) {
      Alert.alert("Helper unavailable", e instanceof Error ? e.message : "Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    if (!output) return;
    try {
      await Clipboard.setStringAsync(output);
      Alert.alert("Copied", "Output copied to clipboard.");
    } catch {
      Alert.alert("Copy failed", "Try again.");
    }
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Pick a tool</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolRow}
          >
            {TOOLS.map((t) => {
              const active = tool.id === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTool(t)}
                  style={[styles.toolChip, active && styles.toolChipActive]}
                >
                  <Ionicons
                    name={t.icon}
                    size={18}
                    color={active ? colors.text.onDark : colors.brand.primary}
                  />
                  <Text style={[styles.toolChipLabel, active && styles.toolChipLabelActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.subhead}>Prompt</Text>
          <TextInput
            style={styles.input}
            placeholder={tool.placeholder}
            placeholderTextColor={colors.text.muted}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={3}
          />

          <Pressable
            onPress={onGenerate}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.cta,
              !canSubmit && { opacity: 0.5 },
              pressed && { opacity: 0.85 }
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.onDark} />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.text.onDark} />
                <Text style={styles.ctaLabel}>Generate</Text>
              </>
            )}
          </Pressable>

          {output ? (
            <View style={styles.outputCard}>
              <View style={styles.outputHeader}>
                <Text style={styles.outputTitle}>{tool.label}</Text>
                <Pressable
                  onPress={onCopy}
                  style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.7 }]}
                  hitSlop={8}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.brand.primary} />
                </Pressable>
              </View>
              <Text selectable style={styles.outputText}>{output}</Text>
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
  heading: { ...typography.h3, color: colors.text.primary },
  subhead: { ...typography.caption, color: colors.text.muted, textTransform: "uppercase", marginTop: spacing.sm, letterSpacing: 0.6 },
  toolRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  toolChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border
  },
  toolChipActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary
  },
  toolChipLabel: { ...typography.caption, color: colors.text.primary, fontWeight: "600" },
  toolChipLabelActive: { color: colors.text.onDark },
  input: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
    minHeight: 96,
    textAlignVertical: "top"
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md
  },
  ctaLabel: { ...typography.bodyStrong, color: colors.text.onDark },
  outputCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: spacing.sm
  },
  outputHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  outputTitle: { ...typography.bodyStrong, color: colors.text.primary },
  copyBtn: { padding: 4 },
  outputText: { ...typography.body, color: colors.text.primary, lineHeight: 22 },
  chatLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    marginTop: spacing.md
  },
  chatLinkText: { ...typography.body, color: colors.text.primary, flex: 1 }
});
