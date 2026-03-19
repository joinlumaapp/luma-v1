// PaidMessageModal — bottom sheet for sending a paid first message without matching
// Shows message input + 150 Jeton payment confirmation

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

const PAID_MESSAGE_PRICE = 150;
const MAX_MESSAGE_LENGTH = 300;

interface PaidMessageModalProps {
  visible: boolean;
  receiverId: string;
  receiverName: string;
  onDismiss: () => void;
  onMessageSent: (message: string) => void;
}

type ModalStep = 'compose' | 'confirm';

export const PaidMessageModal: React.FC<PaidMessageModalProps> = ({
  visible,
  receiverId: _receiverId,
  receiverName,
  onDismiss,
  onMessageSent,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const [step, setStep] = useState<ModalStep>('compose');
  const [message, setMessage] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setStep('compose');
      setMessage('');
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 150,
        useNativeDriver: true,
      }).start(() => {
        inputRef.current?.focus();
      });
    } else {
      slideAnim.setValue(400);
    }
  }, [visible, slideAnim]);

  const handleNext = () => {
    if (message.trim().length === 0) return;
    setStep('confirm');
  };

  const handleConfirmSend = () => {
    onMessageSent(message.trim());
  };

  const handleBackToCompose = () => {
    setStep('compose');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing.md, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {step === 'compose' ? (
            <>
              {/* Icon */}
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>{'\u2709\uFE0F'}</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>1 Mesaj Gönder</Text>
              <Text style={styles.subtitle}>
                {receiverName} adlı kullanıcıya eşleşmeden mesaj gönder
              </Text>

              {/* Message input */}
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Mesajını yaz..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  maxLength={MAX_MESSAGE_LENGTH}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </Text>
              </View>

              {/* Price hint */}
              <View style={styles.priceHint}>
                <Text style={styles.priceHintText}>
                  Bu mesaj {PAID_MESSAGE_PRICE} Jeton karşılığında gönderilir
                </Text>
              </View>

              {/* Send button */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  message.trim().length === 0 && styles.sendButtonDisabled,
                ]}
                onPress={handleNext}
                activeOpacity={0.8}
                disabled={message.trim().length === 0}
              >
                <Text style={[
                  styles.sendButtonText,
                  message.trim().length === 0 && styles.sendButtonTextDisabled,
                ]}>
                  Devam Et
                </Text>
              </TouchableOpacity>

              {/* Dismiss */}
              <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.7}>
                <Text style={styles.dismissText}>Vazgeç</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Confirmation step */}
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>{'\uD83D\uDCB3'}</Text>
              </View>

              <Text style={styles.title}>Ödeme Onayı</Text>
              <Text style={styles.subtitle}>
                Bu kişiye eşleşmeden mesaj göndermek için {PAID_MESSAGE_PRICE} Jeton ödeyerek mesaj gönderebilirsin.
              </Text>

              {/* Message preview */}
              <View style={styles.messagePreview}>
                <Text style={styles.messagePreviewLabel}>MESAJIN:</Text>
                <Text style={styles.messagePreviewText} numberOfLines={3}>
                  {message}
                </Text>
              </View>

              {/* Price breakdown */}
              <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>1 Mesaj Gönder</Text>
                  <Text style={styles.priceValue}>{PAID_MESSAGE_PRICE} Jeton</Text>
                </View>
              </View>

              {/* Confirm button */}
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmSend}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>
                  Mesaj Gönder ({PAID_MESSAGE_PRICE} Jeton)
                </Text>
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleBackToCompose}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissText}>İptal</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + '25',
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
    lineHeight: 22,
  },
  // ── Message input ──────────────────────────────
  inputContainer: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.sm,
    minHeight: 100,
  },
  input: {
    ...typography.body,
    color: colors.text,
    padding: spacing.md,
    minHeight: 80,
    maxHeight: 140,
  },
  charCount: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    textAlign: 'right',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  // ── Price hint ──────────────────────────────────
  priceHint: {
    alignSelf: 'stretch',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  priceHintText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  // ── Buttons ──────────────────────────────────────
  sendButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.glow,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    ...typography.button,
    color: colors.text,
  },
  sendButtonTextDisabled: {
    color: colors.textTertiary,
  },
  dismissButton: {
    paddingVertical: spacing.md,
  },
  dismissText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // ── Confirmation step ──────────────────────────
  messagePreview: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  messagePreviewLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    includeFontPadding: false,
    marginBottom: spacing.xs,
  },
  messagePreviewText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  priceCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  priceValue: {
    ...typography.h3,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  confirmButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.glow,
  },
  confirmButtonText: {
    ...typography.button,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});
