// CoinBalance — inline gold coin emoji + balance display
// Tappable — navigates to MembershipPlans screen

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCoinStore } from '../../stores/coinStore';
import { fontWeights } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { glassmorphism } from '../../theme/colors';

interface CoinBalanceProps {
  size?: 'small' | 'medium';
  onPress?: () => void;
}

export const CoinBalance: React.FC<CoinBalanceProps> = ({
  size = 'small',
  onPress,
}) => {
  const navigation = useNavigation();
  const balance = useCoinStore((state) => state.balance);

  const isSmall = size === 'small';
  const fontSize = isSmall ? 14 : 18;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to MembershipPlans (Jetonlar tab is integrated there)
      (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void })
        .navigate('MembershipPlans');
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSmall ? styles.containerSmall : styles.containerMedium,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityLabel={`${balance} Jeton bakiyesi`}
      accessibilityRole="button"
    >
      {/* Gold coin emoji */}
      <Text style={{ fontSize: isSmall ? 14 : 20 }}>{'\uD83E\uDE99'}</Text>

      {/* Balance number */}
      <Text style={[styles.balanceText, { fontSize }]}>
        {balance.toLocaleString('tr-TR')}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glassmorphism.bg,
    borderWidth: 1,
    borderColor: glassmorphism.borderGold,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  containerSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  containerMedium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  balanceText: {
    color: '#B8860B',
    fontWeight: fontWeights.bold,
  },
});
