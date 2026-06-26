import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = {
  label: string;
  value: string;
};

export function StatCard({ label, value }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md
  },
  value: {
    ...typography.h2,
    color: colors.text.primary
  },
  label: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.xs,
    textAlign: "center"
  }
});
