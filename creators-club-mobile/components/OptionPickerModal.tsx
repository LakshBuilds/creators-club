import { Ionicons } from "@expo/vector-icons";
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
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = {
  visible: boolean;
  title: string;
  options: string[];
  selected?: string | null;
  selectedSet?: Set<string>;
  disabledSet?: Set<string>;
  multi?: boolean;
  searchPlaceholder?: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function OptionPickerModal({
  visible,
  title,
  options,
  selected,
  selectedSet,
  disabledSet,
  multi = false,
  searchPlaceholder = "Search",
  onClose,
  onSelect
}: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (visible) setQ("");
  }, [visible]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.toLowerCase().includes(t));
  }, [options, q]);

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
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.lg
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.text.muted}
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.search}
        />
        <FlatList
          data={filtered}
          keyExtractor={(o) => o}
          initialNumToRender={24}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSel = multi
              ? !!selectedSet?.has(item)
              : item === selected;
            const isDisabled = !!disabledSet?.has(item) && !isSel;
            return (
              <Pressable
                onPress={() => {
                  if (isDisabled) return;
                  onSelect(item);
                  if (!multi) onClose();
                }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && !isDisabled && { opacity: 0.6 },
                  isSel && styles.rowActive,
                  isDisabled && { opacity: 0.35 }
                ]}
              >
                <Text style={styles.optText} numberOfLines={1}>
                  {item}
                </Text>
                {isSel ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.brand.primary}
                  />
                ) : null}
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
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    gap: spacing.md
  },
  rowActive: { backgroundColor: colors.brand.primarySoft },
  optText: { ...typography.body, color: colors.text.primary, flex: 1 }
});
