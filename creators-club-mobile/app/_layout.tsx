import { Pacifico_400Regular, useFonts } from "@expo-google-fonts/pacifico";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BuyhatkeSessionProvider } from "../lib/buyhatkeSession";
import { createLogger } from "../lib/logger";
import { SessionProvider, useSession } from "../lib/session";
import { colors } from "../theme/tokens";

const log = createLogger("root");

const globalErrorUtils = (globalThis as { ErrorUtils?: {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (h: (error: Error, isFatal?: boolean) => void) => void;
} }).ErrorUtils;

if (globalErrorUtils) {
  const prev = globalErrorUtils.getGlobalHandler();
  globalErrorUtils.setGlobalHandler((error, isFatal) => {
    log.error("uncaught", { isFatal, error });
    prev?.(error, isFatal);
  });
}

const onUnhandledRejection = (e: unknown) => {
  const reason = (e as { reason?: unknown })?.reason ?? e;
  log.error("unhandledRejection", reason);
};
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("unhandledrejection", onUnhandledRejection as EventListener);
}

function AuthGate() {
  const { session, loading, onboarding } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const top = segments[0];
    const inAuthGroup = top === "(auth)";
    const inOnboardingGroup = top === "(onboarding)";

    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/sign-in");
      return;
    }

    if (onboarding === "needed" && !inOnboardingGroup) {
      router.replace("/(onboarding)/personal-details");
      return;
    }

    if (onboarding === "done" && (inAuthGroup || inOnboardingGroup)) {
      router.replace("/(tabs)");
    }
  }, [session, loading, onboarding, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface.app
        }}
      >
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  // Session exists but profile/onboarding row not loaded yet (runs after auth, no longer blocks getSession)
  if (session && onboarding === "unknown") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface.app
        }}
      >
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Pacifico_400Regular });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {fontsLoaded ? (
          <SessionProvider>
            <BuyhatkeSessionProvider>
              <AuthGate />
            </BuyhatkeSessionProvider>
          </SessionProvider>
        ) : (
          // Hold the splash until the brand font finishes loading. Without
          // this gate the wordmark would briefly render in the system font
          // and pop into the script font on the next frame.
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface.app
            }}
          >
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
