import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { colors, radii } from "../theme/tokens";

type Props = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = "100%", height = 14, radius = radii.sm, style }: Props) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [t]);

  const shimmer = useAnimatedStyle(() => ({
    opacity: 0.55 + t.value * 0.35
  }));

  return (
    <View
      style={[
        { width, height, borderRadius: radius, overflow: "hidden", backgroundColor: colors.surface.cardAlt },
        style
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface.border }, shimmer]} />
    </View>
  );
}
