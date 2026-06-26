import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { colors, radii, shadow, spacing, typography } from "../theme/tokens";

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionLabel}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function Row({
  icon,
  label,
  hint,
  onPress,
  loading,
  destructive
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  loading?: boolean;
  destructive?: boolean;
}) {
  const tint = destructive ? colors.feedback.dangerFg : colors.text.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.rowIcon, destructive && styles.rowIconDanger]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
      )}
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export const settingsStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.app },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl }
});

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  sectionLabel: {
    ...typography.overline,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadow.card
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.chip,
    alignItems: "center",
    justifyContent: "center"
  },
  rowIconDanger: {
    backgroundColor: colors.feedback.dangerBg
  },
  rowLabel: { ...typography.bodyStrong },
  rowHint: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface.border,
    marginLeft: spacing.lg + 36 + spacing.md
  }
});
