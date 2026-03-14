// CoinBalance — premium jeton pill: cream bg, matte gold border, black text
// Uses Ionicons instead of emoji for predictable sizing on Android
// Tappable — navigates to MembershipPlans screen

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCoinStore } from '../../stores/coinStore';
import { fontWeights } from '../../theme/typography';

const TEXT_BLACK = '#1A1A1A';
const GOLD = '#D4AF37';

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
  const iconSize = isSmall ? 16 : 20;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void })
        .navigate('MembershipPlans');
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityLabel={`${balance} Jeton bakiyesi`}
      accessibilityRole="button"
      style={styles.touchable}
    >
      <View style={[styles.pill, isSmall ? styles.pillSmall : styles.pillMedium]}>
        <Ionicons name="wallet" size={iconSize} color={GOLD} />
        <Text
          style={[styles.balanceText, isSmall ? styles.balanceSmall : styles.balanceMedium]}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {balance.toLocaleString('tr-TR')}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    flexShrink: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E7',
    borderWidth: 1.5,
    borderColor: GOLD,
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {},
    }),
  },
  pillSmall: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 6,
    minWidth: 80,
  },
  pillMedium: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    gap: 8,
  },
  balanceText: {
    color: TEXT_BLACK,
    fontWeight: fontWeights.bold,
    includeFontPadding: false,
  },
  balanceSmall: {
    fontSize: 14,
  },
  balanceMedium: {
    fontSize: 18,
  },
});
