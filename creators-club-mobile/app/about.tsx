import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Divider, Row, Section, settingsStyles } from "../components/SettingsRow";
import { LEGAL_LINKS } from "../lib/legalLinks";
import { colors, typography } from "../theme/tokens";

export default function AboutScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "About",
          headerTintColor: colors.brand.primary,
          headerStyle: { backgroundColor: colors.surface.app },
          headerTitleStyle: { ...typography.h2, color: colors.brand.primary },
          headerShadowVisible: false
        }}
      />
      <SafeAreaView style={settingsStyles.safe} edges={["bottom"]}>
        <ScrollView contentContainerStyle={settingsStyles.content}>
          <Section>
            <Row
              icon="document-text-outline"
              label="Privacy Policy"
              hint="How we collect and use your data"
              onPress={() => WebBrowser.openBrowserAsync(LEGAL_LINKS.privacy)}
            />
            <Divider />
            <Row
              icon="reader-outline"
              label="Terms of Service"
              hint="The rules of using Creators Club"
              onPress={() => WebBrowser.openBrowserAsync(LEGAL_LINKS.terms)}
            />
            <Divider />
            <Row
              icon="shield-checkmark-outline"
              label="Data deletion"
              hint="Check the status of a deletion request"
              onPress={() => WebBrowser.openBrowserAsync(LEGAL_LINKS.dataDeletion)}
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
