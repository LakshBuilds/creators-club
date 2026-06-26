import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { colors } from "../theme/tokens";

/**
 * Decorative drifting blobs + twinkling sparkles. Pure visual — `pointerEvents="none"`
 * so it never intercepts taps. Runs on the UI thread via reanimated.
 */
export function AnimatedBackdrop({ density = "normal" }: { density?: "light" | "normal" }) {
  const { width, height } = Dimensions.get("window");
  const blobs = density === "light" ? BLOBS.slice(0, 2) : BLOBS;
  const sparkles = density === "light" ? SPARKLES.slice(0, 6) : SPARKLES;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {blobs.map((b, i) => (
        <DriftingBlob key={`b-${i}`} {...b} screenW={width} screenH={height} />
      ))}
      {sparkles.map((s, i) => (
        <Sparkle key={`s-${i}`} {...s} screenW={width} screenH={height} />
      ))}
    </View>
  );
}

type BlobConfig = {
  size: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  color: string;
  opacity: number;
};

const BLOBS: BlobConfig[] = [
  {
    size: 280,
    startX: -80,
    startY: -60,
    driftX: 30,
    driftY: 40,
    duration: 9000,
    color: colors.brand.primary,
    opacity: 0.18
  },
  {
    size: 220,
    startX: 0.7,
    startY: 0.15,
    driftX: -40,
    driftY: 30,
    duration: 11000,
    color: colors.brand.accent,
    opacity: 0.22
  },
  {
    size: 260,
    startX: -60,
    startY: 0.55,
    driftX: 50,
    driftY: -30,
    duration: 13000,
    color: colors.brand.primarySoft,
    opacity: 0.65
  },
  {
    size: 200,
    startX: 0.55,
    startY: 0.7,
    driftX: -30,
    driftY: -40,
    duration: 10000,
    color: colors.brand.accentSoft ?? "#FEF9C3",
    opacity: 0.85
  }
];

function DriftingBlob({
  size,
  startX,
  startY,
  driftX,
  driftY,
  duration,
  color,
  opacity,
  screenW,
  screenH
}: BlobConfig & { screenW: number; screenH: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [t, duration]);

  // Allow either absolute pixels or fractions (0–1) for positioning.
  const baseX = startX > 1 || startX < 0 ? startX : startX * screenW;
  const baseY = startY > 1 || startY < 0 ? startY : startY * screenH;

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: baseX + driftX * t.value },
      { translateY: baseY + driftY * t.value },
      { scale: 1 + 0.05 * t.value }
    ]
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity
        },
        animStyle
      ]}
    />
  );
}

type SparkleConfig = {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
};

const SPARKLES: SparkleConfig[] = [
  { x: 0.18, y: 0.2, size: 6, duration: 2800, delay: 0, color: colors.brand.accent },
  { x: 0.85, y: 0.12, size: 5, duration: 3200, delay: 600, color: colors.brand.primary },
  { x: 0.6, y: 0.28, size: 7, duration: 2400, delay: 200, color: colors.brand.accent },
  { x: 0.12, y: 0.46, size: 5, duration: 3000, delay: 1100, color: colors.brand.primaryDark },
  { x: 0.92, y: 0.55, size: 6, duration: 2600, delay: 800, color: colors.brand.accent },
  { x: 0.32, y: 0.68, size: 5, duration: 3100, delay: 1500, color: colors.brand.primary },
  { x: 0.74, y: 0.8, size: 7, duration: 2700, delay: 300, color: colors.brand.accent },
  { x: 0.45, y: 0.86, size: 5, duration: 3300, delay: 900, color: colors.brand.primaryDark }
];

function Sparkle({
  x,
  y,
  size,
  duration,
  delay,
  color,
  screenW,
  screenH
}: SparkleConfig & { screenW: number; screenH: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    const start = setTimeout(() => {
      t.value = withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }, delay);
    return () => clearTimeout(start);
  }, [t, duration, delay]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.6 * t.value,
    transform: [{ scale: 0.8 + 0.6 * t.value }]
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x * screenW,
          top: y * screenH,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color
        },
        animStyle
      ]}
    />
  );
}
