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
  small: { ring: 68, border: 2.5, plus: 20, plusIcon: 12 },
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
  /** Size variant */
  size?: SizeVariant;
  /** Press handler */
  onPress: () => void;
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
  size = 'small',
  onPress,
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
    if (isSeen) {
      return { borderColor: palette.gray[400], borderWidth: 1.5 };
    }
    // Unseen — purple matching app primary color
    return { borderColor: palette.purple[500], borderWidth: dims.border };
  };

  const ringStyle = getRingStyle();
  const initial = userName ? userName[0].toUpperCase() : '?';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={
        isOwnStory
          ? 'Hikayeni paylas'
          : `${userName} hikayeleri`
      }
      accessibilityRole="button"
      testID={testID}
      style={styles.container}
    >
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

      {/* "+" button for own story creation */}
      {isOwnStory && (
        <View
          style={[
            styles.plusBadge,
            {
              width: dims.plus,
              height: dims.plus,
              borderRadius: dims.plus / 2,
              bottom: showLabel ? 14 : 0,
            },
          ]}
        >
          <Text style={[styles.plusIcon, { fontSize: dims.plusIcon }]}>+</Text>
        </View>
      )}

      {/* Label */}
      {showLabel && (
        <Text
          style={[
            styles.label,
            { width: dims.ring },
            isSeen && styles.labelSeen,
          ]}
          numberOfLines={1}
        >
          {isOwnStory ? 'Hikaye' : userName}
        </Text>
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
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.textSecondary,
  },
  avatarInitialMedium: {
    fontSize: 28,
  },
  plusBadge: {
    position: 'absolute',
    right: 0,
    backgroundColor: palette.purple[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  plusIcon: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
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
});
