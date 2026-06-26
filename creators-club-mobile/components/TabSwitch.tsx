import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Option<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  contentContainerStyle?: ViewStyle;
};

type ChipLayout = { x: number; w: number };

/**
 * Pill-shaped segmented switch with a sliding indicator behind the active tab.
 * The indicator interpolates its position and width via Reanimated 3 — the
 * "shared layout" trick from Motion's `layoutId` pattern, but on the UI thread.
 */
export function TabSwitch<T extends string>({
  value,
  onChange,
  options,
  contentContainerStyle
}: Props<T>) {
  const layoutsRef = useRef<Record<string, ChipLayout>>({});
  const [, force] = useState(0);
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  function recordLayout(id: string, e: LayoutChangeEvent) {
    layoutsRef.current[id] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
    force((n) => n + 1);
  }

  useEffect(() => {
    const layout = layoutsRef.current[value];
    if (!layout) return;
    x.value = withTiming(layout.x, { duration: 240, easing: Easing.out(Easing.cubic) });
    w.value = withTiming(layout.w, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [value, x, w]);

  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: w.value
  }));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.wrap, contentContainerStyle]}
    >
      <View style={styles.track}>
        <Animated.View style={[styles.indicator, indicator]} />
        {options.map((o) => {
          const active = o.id === value;
          return (
            <Pressable
              key={o.id}
              onPress={() => onChange(o.id)}
              onLayout={(e) => recordLayout(o.id, e)}
              style={styles.chip}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: active ? colors.text.onDark : colors.brand.primary }
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xs,
    alignItems: "center"
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.cardAlt,
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.surface.border,
    position: "relative"
  },
  indicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 0,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.pill
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    justifyContent: "center",
    minWidth: 64,
    alignItems: "center"
  },
  label: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const
  }
});
