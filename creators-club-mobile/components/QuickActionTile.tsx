import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { PressScale } from "./PressScale";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

export function QuickActionTile({ label, icon, onPress }: Props) {
  return (
    <PressScale onPress={onPress} style={styles.tile}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={colors.text.onDark} />
      </View>
      <Text style={styles.label} numberOfLines={2} adjustsFontSizeToFit>
        {label}
      </Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)"
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  label: {
    ...typography.caption,
    color: colors.text.onDark,
    textAlign: "center",
    lineHeight: 16
  }
});
