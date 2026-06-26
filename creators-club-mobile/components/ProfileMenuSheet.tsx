import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../lib/session";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Path = "/edit-profile" | "/wallet" | "/account" | "/help" | "/about";

export function ProfileMenuSheet({ visible, onClose }: Props) {
  const { signOut } = useSession();
  // Read insets here, not inside the Modal — Modal renders into its own native
  // window where the SafeAreaProvider context is lost and SafeAreaView returns
  // 0. Reading at the parent (which IS inside SafeAreaProvider) gives us
  // accurate top inset including dynamic-island padding on iPhone 14/15/16 Pro.
  const insets = useSafeAreaInsets();

  function go(path: Path) {
    onClose();
    router.push(path);
  }

  function onLogout() {
    onClose();
    Alert.alert("Log out?", "You will need to log in again to use the app.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut() }
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.sheet,
              {
                paddingTop: insets.top + spacing.md,
                paddingRight: insets.right,
                paddingBottom: insets.bottom + spacing.md
              }
            ]}
          >
            <View style={styles.handle}>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </Pressable>
            </View>
            <Row icon="person-circle-outline" label="Edit profile" onPress={() => go("/edit-profile")} />
            <Row icon="wallet-outline" label="Wallet" onPress={() => go("/wallet")} />
            <Row icon="settings-outline" label="Account" onPress={() => go("/account")} />
            <Row icon="help-circle-outline" label="Help" onPress={() => go("/help")} />
            <Row icon="information-circle-outline" label="About" onPress={() => go("/about")} />
            <Row icon="log-out-outline" label="Log out" onPress={onLogout} destructive />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  icon,
  label,
  onPress,
  destructive
}: {
  icon: keyof typeof import("@expo/vector-icons/build/Ionicons").default.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const tint = destructive ? colors.feedback.dangerFg : colors.text.primary;
  const iconBg = destructive ? colors.feedback.dangerBg : colors.surface.chip;
  const iconFg = destructive ? colors.feedback.dangerFg : colors.brand.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconFg} />
      </View>
      <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
    alignItems: "flex-end"
  },
  sheetWrap: {
    width: "78%",
    maxWidth: 360,
    height: "100%"
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md
  },
  handle: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingBottom: spacing.sm
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.chip,
    alignItems: "center",
    justifyContent: "center"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  rowLabel: {
    flex: 1,
    ...typography.bodyStrong
  }
});
