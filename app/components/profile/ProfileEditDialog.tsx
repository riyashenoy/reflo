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
    borderRadius: theme.radius.lg,
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
    ...theme.typography.mediumHeader,
    fontFamily: theme.fonts.header,
    fontSize: scale(17),
    color: theme.colors.textPrimary,
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  close: {
    fontSize: scale(16),
    color: theme.colors.textSecondary,
    fontWeight: '600',
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
    paddingVertical: theme.component.buttonPaddingVertical,
    paddingHorizontal: theme.component.buttonPaddingHorizontal,
    borderRadius: theme.radius.full,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.component.buttonMinHeight,
  },
  cancelText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textPrimary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: theme.component.buttonPaddingVertical,
    paddingHorizontal: theme.component.buttonPaddingHorizontal,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.component.buttonMinHeight,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
});
