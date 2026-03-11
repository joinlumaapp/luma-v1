// Trial banner — shows remaining Gold trial time in Discovery header
// Format: "Premium Deneme: 23s 45dk kaldi" with gold accent

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

/** Format remaining milliseconds into "Xs Ydk" or "Xs Yd Zs" */
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
  const trialExpiresAt = useAuthStore((s) => s.trialExpiresAt);
  const checkTrialExpiry = useAuthStore((s) => s.checkTrialExpiry);
  const [remaining, setRemaining] = useState<string>('');

  const updateRemaining = useCallback(() => {
    if (!trialExpiresAt) return;

    const diff = trialExpiresAt - Date.now();
    if (diff <= 0) {
      checkTrialExpiry();
      return;
    }
    setRemaining(formatTimeRemaining(diff));
  }, [trialExpiresAt, checkTrialExpiry]);

  useEffect(() => {
    if (!trialExpiresAt) return;

    updateRemaining();
    // Update every 30 seconds to avoid unnecessary re-renders
    const interval = setInterval(updateRemaining, 30_000);
    return () => clearInterval(interval);
  }, [trialExpiresAt, updateRemaining]);

  if (!trialExpiresAt || trialExpiresAt <= Date.now()) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Premium Deneme: </Text>
      <Text style={styles.time}>{remaining} kaldi</Text>
    </View>
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.gold[600],
  },
  time: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.gold[500],
  },
});
