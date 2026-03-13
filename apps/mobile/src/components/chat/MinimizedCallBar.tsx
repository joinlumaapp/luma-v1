// Minimized call bar — floating pill shown at top when navigating away during active call.
// Tap to return to CallScreen. End call button on the bar.

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useCallStore } from '../../stores/callStore';

/** Format seconds into MM:SS */
const formatDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const MinimizedCallBar: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MatchesStackParamList>>();

  const callState = useCallStore((s) => s.callState);
  const callType = useCallStore((s) => s.callType);
  const remoteUser = useCallStore((s) => s.remoteUser);
  const isMinimized = useCallStore((s) => s.isMinimized);
  const callDuration = useCallStore((s) => s.callDuration);
  const endCall = useCallStore((s) => s.endCall);
  const setMinimized = useCallStore((s) => s.setMinimized);

  const isActive = isMinimized && (callState === 'connected' || callState === 'connecting');

  const handleTap = useCallback(() => {
    if (!remoteUser) return;
    setMinimized(false);
    navigation.navigate('Call', {
      matchId: remoteUser.id,
      partnerName: remoteUser.name,
      callType: callType ?? 'voice',
    });
  }, [navigation, remoteUser, callType, setMinimized]);

  const handleEndCall = useCallback(() => {
    endCall();
  }, [endCall]);

  if (!isActive) return null;

  const label = callState === 'connecting'
    ? 'Baglaniyor...'
    : `Arama devam ediyor \u2014 ${formatDuration(callDuration)}`;

  return (
    <View style={[styles.wrapper, { top: insets.top }]}>
      <TouchableOpacity
        onPress={handleTap}
        activeOpacity={0.85}
        accessibilityLabel="Aramaya don"
        accessibilityRole="button"
        style={styles.bar}
      >
        {/* Red recording dot */}
        <View style={styles.recordDot} />

        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>

        {/* End call button */}
        <TouchableOpacity
          onPress={handleEndCall}
          activeOpacity={0.7}
          accessibilityLabel="Aramayi bitir"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.endButton}
        >
          <Text style={styles.endButtonIcon}>{'\uD83D\uDCF5'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.purple[600],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    ...shadows.medium,
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.error,
  },
  label: {
    ...typography.bodySmall,
    color: palette.white,
    fontWeight: '600',
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  endButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endButtonIcon: {
    fontSize: 14,
  },
});
