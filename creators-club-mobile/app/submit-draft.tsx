import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { PressScale } from "../components/PressScale";
import { fetchAcceptedApplication, fetchCreatorIdForProfile, submitDraft } from "../lib/campaigns";
import { createLogger } from "../lib/logger";
import { useSession } from "../lib/session";
import { uploadVideoToStorage } from "../lib/storage";
import { summarize, type VideoQuality } from "../lib/video-quality";
import { colors, radii, shadow, spacing, typography } from "../theme/tokens";

const log = createLogger("submit-draft");

type PickedAsset = ImagePicker.ImagePickerAsset;

export default function SubmitDraftScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const params = useLocalSearchParams<{ campaignId?: string; campaignTitle?: string }>();
  const campaignId = typeof params.campaignId === "string" ? params.campaignId : "";
  const campaignTitle =
    typeof params.campaignTitle === "string" ? params.campaignTitle : "this campaign";

  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [quality, setQuality] = useState<VideoQuality | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [eligibleErr, setEligibleErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "picking" | "uploading">(null);
  const [uploadPct, setUploadPct] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const notesInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (!userId || !campaignId) return;
      // applications.creator_id references creators.id, which is a separate
      // ID space from the Supabase auth user id. Resolve it first.
      const { data: cid, error: cidErr } = await fetchCreatorIdForProfile(userId);
      if (!alive) return;
      if (cidErr || !cid) {
        log.warn("creator id lookup failed", cidErr);
        setEligibleErr(
          "We can't find your creator profile yet — connect Instagram from Profile, then try again."
        );
        setLoading(false);
        return;
      }
      const { data, error } = await fetchAcceptedApplication({
        creatorId: cid,
        campaignId
      });
      if (!alive) return;
      if (error) {
        log.warn("eligibility check failed", error);
        setEligibleErr("Couldn't verify you're selected for this campaign.");
      } else if (!data) {
        setEligibleErr("Drafts only open after a brand selects you.");
      } else {
        setApplicationId(data.id);
      }
      setLoading(false);
    }
    void check();
    return () => {
      alive = false;
    };
  }, [userId, campaignId]);

  async function onPickVideo() {
    if (busy) return;
    setBusy("picking");
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow photo & video access to attach your reel.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
        quality: 1
      });
      if (result.canceled || result.assets.length === 0) return;
      const a = result.assets[0];
      setAsset(a);
      setQuality(
        summarize({
          duration: a.duration,
          width: a.width,
          height: a.height,
          fileSize: a.fileSize,
          mimeType: a.mimeType
        })
      );
    } catch (e) {
      log.error("pick failed", e);
      Alert.alert("Couldn't open gallery", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit() {
    if (!applicationId || !asset || !quality) return;
    if (quality.errors.length > 0) {
      Alert.alert("Fix the issues", quality.errors.join("\n"));
      return;
    }
    setBusy("uploading");
    setUploadPct(0);
    try {
      const { url, path, quality: serverQ } = await uploadVideoToStorage({
        localUri: asset.uri,
        applicationId,
        mimeType: asset.mimeType,
        onProgress: setUploadPct
      });
      const { error } = await submitDraft({
        applicationId,
        videoUrl: url,
        storagePath: path,
        notes: notes.trim() || undefined,
        quality: {
          // Client-side picker fields
          durationSec: serverQ?.durationSec ?? quality.durationSec,
          width: serverQ?.width ?? quality.width,
          height: serverQ?.height ?? quality.height,
          sizeBytes: quality.sizeBytes,
          mimeType: quality.mimeType,
          // Server-side ffprobe fields
          fps: serverQ?.fps ?? null,
          codec: serverQ?.codec ?? null,
          bitrateKbps: serverQ?.bitrateKbps ?? null,
          isHdr: serverQ?.isHdr ?? null,
          resolutionClass: serverQ?.resolutionClass ?? null,
          container: serverQ?.container ?? null
        }
      });
      if (error) throw error;
      const specBits: string[] = [];
      if (serverQ?.resolutionClass) specBits.push(serverQ.resolutionClass);
      if (serverQ?.fps != null) specBits.push(`${serverQ.fps} fps`);
      if (serverQ?.codec) specBits.push(serverQ.codec.toUpperCase());
      if (serverQ?.isHdr != null) specBits.push(serverQ.isHdr ? "HDR" : "SDR");
      const specLine = specBits.length ? `\n\nDetected: ${specBits.join(" · ")}` : "";
      Alert.alert(
        "Draft sent",
        `Brand will review and either approve or ask for changes.${specLine}`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e) {
      log.error("submit failed", e);
      Alert.alert("Couldn't submit", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }

  const submitting = busy === "uploading";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Upload draft",
          headerTintColor: colors.text.primary
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <Text style={styles.lead}>
            Upload your cut for <Text style={styles.bold}>{campaignTitle}</Text>. We'll run a quick
            quality check, then send it to the brand for review.
          </Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.brand.primary} />
            </View>
          ) : eligibleErr ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.feedback.dangerFg} />
              <Text style={styles.errorText}>{eligibleErr}</Text>
            </View>
          ) : (
            <>
              <PressScale onPress={onPickVideo} style={styles.pickerCard} disabled={!!busy}>
                <View style={styles.pickerIcon}>
                  <Ionicons
                    name={asset ? "checkmark-circle" : "videocam-outline"}
                    size={28}
                    color={asset ? colors.brand.success : colors.brand.primary}
                  />
                </View>
                <Text style={styles.pickerTitle}>
                  {asset ? "Replace video" : "Pick video from library"}
                </Text>
                <Text style={styles.pickerHint}>
                  {asset
                    ? "Tap to choose a different file."
                    : "MP4 / MOV. Vertical 9:16 looks best."}
                </Text>
              </PressScale>

              {quality ? <QualityCard q={quality} /> : null}

              <Text style={styles.label}>Notes for the brand (optional)</Text>
              <TextInput
                ref={notesInputRef}
                style={[styles.input, styles.textarea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything you want them to look at — alternate hooks, music swap, etc."
                placeholderTextColor={colors.text.muted}
                multiline
                numberOfLines={4}
                editable={!submitting}
                onFocus={() => {
                  // Make sure the multiline notes box ends up above the keyboard on Android,
                  // where KeyboardAvoidingView height behavior alone doesn't always pull it up.
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
                }}
              />

              <PressScale
                onPress={onSubmit}
                disabled={!asset || submitting || (quality?.errors.length ?? 0) > 0}
                style={[
                  styles.cta,
                  (!asset || submitting || (quality?.errors.length ?? 0) > 0) && {
                    opacity: 0.5
                  }
                ]}
              >
                {submitting ? (
                  <View style={styles.uploadingRow}>
                    <ActivityIndicator color={colors.text.onDark} />
                    <Text style={styles.ctaLabel}>Uploading… {Math.round(uploadPct * 100)}%</Text>
                  </View>
                ) : (
                  <Text style={styles.ctaLabel}>Send draft for review</Text>
                )}
              </PressScale>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function QualityCard({ q }: { q: VideoQuality }) {
  return (
    <View style={styles.qualityCard}>
      <View style={styles.qualityHeader}>
        <Ionicons name="analytics-outline" size={18} color={colors.brand.primary} />
        <Text style={styles.qualityTitle}>Quality check</Text>
      </View>
      <View style={styles.qualityGrid}>
        <Stat label="Resolution" value={q.resolutionLabel ?? "—"} />
        <Stat label="Aspect" value={q.aspectLabel ?? "—"} />
        <Stat label="Duration" value={q.durationLabel ?? "—"} />
        <Stat label="Size" value={q.sizeLabel ?? "—"} />
      </View>
      {q.errors.map((e, i) => (
        <View key={`e${i}`} style={[styles.qualityNote, styles.qualityErr]}>
          <Ionicons name="close-circle" size={14} color={colors.feedback.dangerFg} />
          <Text style={[styles.qualityNoteText, { color: colors.feedback.dangerFg }]}>{e}</Text>
        </View>
      ))}
      {q.warnings.map((w, i) => (
        <View key={`w${i}`} style={[styles.qualityNote, styles.qualityWarn]}>
          <Ionicons name="alert-circle" size={14} color={colors.feedback.warnFg} />
          <Text style={[styles.qualityNoteText, { color: colors.feedback.warnFg }]}>{w}</Text>
        </View>
      ))}
      {q.errors.length === 0 && q.warnings.length === 0 ? (
        <View style={[styles.qualityNote, styles.qualityOk]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.brand.success} />
          <Text style={[styles.qualityNoteText, { color: colors.brand.success }]}>
            Looks great — ready to upload.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface.app },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  lead: { ...typography.body, color: colors.text.secondary, lineHeight: 22 },
  bold: { fontWeight: "700", color: colors.text.primary },
  loadingWrap: { paddingVertical: spacing.xl, alignItems: "center" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.feedback.dangerBg
  },
  errorText: { ...typography.body, color: colors.feedback.dangerFg, flex: 1 },
  pickerCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand.primarySoft,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 6,
    ...shadow.card
  },
  pickerIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs
  },
  pickerTitle: { ...typography.h3, color: colors.text.primary },
  pickerHint: { ...typography.caption, color: colors.text.muted, textAlign: "center" },
  qualityCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: spacing.sm
  },
  qualityHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  qualityTitle: { ...typography.bodyStrong, color: colors.text.primary },
  qualityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 4
  },
  statBox: {
    flexBasis: "47%",
    backgroundColor: colors.surface.cardAlt,
    borderRadius: radii.md,
    padding: spacing.sm
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  statValue: { ...typography.bodyStrong, color: colors.text.primary, marginTop: 2 },
  qualityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    paddingVertical: 4
  },
  qualityNoteText: { ...typography.caption, flex: 1 },
  qualityErr: {},
  qualityWarn: {},
  qualityOk: {},
  label: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  cta: {
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    marginTop: spacing.sm
  },
  uploadingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ctaLabel: { ...typography.bodyStrong, color: colors.text.onDark }
});
