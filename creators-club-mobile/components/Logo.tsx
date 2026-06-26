import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = {
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
  showWordmark?: boolean;
};

export function Logo({ size = "md", tone = "dark", showWordmark = true }: Props) {
  const box = size === "lg" ? 72 : size === "md" ? 44 : 32;
  const wordmarkSize = size === "lg" ? 34 : size === "md" ? 26 : 20;

  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[colors.gradient.heroStart, colors.gradient.heroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: box, height: box, borderRadius: box * 0.28 }]}
      >
        <Text style={[styles.mark, { fontSize: box * 0.44 }]}>B</Text>
      </LinearGradient>
      {showWordmark ? (
        <View style={{ marginLeft: spacing.md }}>
          <Text
            style={[
              typography.brandScript,
              {
                fontSize: wordmarkSize,
                color: tone === "light" ? colors.text.onDark : colors.text.primary
              }
            ]}
          >
            Buyhatke
          </Text>
          <Text
            style={[
              typography.caption,
              {
                color:
                  tone === "light" ? colors.text.onDarkMuted : colors.text.secondary,
                marginTop: -2,
                letterSpacing: 1.5,
                textTransform: "uppercase"
              }
            ]}
          >
            Creators
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)"
  },
  mark: { color: "#fff", fontWeight: "900", letterSpacing: -1 }
});

export { radii };
