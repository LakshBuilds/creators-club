import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { allPhoneCountries, type PhoneCountry } from "../lib/phoneCountries";
import { colors, radii, spacing, typography } from "../theme/tokens";

const POPULAR_ISO = new Set([
  "IN",
  "US",
  "GB",
  "AE",
  "SG",
  "AU",
  "CA",
  "DE",
  "FR",
  "BR",
  "JP",
  "ID",
  "ES",
  "IT",
  "NG",
  "PK",
  "BD"
]);

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (c: PhoneCountry) => void;
  selected: PhoneCountry;
};

export function CountryPickerModal({ visible, onClose, onSelect, selected }: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const all = useMemo(() => allPhoneCountries(), []);

  useEffect(() => {
    if (visible) setQ("");
  }, [visible]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) {
      return [...all].sort((a, b) => {
        const ap = POPULAR_ISO.has(a.iso2) ? 0 : 1;
        const bp = POPULAR_ISO.has(b.iso2) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.name.localeCompare(b.name);
      });
    }
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(t) ||
        c.dial.replace("+", "").includes(t) ||
        c.iso2.toLowerCase().includes(t)
    );
  }, [all, q]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.sheet,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Country or region</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by name, +code, or US"
          placeholderTextColor={colors.text.muted}
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.search}
        />
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.iso2}
          initialNumToRender={20}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSel = item.iso2 === selected.iso2;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.6 },
                  isSel && styles.rowActive
                ]}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <View style={styles.rowMid}>
                  <Text style={styles.cname} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <Text style={styles.dial}>{item.dial}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  title: { ...typography.h2, color: colors.text.primary },
  done: { ...typography.bodyStrong, color: colors.brand.primary },
  search: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    color: colors.text.primary
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    gap: spacing.md
  },
  rowActive: { backgroundColor: colors.brand.primarySoft },
  flag: { fontSize: 24 },
  rowMid: { flex: 1, minWidth: 0 },
  cname: { ...typography.body, color: colors.text.primary },
  dial: { ...typography.bodyStrong, color: colors.brand.primary }
});
