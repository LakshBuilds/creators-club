import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors, radii, spacing, typography } from "../../theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.text.onDark,
        tabBarInactiveTintColor: "rgba(255,255,255,0.7)",
        tabBarShowLabel: true,
        tabBarLabelStyle: { ...typography.caption, fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          position: "absolute",
          left: spacing.lg,
          right: spacing.lg,
          bottom: spacing.lg,
          marginHorizontal: spacing.lg,
          borderRadius: radii.pill,
          backgroundColor: colors.brand.primary,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 8,
          shadowColor: colors.dark.surface,
          shadowOpacity: 0.2,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 }
        },
        headerStyle: { backgroundColor: colors.surface.app },
        headerShadowVisible: false,
        headerTitleStyle: { ...typography.h2, color: colors.text.primary }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: "Campaigns",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "megaphone" : "megaphone-outline"} size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="ideas"
        options={{
          title: "Ideas",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "bulb" : "bulb-outline"} size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="ai-helper"
        options={{
          title: "AI Helper",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          )
        }}
      />
    </Tabs>
  );
}
