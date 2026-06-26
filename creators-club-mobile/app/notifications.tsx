import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabSwitch } from "../components/TabSwitch";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Filter = "all" | "activity" | "alert";

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Notifications",
          headerTintColor: colors.brand.primary,
          headerStyle: { backgroundColor: colors.surface.app },
          headerTitleStyle: { ...typography.h2, color: colors.brand.primary },
          headerShadowVisible: false
        }}
      />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <TabSwitch
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All" },
            { id: "activity", label: "Activity" },
            { id: "alert", label: "Alert" }
          ]}
        />

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={40} color={colors.brand.primary} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              When brands post new campaigns or your submissions change status, you will see them
              here.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.app },
  scroll: { paddingBottom: spacing.xxxl, paddingTop: spacing.md },
  empty: { alignItems: "center", paddingHorizontal: spacing.xxl, marginTop: spacing.xxxl },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg
  },
  emptyTitle: { ...typography.h3, color: colors.text.primary, textAlign: "center" },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22
  }
});
