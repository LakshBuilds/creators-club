import { type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

type Props = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  /** Final scale during press. Defaults to 0.96 — premium-feeling without being floppy. */
  scaleTo?: number;
  /** Optional opacity dim during press. */
  dimTo?: number;
  /**
   * Layout + visual style applied to the outer Pressable. We pass this to the
   * outer wrapper (not the inner Animated.View) so that flex / width rules
   * actually constrain the touch target — otherwise a parent's `flex: 1` is
   * lost and the tile shrinks to its content width.
   */
  style?: StyleProp<ViewStyle>;
};

/**
 * Drop-in tappable that scales + dims on press using Reanimated 3 (UI thread).
 * Replaces the inline `pressed && { opacity: 0.85 }` pattern with a softer feel.
 */
export function PressScale({
  children,
  scaleTo = 0.96,
  dimTo = 0.92,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const t = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - t.value * (1 - scaleTo) }],
    opacity: 1 - t.value * (1 - dimTo)
  }));

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        t.value = withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        t.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
