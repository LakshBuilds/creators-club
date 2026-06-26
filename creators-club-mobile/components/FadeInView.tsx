import { type ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type Props = {
  children: ReactNode;
  /** Stagger entry by index — pass i for list items. */
  index?: number;
  /** Per-item delay multiplier in ms. */
  step?: number;
  /** Total entry duration. */
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Wrap any block to slide-and-fade in on mount. Uses Reanimated's built-in
 * declarative entry animations — runs on UI thread.
 */
export function FadeInView({ children, index = 0, step = 60, duration = 360, style }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(duration).delay(index * step)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
