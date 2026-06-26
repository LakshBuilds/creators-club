import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { PressScale } from "./PressScale";
import { Skeleton } from "./Skeleton";
import { colors, radii, shadow, spacing, typography } from "../theme/tokens";

type Props = {
  title: string;
  brief: string;
  brand?: string | null;
  budgetInr: number;
  deadline?: string | null;
  requiresInPass?: boolean;
  onPress?: () => void;
};

export function CampaignCard({
  title,
  brief,
  brand,
  budgetInr,
  deadline,
  requiresInPass,
  onPress
}: Props) {
  return (
    <PressScale onPress={onPress} style={styles.card}>
      {requiresInPass ? (
        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>inPass</Text>
        </View>
      ) : null}

      <Text style={styles.brand}>{brand ?? "Buyhatke"}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text numberOfLines={2} style={styles.brief}>
        {brief}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.budgetPill}>
          <Ionicons name="cash-outline" size={14} color={colors.brand.primary} />
          <Text style={styles.budgetText}>
            ₹{budgetInr.toLocaleString("en-IN")}
          </Text>
        </View>
        {deadline ? (
          <Text style={styles.deadline}>
            by {new Date(deadline).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short"
            })}
          </Text>
        ) : null}
      </View>
    </PressScale>
  );
}

export function CampaignCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={70} height={10} />
      <Skeleton width="80%" height={18} style={{ marginTop: spacing.sm }} />
      <Skeleton width="100%" height={12} style={{ marginTop: spacing.sm }} />
      <Skeleton width="60%" height={12} style={{ marginTop: 4 }} />
      <View style={styles.metaRow}>
        <Skeleton width={90} height={28} radius={radii.pill} />
        <Skeleton width={70} height={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    overflow: "hidden",
    ...shadow.card
  },
  ribbon: {
    position: "absolute",
    top: 14,
    right: -28,
    width: 120,
    paddingVertical: 3,
    transform: [{ rotate: "35deg" }],
    backgroundColor: colors.brand.accent,
    alignItems: "center"
  },
  ribbonText: {
    ...typography.overline,
    color: colors.text.primary,
    fontSize: 10
  },
  brand: {
    ...typography.overline,
    color: colors.brand.primary
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.xs
  },
  brief: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    lineHeight: 20
  },
  metaRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  budgetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6
  },
  budgetText: {
    ...typography.bodyStrong,
    color: colors.brand.primary
  },
  deadline: {
    ...typography.caption,
    color: colors.text.muted
  }
});
