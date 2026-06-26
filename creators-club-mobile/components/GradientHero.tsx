import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../theme/tokens";

type Props = {
  children: ReactNode;
  rounded?: boolean;
  style?: ViewStyle;
  padded?: boolean;
};

export function GradientHero({ children, rounded, style, padded = true }: Props) {
  return (
    <LinearGradient
      colors={[colors.gradient.heroStart, colors.gradient.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.base,
        padded ? styles.padded : null,
        rounded ? styles.rounded : null,
        style
      ]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden" },
  padded: { padding: spacing.xxl },
  rounded: { borderRadius: radii.xl }
});
