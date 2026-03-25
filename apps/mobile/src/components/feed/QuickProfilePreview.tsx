// QuickProfilePreview — lightweight bottom sheet overlay shown on post tap
// Shows user info + compatibility + quick actions without leaving the feed

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { INTENTION_TAG_OPTIONS, type FeedPost } from '../../services/socialFeedService';

interface QuickProfilePreviewProps {
  visible: boolean;
  post: FeedPost | null;
  onClose: () => void;
  onFlirt: (userId: string) => void;
  onFullProfile: (userId: string) => void;
}

export const QuickProfilePreview: React.FC<QuickProfilePreviewProps> = ({
  visible,
  post,
  onClose,
  onFlirt,
  onFullProfile,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      backdropAnim.setValue(0);
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  if (!visible || !post) return null;

  const intentionOption = INTENTION_TAG_OPTIONS.find((t) => t.id === post.intentionTag);
  const distanceText = post.distance < 1 ? 'Yakininda' : `${post.distance} km`;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Profile header */}
        <View style={styles.profileRow}>
          <TouchableOpacity onPress={() => { onClose(); onFullProfile(post.userId); }} activeOpacity={0.8}>
            <Image source={{ uri: post.userAvatarUrl }} style={styles.avatar} />
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{post.userName}</Text>
              {post.isVerified && (
                <Ionicons name="checkmark-circle" size={15} color={palette.purple[400]} />
              )}
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.metaText}>{distanceText}</Text>
              </View>
              {intentionOption && (
                <View style={[styles.metaChip, { backgroundColor: intentionOption.color + '15' }]}>
                  <Text style={styles.intentionEmoji}>{intentionOption.emoji}</Text>
                  <Text style={[styles.metaText, { color: intentionOption.color }]}>{intentionOption.label}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Compatibility score */}
        <View style={styles.compatSection}>
          <View style={styles.compatCircle}>
            <Text style={styles.compatPercent}>%{post.compatibilityScore}</Text>
          </View>
          <View style={styles.compatInfo}>
            <Text style={styles.compatTitle}>Uyum Puani</Text>
            <Text style={styles.compatSubtitle}>
              {post.compatibilityScore >= 80
                ? 'Cok yuksek uyum!'
                : post.compatibilityScore >= 60
                ? 'Iyi bir uyum var'
                : 'Kesfetmeye deger'}
            </Text>
          </View>
        </View>

        {/* Quick action — Flirt only */}
        <TouchableOpacity
          style={styles.flirtButton}
          onPress={() => { onClose(); onFlirt(post.userId); }}
          activeOpacity={0.8}
        >
          <Ionicons name="flame" size={22} color="#FFFFFF" />
          <Text style={styles.flirtText}>Flört Başlat</Text>
        </TouchableOpacity>

        {/* Full profile link */}
        <TouchableOpacity
          style={styles.fullProfileButton}
          onPress={() => { onClose(); onFullProfile(post.userId); }}
          activeOpacity={0.7}
        >
          <Text style={styles.fullProfileText}>Tam Profili Gör</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  // Profile header
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceLight,
    borderWidth: 2,
    borderColor: palette.purple[400] + '40',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  intentionEmoji: {
    fontSize: 10,
  },

  // Compatibility
  compatSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.purple[400] + '0A',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.purple[400] + '18',
  },
  compatCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.purple[400] + '18',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.purple[400],
  },
  compatPercent: {
    fontSize: 16,
    color: palette.purple[400],
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  compatInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  compatTitle: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: 2,
  },
  compatSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },

  // Actions
  flirtButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B00',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    marginBottom: spacing.md,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  flirtText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },

  // Full profile link
  fullProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  fullProfileText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
});
