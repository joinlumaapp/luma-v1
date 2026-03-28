// StoryRing — Instagram-quality circular avatar with animated gradient ring
// Shows gold gradient for unseen stories, grey for seen, "+" for own story creation
// Size variants: small (discovery header), medium (profile)

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';

// ─── Size Variants ────────────────────────────────────────────

const SIZES = {
  small: { ring: 82, border: 3, plus: 22, plusIcon: 13 },
  medium: { ring: 84, border: 3, plus: 24, plusIcon: 14 },
} as const;

type SizeVariant = keyof typeof SIZES;

// ─── Props ────────────────────────────────────────────────────

interface StoryRingProps {
  /** User display name */
  userName: string;
  /** Avatar image URL */
  avatarUrl?: string;
  /** Whether this ring represents the current user's own story */
  isOwnStory?: boolean;
  /** Whether stories have been viewed */
  isSeen?: boolean;
  /** Whether user has any stories */
  hasStories?: boolean;
  /** Whether this is a suggested/recommended user (non-followed) */
  isSuggested?: boolean;
  /** Size variant */
  size?: SizeVariant;
  /** Press handler — tapping the avatar ring */
  onPress: () => void;
  /** "+" button press handler — opens story creation */
  onPlusPress?: () => void;
  /** Long press handler (for own story — delete option) */
  onLongPress?: () => void;
  /** Show label below avatar */
  showLabel?: boolean;
  /** Test ID for testing */
  testID?: string;
}

export const StoryRing: React.FC<StoryRingProps> = ({
  userName,
  avatarUrl,
  isOwnStory = false,
  isSeen = false,
  hasStories = true,
  isSuggested = false,
  size = 'small',
  onPress,
  onPlusPress,
  onLongPress,
  showLabel = true,
  testID,
}) => {
  const dims = SIZES[size];
  const avatarSize = dims.ring - dims.border * 2;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Subtle pulse animation for unseen stories
  useEffect(() => {
    if (!isSeen && hasStories && !isOwnStory) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      return undefined;
    }
  }, [isSeen, hasStories, isOwnStory, pulseAnim]);

  // Ring color logic
  const getRingStyle = () => {
    if (isOwnStory && !hasStories) {
      // Own story with no stories — subtle dashed-look border
      return { borderColor: colors.textTertiary, borderWidth: 1.5 };
    }
    if (!hasStories) {
      return { borderColor: colors.textTertiary, borderWidth: 1.5 };
    }
    if (isSuggested) {
      // Suggested/recommended — premium gold ring
      return { borderColor: palette.gold[400], borderWidth: dims.border };
    }
    if (isSeen) {
      return { borderColor: palette.gray[400], borderWidth: 1.5 };
    }
    // Unseen — purple matching app primary color
    return { borderColor: palette.purple[500], borderWidth: dims.border };
  };

  const ringStyle = getRingStyle();
  const initial = userName ? userName[0].toUpperCase() : '?';

  // Outer glow ring dimensions for suggested stories
  const glowRingSize = dims.ring + 6;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={
        isOwnStory
          ? 'Gonderini paylas'
          : isSuggested
            ? `${userName} onerilen hikaye`
            : `${userName} hikayeleri`
      }
      accessibilityRole="button"
      testID={testID}
      style={styles.container}
    >
      {/* Outer glow ring for suggested stories — creates a double-border effect */}
      {isSuggested && (
        <View
          style={[
            styles.suggestedGlowRing,
            {
              width: glowRingSize,
              height: glowRingSize,
              borderRadius: glowRingSize / 2,
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.ringOuter,
          {
            width: dims.ring,
            height: dims.ring,
            borderRadius: dims.ring / 2,
            ...ringStyle,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[
              styles.avatar,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              },
              isSeen && styles.avatarSeen,
            ]}
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              },
            ]}
          >
            <Text style={[styles.avatarInitial, size === 'medium' && styles.avatarInitialMedium]}>
              {initial}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Sparkle badge for suggested stories — positioned top-right of the ring */}
      {isSuggested && (
        <View style={styles.suggestedSparkleBadge}>
          <Text style={styles.suggestedSparkleIcon}>{'\u2728'}</Text>
        </View>
      )}

      {/* "+" button for own story creation — separate touch target */}
      {isOwnStory && (
        <Pressable
          onPress={onPlusPress ?? onPress}
          hitSlop={4}
          style={[
            styles.plusBadge,
            {
              width: dims.plus,
              height: dims.plus,
              borderRadius: dims.plus / 2,
            },
          ]}
        >
          <Text style={[styles.plusIcon, { fontSize: dims.plusIcon }]}>+</Text>
        </Pressable>
      )}

      {/* Label — shows "Oneri" micro-label for suggested, otherwise username */}
      {showLabel && (
        <Text
          style={[
            styles.label,
            { width: dims.ring + (isSuggested ? 8 : 0) },
            isSeen && styles.labelSeen,
            isSuggested && styles.suggestedLabel,
          ]}
          numberOfLines={1}
        >
          {isOwnStory ? 'Hikaye' : userName}
        </Text>
      )}

      {/* "Oneri" micro-label below the username for suggested stories */}
      {isSuggested && showLabel && (
        <Text style={styles.suggestedMicroLabel}>{'\u00D6neri'}</Text>
      )}
    </Pressable>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ringOuter: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  avatar: {
    overflow: 'hidden',
  },
  avatarSeen: {
    opacity: 0.7,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.textSecondary,
  },
  avatarInitialMedium: {
    fontSize: 28,
  },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    backgroundColor: palette.purple[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
    zIndex: 10,
  },
  plusIcon: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginTop: -1,
  },
  label: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  labelSeen: {
    opacity: 0.5,
  },

  // ── Suggested / Recommended Story Styles ──

  /** Outer glow ring — creates a subtle double-border premium effect */
  suggestedGlowRing: {
    position: 'absolute',
    top: -3,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: palette.gold[300],
    opacity: 0.5,
  },

  /** Sparkle badge — small indicator at top-right of the ring */
  suggestedSparkleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  /** Sparkle emoji icon */
  suggestedSparkleIcon: {
    fontSize: 11,
  },

  /** Gold-tinted label for suggested stories */
  suggestedLabel: {
    color: palette.gold[400],
  },

  /** "Oneri" micro-label below the username */
  suggestedMicroLabel: {
    fontSize: 8,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.gold[500],
    textAlign: 'center',
    marginTop: 1,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
