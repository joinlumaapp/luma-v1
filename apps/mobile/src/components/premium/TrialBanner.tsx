// Trial banner — shows remaining Gold trial time in Discovery header
// Format: "Premium Deneme: 23s 45dk kaldi" with gold accent
// Tappable: navigates to MembershipPlans. Urgency mode when < 1 hour left.

import React, { useState, useEffect, useCallback } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Format remaining milliseconds into "Xs Ydk" or "Xdk Ys" */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0dk';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}s ${minutes}dk`;
  }
  const seconds = totalSeconds % 60;
  return `${minutes}dk ${seconds}s`;
}

export const TrialBanner: React.FC = () => {
  const navigation = useNavigation();
  const trialExpiresAt = useAuthStore((s) => s.trialExpiresAt);
  const checkTrialExpiry = useAuthStore((s) => s.checkTrialExpiry);
  const [remaining, setRemaining] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);

  const updateRemaining = useCallback(() => {
    if (!trialExpiresAt) return;

    const diff = trialExpiresAt - Date.now();
    if (diff <= 0) {
      checkTrialExpiry();
      return;
    }
    setRemaining(formatTimeRemaining(diff));
    setIsUrgent(diff < ONE_HOUR_MS);
  }, [trialExpiresAt, checkTrialExpiry]);

  useEffect(() => {
    if (!trialExpiresAt) return;

    updateRemaining();
    // Update every 30 seconds normally, every 10 seconds in urgency mode
    const intervalMs = isUrgent ? 10_000 : 30_000;
    const interval = setInterval(updateRemaining, intervalMs);
    return () => clearInterval(interval);
  }, [trialExpiresAt, updateRemaining, isUrgent]);

  const handlePress = useCallback(() => {
    // Navigate to MembershipPlans — works from any nested stack via getParent
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('ProfileTab', { screen: 'MembershipPlans' } as never);
    } else {
      (navigation as never as { navigate: (screen: string) => void }).navigate('MembershipPlans');
    }
  }, [navigation]);

  if (!trialExpiresAt || trialExpiresAt <= Date.now()) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Premium deneme süresi — planları gör"
      style={({ pressed }) => [
        styles.container,
        isUrgent && styles.containerUrgent,
        pressed && styles.containerPressed,
      ]}
    >
      <Text style={[styles.label, isUrgent && styles.labelUrgent]}>
        Premium Deneme:{' '}
      </Text>
      <Text style={[styles.time, isUrgent && styles.timeUrgent]}>
        {remaining} kaldi
      </Text>
      {isUrgent && (
        <Text style={styles.urgencyBadge}> Son firsat!</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gold[500] + '18',
    borderWidth: 1,
    borderColor: palette.gold[400] + '40',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  containerUrgent: {
    backgroundColor: '#FF8C00' + '25',
    borderColor: '#FF6B00' + '60',
  },
  containerPressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.gold[600],
  },
  labelUrgent: {
    color: '#E65100',
  },
  time: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.gold[500],
  },
  timeUrgent: {
    color: '#FF6B00',
  },
  urgencyBadge: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FF3D00',
  },
});
