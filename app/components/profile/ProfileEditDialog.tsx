import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PressableScale } from '../motion';
import theme, { scale } from '../../theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  scrollable?: boolean;
  children: ReactNode;
};

export function ProfileEditDialog({
  visible,
  title,
  onClose,
  onSave,
  saving = false,
  saveLabel = 'Save',
  scrollable = false,
  children,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, scrollable && styles.cardScrollable]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {scrollable ? (
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}

          <View style={styles.actions}>
            <PressableScale style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </PressableScale>
            <PressableScale
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.white} size="small" />
              ) : (
                <Text style={styles.saveText}>{saveLabel}</Text>
              )}
            </PressableScale>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.component.screenPaddingHorizontal,
  },
  card: {
    width: '100%',
    maxWidth: theme.component.dialogMaxWidth,
    backgroundColor: theme.colors.white,
    borderRadius: scale(4),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    paddingHorizontal: theme.component.dialogPadding,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.component.dialogPadding,
  },
  cardScrollable: {
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.component.dialogSectionGap,
  },
  title: {
    fontFamily: theme.fonts.header,
    fontSize: scale(18),
    letterSpacing: scale(-0.4),
    color: theme.colors.textPrimary,
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  close: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(16),
    color: theme.colors.textMuted,
  },
  body: {
    marginBottom: theme.component.dialogSectionGap,
  },
  bodyScroll: {
    flexGrow: 0,
    marginBottom: theme.component.dialogSectionGap,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.component.buttonGap,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    borderRadius: scale(4),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(44),
  },
  cancelText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.6),
    textTransform: 'uppercase',
    color: theme.colors.textPrimary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    borderRadius: scale(4),
    backgroundColor: theme.colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(44),
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.6),
    textTransform: 'uppercase',
    color: theme.colors.white,
  },
});
