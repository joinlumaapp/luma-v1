// AccountDeletionScreen — Full account deletion flow with reason selection,
// OTP confirmation, and 30-day recovery period info.
// GDPR-compliant: 30-day soft delete window

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { useScreenTracking } from '../../hooks/useAnalytics';

// ── Constants ────────────────────────────────────────────────────
const DELETION_REASONS = [
  { key: 'found_someone', label: 'Birini buldum' },
  { key: 'taking_break', label: 'Mola veriyorum' },
  { key: 'dont_like_app', label: 'Uygulamayi begenmedim' },
  { key: 'other', label: 'Diger' },
] as const;

type DeletionReasonKey = typeof DELETION_REASONS[number]['key'];

type Step = 'reason' | 'confirm_otp' | 'final';

export const AccountDeletionScreen: React.FC = () => {
  useScreenTracking('AccountDeletion');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const logout = useAuthStore((state) => state.logout);

  const [step, setStep] = useState<Step>('reason');
  const [selectedReason, setSelectedReason] = useState<DeletionReasonKey | null>(null);
  const [otherReason, setOtherReason] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const canProceedFromReason = selectedReason !== null &&
    (selectedReason !== 'other' || otherReason.trim().length > 0);

  const handleSendOtp = useCallback(async () => {
    setIsSendingOtp(true);
    try {
      const user = useAuthStore.getState().user;
      if (!user?.phone) {
        Alert.alert('Hata', 'Telefon numarası bulunamadı.');
        return;
      }
      // Re-use the existing register endpoint to send an OTP to the user's phone
      await authService.register(user.phone, '+90');
      setOtpSent(true);
      setStep('confirm_otp');
    } catch {
      Alert.alert('Hata', 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSendingOtp(false);
    }
  }, []);

  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const handleVerifyAndShowFinal = useCallback(async () => {
    if (otpCode.length < 6) {
      Alert.alert('Hata', 'Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const user = useAuthStore.getState().user;
      if (!user?.phone) {
        Alert.alert('Hata', 'Telefon numarası bulunamadı.');
        return;
      }
      // Verify the OTP code through the SMS verification endpoint
      const result = await authService.verifySms(user.phone, otpCode);
      if (!result.verified) {
        Alert.alert('Hata', 'Doğrulama kodu yanlış. Lütfen tekrar deneyin.');
        return;
      }
      setShowFinalModal(true);
    } catch {
      if (__DEV__) {
        // Allow proceeding in development mode for testing
        console.warn('OTP dogrulama basarisiz, gelistirme modunda devam ediliyor');
        setShowFinalModal(true);
        return;
      }
      Alert.alert('Hata', 'Doğrulama kodu doğrulanamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsVerifyingOtp(false);
    }
  }, [otpCode]);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    try {
      await authService.deleteAccount();
      setShowFinalModal(false);
      logout();
    } catch {
      Alert.alert('Hata', 'Hesap silinemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsDeleting(false);
    }
  }, [logout]);

  const renderReasonStep = () => (
    <ScrollView
      style={dynamicStyles.scrollContent}
      contentContainerStyle={staticStyles.scrollInner}
      showsVerticalScrollIndicator={false}
    >
      {/* Warning banner */}
      <View style={dynamicStyles.warningBanner}>
        <View style={dynamicStyles.warningIconCircle}>
          <Ionicons name="warning" size={24} color={colors.error} />
        </View>
        <Text style={dynamicStyles.warningTitle}>Hesabinizi silmek uzeresiniz</Text>
        <Text style={dynamicStyles.warningText}>
          Hesabinizi sildiginizde tum verileriniz, eslesmeleriniz, sohbetleriniz ve
          profiliniz kalici olarak silinecektir.
        </Text>
      </View>

      {/* 30-day info */}
      <View style={dynamicStyles.infoCard}>
        <Ionicons name="time-outline" size={20} color={colors.primary} />
        <View style={dynamicStyles.infoTextContainer}>
          <Text style={dynamicStyles.infoTitle}>30 Gun Kurtarma Suresi</Text>
          <Text style={dynamicStyles.infoText}>
            Hesabiniz silindikten sonra 30 gun icinde tekrar giris yaparak
            hesabinizi kurtarabilirsiniz. Bu sure dolduktan sonra tum veriler
            kalici olarak silinir.
          </Text>
        </View>
      </View>

      {/* Reason selection */}
      <Text style={dynamicStyles.sectionLabel}>SILME NEDENINIZ</Text>
      {DELETION_REASONS.map((reason) => {
        const isSelected = selectedReason === reason.key;
        return (
          <TouchableOpacity
            key={reason.key}
            style={[
              dynamicStyles.reasonOption,
              isSelected && dynamicStyles.reasonOptionSelected,
            ]}
            onPress={() => setSelectedReason(reason.key)}
            activeOpacity={0.7}
          >
            <View style={[
              dynamicStyles.radioOuter,
              isSelected && dynamicStyles.radioOuterSelected,
            ]}>
              {isSelected && <View style={dynamicStyles.radioInner} />}
            </View>
            <Text style={[
              dynamicStyles.reasonText,
              isSelected && dynamicStyles.reasonTextSelected,
            ]}>
              {reason.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Other reason text input */}
      {selectedReason === 'other' && (
        <TextInput
          style={dynamicStyles.otherInput}
          placeholder="Nedeninizi yazin..."
          placeholderTextColor={colors.textTertiary}
          value={otherReason}
          onChangeText={setOtherReason}
          multiline
          maxLength={500}
        />
      )}

      {/* Continue button */}
      <TouchableOpacity
        style={[
          dynamicStyles.primaryButton,
          !canProceedFromReason && dynamicStyles.primaryButtonDisabled,
        ]}
        onPress={handleSendOtp}
        disabled={!canProceedFromReason || isSendingOtp}
        activeOpacity={0.7}
      >
        {isSendingOtp ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={dynamicStyles.primaryButtonText}>Devam Et</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderOtpStep = () => (
    <ScrollView
      style={dynamicStyles.scrollContent}
      contentContainerStyle={staticStyles.scrollInner}
      showsVerticalScrollIndicator={false}
    >
      <View style={dynamicStyles.otpContainer}>
        <View style={dynamicStyles.otpIconCircle}>
          <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
        </View>
        <Text style={dynamicStyles.otpTitle}>Kimlik Dogrulama</Text>
        <Text style={dynamicStyles.otpSubtitle}>
          Telefon numaraniza gonderilen 6 haneli dogrulama kodunu girin.
        </Text>

        <TextInput
          style={dynamicStyles.otpInput}
          placeholder="000000"
          placeholderTextColor={colors.textTertiary}
          value={otpCode}
          onChangeText={setOtpCode}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        {otpSent && (
          <TouchableOpacity
            style={dynamicStyles.resendButton}
            onPress={handleSendOtp}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.resendText}>Kodu tekrar gonder</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            dynamicStyles.deleteButton,
            (otpCode.length < 6 || isVerifyingOtp) && dynamicStyles.primaryButtonDisabled,
          ]}
          onPress={handleVerifyAndShowFinal}
          disabled={otpCode.length < 6 || isVerifyingOtp}
          activeOpacity={0.7}
        >
          {isVerifyingOtp ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={dynamicStyles.deleteButtonText}>Dogrula ve Devam Et</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'confirm_otp') {
              setStep('reason');
              setOtpCode('');
            } else {
              navigation.goBack();
            }
          }}
          style={dynamicStyles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Hesabi Sil</Text>
        <View style={staticStyles.headerSpacer} />
      </View>

      {step === 'reason' ? renderReasonStep() : renderOtpStep()}

      {/* Final confirmation modal */}
      <Modal
        visible={showFinalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFinalModal(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContainer}>
            <View style={dynamicStyles.modalIconCircle}>
              <Ionicons name="alert-circle" size={32} color={colors.error} />
            </View>
            <Text style={dynamicStyles.modalTitle}>Son Uyari!</Text>
            <Text style={dynamicStyles.modalMessage}>
              Bu islem geri alinamaz. Hesabiniz 30 gun icinde kurtarilmazsa
              tum verileriniz kalici olarak silinecektir.
            </Text>

            <View style={staticStyles.modalActions}>
              <TouchableOpacity
                style={dynamicStyles.modalCancelButton}
                onPress={() => setShowFinalModal(false)}
                disabled={isDeleting}
              >
                <Text style={dynamicStyles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={dynamicStyles.modalDeleteButton}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={dynamicStyles.modalDeleteText}>HESABIMI SIL</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Static styles ───────────────────────────────────────────────
const staticStyles = StyleSheet.create({
  headerSpacer: {
    width: 40,
  },
  scrollInner: {
    paddingBottom: spacing.xxl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
});

// ── Dynamic styles factory ──────────────────────────────────────
function createDynamicStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      height: layout.headerHeight,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    headerTitle: {
      ...typography.bodyLarge,
      color: c.text,
      fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600',
      includeFontPadding: false,
    },
    scrollContent: {
      flex: 1,
      paddingHorizontal: spacing.md,
    },

    // Warning banner
    warningBanner: {
      backgroundColor: c.error + '0A',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.error + '20',
      padding: spacing.lg,
      alignItems: 'center',
      marginBottom: spacing.lg,
      marginTop: spacing.sm,
    },
    warningIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.error + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    warningTitle: {
      ...typography.bodyLarge,
      color: c.error,
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700',
      marginBottom: spacing.sm,
      textAlign: 'center',
      includeFontPadding: false,
    },
    warningText: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      includeFontPadding: false,
    },

    // Info card
    infoCard: {
      flexDirection: 'row',
      backgroundColor: c.primary + '0A',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.primary + '20',
      padding: spacing.md,
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    infoTextContainer: {
      flex: 1,
    },
    infoTitle: {
      ...typography.bodySmall,
      color: c.primary,
      fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600',
      marginBottom: 4,
      includeFontPadding: false,
    },
    infoText: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 18,
      includeFontPadding: false,
    },

    // Section label
    sectionLabel: {
      ...typography.caption,
      color: c.textTertiary,
      fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
      letterSpacing: 0.5,
      includeFontPadding: false,
    },

    // Reason option
    reasonOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: c.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    reasonOptionSelected: {
      borderColor: c.error + '40',
      backgroundColor: c.error + '06',
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.surfaceBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioOuterSelected: {
      borderColor: c.error,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: c.error,
    },
    reasonText: {
      ...typography.body,
      color: c.text,
      includeFontPadding: false,
    },
    reasonTextSelected: {
      fontFamily: 'Poppins_500Medium',
      fontWeight: '500',
    },

    // Other input
    otherInput: {
      backgroundColor: c.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      ...typography.body,
      color: c.text,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: spacing.lg,
      includeFontPadding: false,
    },

    // Primary button (red for deletion flow)
    primaryButton: {
      backgroundColor: c.error,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    primaryButtonDisabled: {
      opacity: 0.4,
    },
    primaryButtonText: {
      ...typography.button,
      color: '#FFFFFF',
      includeFontPadding: false,
    },

    // OTP step
    otpContainer: {
      alignItems: 'center',
      paddingTop: spacing.xl,
    },
    otpIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    otpTitle: {
      ...typography.h4,
      color: c.text,
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700',
      marginBottom: spacing.sm,
      includeFontPadding: false,
    },
    otpSubtitle: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.md,
      includeFontPadding: false,
    },
    otpInput: {
      backgroundColor: c.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...typography.h3,
      color: c.text,
      textAlign: 'center',
      letterSpacing: 8,
      width: '80%',
      includeFontPadding: false,
    },
    resendButton: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
    },
    resendText: {
      ...typography.bodySmall,
      color: c.primary,
      fontFamily: 'Poppins_500Medium',
      fontWeight: '500',
      includeFontPadding: false,
    },
    deleteButton: {
      backgroundColor: c.error,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xl,
      width: '80%',
    },
    deleteButtonText: {
      ...typography.button,
      color: '#FFFFFF',
      includeFontPadding: false,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    modalContainer: {
      backgroundColor: c.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
    },
    modalIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.error + '12',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    modalTitle: {
      ...typography.h4,
      color: c.error,
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700',
      marginBottom: spacing.md,
      textAlign: 'center',
      includeFontPadding: false,
    },
    modalMessage: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
      lineHeight: 22,
      includeFontPadding: false,
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: c.surfaceLight,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    modalCancelText: {
      ...typography.button,
      color: c.text,
      includeFontPadding: false,
    },
    modalDeleteButton: {
      flex: 1,
      backgroundColor: c.error,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    modalDeleteText: {
      ...typography.button,
      color: '#FFFFFF',
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700',
      includeFontPadding: false,
    },
  });
}
