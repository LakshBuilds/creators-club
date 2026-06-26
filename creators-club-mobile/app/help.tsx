import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Divider, Row, Section, settingsStyles } from "../components/SettingsRow";
import { colors, typography } from "../theme/tokens";

const SUPPORT_EMAIL = "support@buyhatke.com";
const HELP_CENTRE_URL = "https://hatkecreators.netlify.app/help";

export default function HelpScreen() {
  function onReportProblem() {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=Report%20a%20problem&body=Describe%20what%20went%20wrong%3A%0A%0A`
    ).catch(() => {});
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Help",
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
              icon="alert-circle-outline"
              label="Report a problem"
              hint={`Email us at ${SUPPORT_EMAIL}`}
              onPress={onReportProblem}
            />
            <Divider />
            <Row
              icon="help-circle-outline"
              label="Help centre"
              hint="Browse guides and FAQs"
              onPress={() => WebBrowser.openBrowserAsync(HELP_CENTRE_URL)}
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
