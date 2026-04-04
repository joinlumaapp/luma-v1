// MatchPromptModal — triggered when user interacts with the same person 3+ times
// "Bu kişiye ilgi duyuyor gibisin 👀 Flört başlat?"
// Animated modal with user info, Start Flirt CTA, and dismiss

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

interface MatchPromptModalProps {
  visible: boolean;
  userName: string;
  userAvatarUrl: string;
  compatibilityScore: number;
  onStartFlirt: () => void;
  onDismiss: () => void;
}

export const MatchPromptModal: React.FC<MatchPromptModalProps> = ({
  visible,
  userName,
  userAvatarUrl,
  compatibilityScore,
  onStartFlirt,
  onDismiss,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <StatusBar style="light" backgroundColor="#08080F" />
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* User avatar with flirt ring */}
          <View style={styles.avatarRing}>
            <Image source={{ uri: userAvatarUrl }} style={styles.avatar} />
            <View style={styles.flirtBadge}>
              <Text style={styles.flirtBadgeEmoji}>{'\uD83D\uDD25'}</Text>
            </View>
          </View>

          {/* Title — eyes emoji inline */}
          <Text style={styles.title}>
            <Text style={styles.titleName}>{userName}</Text> ile ilgileniyorsun {'\uD83D\uDC40'}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Bu kişiyle 3 kez etkileşime geçtin.{'\n'}
            Bir adım at ve flört başlat!
          </Text>

          {/* Compatibility badge */}
          {compatibilityScore > 0 && (
            <View style={styles.compatBadge}>
              <Ionicons name="heart" size={12} color={palette.purple[400]} />
              <Text style={styles.compatText}>%{compatibilityScore} Uyum</Text>
            </View>
          )}

          {/* Start Flirt CTA */}
          <TouchableOpacity
            style={styles.flirtButton}
            onPress={onStartFlirt}
            activeOpacity={0.8}
          >
            <Ionicons name="flame" size={22} color="#FFFFFF" />
            <Text style={styles.flirtButtonText}>Flört Başlat</Text>
          </TouchableOpacity>

          {/* Dismiss link */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>Şimdilik Değil</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#FF6B0025',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.surfaceLight,
  },
  flirtBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  flirtBadgeEmoji: {
    fontSize: 14,
  },
  title: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  titleName: {
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FF6B00',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  compatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.purple[400] + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    marginBottom: spacing.lg,
  },
  compatText: {
    fontSize: 12,
    color: palette.purple[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  flirtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B00',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    width: '100%',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: spacing.sm,
  },
  flirtButtonText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  dismissButton: {
    paddingVertical: spacing.sm,
  },
  dismissText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
});
