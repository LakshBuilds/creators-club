import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { colors, radii, shadow, spacing, typography } from "../theme/tokens";

type Variant = "primary" | "light" | "ghost";

type Props = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  fullWidth?: boolean;
  /** Optional leading icon, rendered before the label. */
  icon?: keyof typeof Ionicons.glyphMap;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  fullWidth = true,
  icon
}: Props) {
  const isDisabled = loading || disabled;
  const t = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - t.value * 0.04 }],
    opacity: 1 - t.value * 0.06
  }));

  const fgColor = variant === "primary" ? colors.text.onDark : colors.brand.primary;

  const content = loading ? (
    <ActivityIndicator color={fgColor} />
  ) : (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={18} color={fgColor} /> : null}
      <Text style={[typography.bodyStrong, { color: fgColor }]}>{label}</Text>
    </View>
  );

  return (
    <AnimatedPressable
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => {
        t.value = withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) });
      }}
      onPressOut={() => {
        t.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
      }}
      style={[
        fullWidth && { alignSelf: "stretch" },
        variant === "primary" && shadow.card,
        isDisabled && { opacity: 0.6 },
        animatedStyle
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={[colors.brand.primary, colors.brand.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, styles.solid]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.base,
            variant === "light" && styles.light,
            variant === "ghost" && styles.ghost
          ]}
        >
          {content}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    alignItems: "center",
    justifyContent: "center"
  },
  solid: { overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  light: { backgroundColor: colors.text.onDark },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.surface.borderStrong
  }
});
