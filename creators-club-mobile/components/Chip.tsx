import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = {
  label: string;
  tone?: "dark" | "light" | "success";
};

export function Chip({ label, tone = "dark" }: Props) {
  const palette =
    tone === "light"
      ? { bg: colors.brand.primarySoft, fg: colors.brand.primary }
      : tone === "success"
        ? { bg: "rgba(34,197,94,0.12)", fg: colors.brand.success }
        : { bg: colors.surface.chip, fg: colors.text.onDark };
  return (
    <View style={[styles.base, { backgroundColor: palette.bg }]}>
      <Text style={[typography.caption, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
    alignSelf: "flex-start"
  }
});
