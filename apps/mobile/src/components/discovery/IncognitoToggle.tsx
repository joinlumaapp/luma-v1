// IncognitoToggle — compact toggle for incognito (invisible) mode
// Pro+ users get a functional toggle; Free/Gold users see a locked upsell state

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme/colors';
import { typography, fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useIncognito } from '../../hooks/useIncognito';

interface IncognitoToggleProps {
  /** Called when a locked user taps the toggle (navigate to packages screen) */
  onLockedPress?: () => void;
}

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 26;
const THUMB_SIZE = 22;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - 4; // 4px total horizontal padding

export const IncognitoToggle: React.FC<IncognitoToggleProps> = ({ onLockedPress }) => {
  const { isIncognito, canUseIncognito, toggleIncognito } = useIncognito();
  const [showExplanation, setShowExplanation] = useState(false);
  const thumbAnim = useRef(new Animated.Value(isIncognito ? 1 : 0)).current;
  const explanationOpacity = useRef(new Animated.Value(0)).current;
  const explanationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync thumb animation with state
  useEffect(() => {
    Animated.spring(thumbAnim, {
      toValue: isIncognito ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [isIncognito, thumbAnim]);

  // Show/hide explanation tooltip
  useEffect(() => {
    if (showExplanation) {
      Animated.timing(explanationOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after 4 seconds
      explanationTimerRef.current = setTimeout(() => {
        Animated.timing(explanationOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setShowExplanation(false));
      }, 4000);
    }

    return () => {
      if (explanationTimerRef.current) {
        clearTimeout(explanationTimerRef.current);
      }
    };
  }, [showExplanation, explanationOpacity]);

  const handlePress = useCallback(async () => {
    if (!canUseIncognito) {
      onLockedPress?.();
      return;
    }

    await toggleIncognito();

    // Show explanation when activating
    if (!isIncognito) {
      setShowExplanation(true);
    } else {
      setShowExplanation(false);
    }
  }, [canUseIncognito, isIncognito, toggleIncognito, onLockedPress]);

  // Animated thumb position
  const thumbTranslateX = thumbAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, THUMB_TRAVEL + 2],
  });

  // Track background color animation
  const trackColor = thumbAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.gray[600], palette.gold[500]],
  });

  // ── Locked state for Free/Gold users ──
  if (!canUseIncognito) {
    return (
      <TouchableOpacity
        style={styles.lockedContainer}
        onPress={onLockedPress}
        activeOpacity={0.7}
      >
        <View style={styles.lockedHeader}>
          <View style={styles.lockedTitleRow}>
            <Ionicons name="eye-off" size={18} color={palette.gray[400]} />
            <Text style={styles.lockedTitle}>Gizli Mod</Text>
          </View>
          <View style={styles.upsellBadge}>
            <Ionicons name="lock-closed" size={10} color={palette.white} style={{ marginRight: 4 }} />
            <Text style={styles.upsellText}>Pro ile aç</Text>
          </View>
        </View>
        <Text style={styles.lockedDescription}>
          Profilin sadece beğendiğin kişilere görünür
        </Text>
      </TouchableOpacity>
    );
  }

  // ── Active state for Pro/Reserved users ──
  return (
    <View>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.row}>
          <Ionicons
            name={isIncognito ? 'eye-off' : 'eye-off-outline'}
            size={18}
            color={isIncognito ? palette.gold[500] : palette.gray[400]}
          />
          <Text style={[styles.label, isIncognito && styles.labelActive]}>
            Gizli Mod
          </Text>

          {/* Custom animated toggle track */}
          <Animated.View
            style={[styles.track, { backgroundColor: trackColor }]}
          >
            <Animated.View
              style={[
                styles.thumb,
                { transform: [{ translateX: thumbTranslateX }] },
              ]}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Explanation tooltip */}
      {showExplanation && (
        <Animated.View style={[styles.explanation, { opacity: explanationOpacity }]}>
          <Text style={styles.explanationText}>
            Keşif akışında görünmezsiniz. Eşleşmeleriniz sizi görmeye devam eder.
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: palette.gray[400],
    flex: 1,
  },
  labelActive: {
    color: palette.gold[500],
    fontWeight: fontWeights.medium,
  },
  labelLocked: {
    ...typography.bodySmall,
    color: palette.gray[400],
    flex: 1,
  },
  lockedContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedTitle: {
    ...typography.bodySmall,
    color: palette.gray[300],
    fontWeight: fontWeights.medium,
  },
  lockedDescription: {
    ...typography.caption,
    color: palette.gray[500],
    marginTop: spacing.xs,
  },

  // Toggle track
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: palette.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  // Upsell badge for locked state
  upsellBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.purple[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  upsellText: {
    ...typography.captionSmall,
    color: palette.white,
    fontWeight: fontWeights.semibold,
  },

  // Explanation tooltip
  explanation: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    backgroundColor: palette.gray[800],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  explanationText: {
    ...typography.caption,
    color: palette.gray[200],
  },
});

export default IncognitoToggle;
