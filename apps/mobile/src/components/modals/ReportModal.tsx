// Report modal — bottom sheet with report reasons

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';

interface ReportModalProps {
  visible: boolean;
  userId: string;
  userName: string;
  onSubmit: (reason: string, details: string) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

interface ReportReason {
  id: string;
  label: string;
}

const REPORT_REASONS: ReportReason[] = [
  { id: 'spam', label: 'Spam' },
  { id: 'inappropriate_photo', label: 'Uygunsuz Fotoğraflar' },
  { id: 'harassment', label: 'Taciz' },
  { id: 'underage', label: 'Yaş Sınırı İhlali' },
  { id: 'fake_profile', label: 'Sahte Profil' },
  { id: 'scam', label: 'Dolandırıcılık' },
  { id: 'other', label: 'Diğer' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  userName,
  onSubmit,
  onClose,
  isSubmitting = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  const handleSubmit = useCallback(() => {
    if (!selectedReason) return;
    onSubmit(selectedReason, details.trim());
  }, [selectedReason, details, onSubmit]);

  const handleClose = useCallback(() => {
    setSelectedReason(null);
    setDetails('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Title */}
          <Text style={styles.title}>{userName} Adlı Kullanıcıyı Şikayet Et</Text>
          <Text style={styles.subtitle}>
            Lütfen şikayet nedenini seçin. Raporunuz gizli tutulacaktır.
          </Text>

          {/* Reasons */}
          <ScrollView
            style={styles.reasonsList}
            showsVerticalScrollIndicator={false}
          >
            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReason === reason.id;
              return (
                <TouchableOpacity
                  key={reason.id}
                  style={[styles.reasonItem, isSelected && styles.reasonItemActive]}
                  onPress={() => setSelectedReason(reason.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reasonRadio}>
                    {isSelected && <View style={styles.reasonRadioInner} />}
                  </View>
                  <Text
                    style={[
                      styles.reasonLabel,
                      isSelected && styles.reasonLabelActive,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Optional details */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Ek Açıklama (İsteğe Bağlı)</Text>
              <TextInput
                style={styles.detailsInput}
                value={details}
                onChangeText={setDetails}
                placeholder="Detayları buraya yazabilirsiniz..."
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedReason || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.submitButtonText}>Şikayet Et</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
    ...shadows.large,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  reasonsList: {
    maxHeight: 400,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  reasonItemActive: {
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  reasonRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  reasonLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  reasonLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },
  detailsSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  detailsLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  detailsInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 100,
  },
  submitButton: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.text,
  },
});
