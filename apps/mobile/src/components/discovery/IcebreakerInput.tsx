// IcebreakerInput — Floating comment input overlay
// Appears when user taps on a photo or prompt in ProfilePreviewScreen
// Sends like + icebreaker message together in one action
// Keyboard-aware positioning, dismiss on background tap

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette, glassmorphism } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import type { IcebreakerTargetType } from '@luma/shared';

const MAX_CHARS = 300;

export interface IcebreakerTarget {
  type: IcebreakerTargetType;
  /** Photo URL (for photo targets) or prompt ID (for prompt targets) */
  targetId: string;
  /** Preview image URL (photo thumbnail) */
  previewImageUrl?: string;
  /** Prompt question text */
  promptQuestion?: string;
  /** Prompt answer text */
  promptAnswer?: string;
}

interface IcebreakerInputProps {
  visible: boolean;
  target: IcebreakerTarget | null;
  /** User's name (for placeholder text) */
  profileName: string;
  onSend: (message: string, target: IcebreakerTarget) => void;
  onDismiss: () => void;
}

export const IcebreakerInput: React.FC<IcebreakerInputProps> = ({
  visible,
  target,
  profileName,
  onSend,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  // Animate in/out
  useEffect(() => {
    if (visible) {
      setText('');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Focus input after animation
        setTimeout(() => inputRef.current?.focus(), 100);
      });
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || !target) return;
    Keyboard.dismiss();
    onSend(trimmed, target);
    setText('');
  }, [text, target, onSend]);

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  if (!visible || !target) return null;

  const isPhoto = target.type === 'photo';
  const placeholderText = isPhoto
    ? `Bu fotograf hakkinda bir sey yaz...`
    : `Bu yanita yorum yap...`;
  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSend = text.trim().length > 0 && !isOverLimit;

  return (
    <Animated.View
      style={[styles.overlay, { opacity: fadeAnim }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Backdrop — dismiss on tap */}
      <Pressable style={styles.backdrop} onPress={handleDismiss} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[
            styles.inputContainer,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: insets.bottom + spacing.sm,
            },
          ]}
        >
          {/* Target preview — shows what the comment is about */}
          <View style={styles.targetPreview}>
            {isPhoto && target.previewImageUrl && (
              <Image
                source={{ uri: target.previewImageUrl }}
                style={styles.targetThumbnail}
                resizeMode="cover"
              />
            )}
            {!isPhoto && (
              <View style={styles.targetPromptPreview}>
                <Ionicons name="chatbox-ellipses-outline" size={14} color={palette.gold[600]} />
              </View>
            )}
            <View style={styles.targetTextContainer}>
              <Text style={styles.targetLabel} numberOfLines={1}>
                {isPhoto ? `${profileName} - Fotograf` : target.promptQuestion ?? 'Prompt'}
              </Text>
              {!isPhoto && target.promptAnswer && (
                <Text style={styles.targetAnswer} numberOfLines={1}>
                  {target.promptAnswer}
                </Text>
              )}
            </View>
            <Pressable
              onPress={handleDismiss}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Input row */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder={placeholderText}
              placeholderTextColor={colors.textTertiary}
              value={text}
              onChangeText={setText}
              maxLength={MAX_CHARS + 10} // Soft limit with visual warning
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="default"
              blurOnSubmit={false}
              accessibilityLabel="Icebreaker mesaji yaz"
            />

            {/* Send button */}
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              accessibilityLabel="Begeni ve mesaj gonder"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={
                  canSend
                    ? (['#D4AF37', '#B8860B'] as [string, string])
                    : (['#E8E0D4', '#D1C9BD'] as [string, string])
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButtonGradient}
              >
                <Ionicons
                  name="heart"
                  size={14}
                  color={canSend ? '#FFFFFF' : colors.textTertiary}
                />
                <Ionicons
                  name="send"
                  size={12}
                  color={canSend ? '#FFFFFF' : colors.textTertiary}
                />
              </LinearGradient>
            </Pressable>
          </View>

          {/* Character counter */}
          <View style={styles.counterRow}>
            <Text style={styles.hintText}>
              Begeni + mesaj birlikte gonderilir
            </Text>
            <Text
              style={[
                styles.charCounter,
                isOverLimit && styles.charCounterOver,
              ]}
            >
              {charCount}/{MAX_CHARS}
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  keyboardAvoid: {
    justifyContent: 'flex-end',
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },

  // ── Target preview ──
  targetPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  targetThumbnail: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
  },
  targetPromptPreview: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: glassmorphism.bgLight,
    borderWidth: 1,
    borderColor: glassmorphism.borderGold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetTextContainer: {
    flex: 1,
    gap: 2,
  },
  targetLabel: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  targetAnswer: {
    fontSize: 12,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Input row ──
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    fontSize: 15,
    fontWeight: fontWeights.regular,
    color: colors.text,
    maxHeight: 100,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sendButton: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },

  // ── Counter row ──
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  hintText: {
    fontSize: 11,
    fontWeight: fontWeights.regular,
    color: colors.textTertiary,
  },
  charCounter: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
  },
  charCounterOver: {
    color: colors.error,
  },
});
