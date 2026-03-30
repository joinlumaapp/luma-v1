// Secret Admirer screen — gizli hayranlar ozellik ekrani
// Modal presentation with slide_from_bottom animation

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { BrandedBackground } from '../../components/common/BrandedBackground';

type NavProp = NativeStackNavigationProp<MatchesStackParamList, 'SecretAdmirer'>;

export const SecretAdmirerScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  return (
    <BrandedBackground>
      <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <View style={styles.content}>
          <Text style={styles.title}>Gizli Hayranlar</Text>
          <Text style={styles.subtitle}>
            Seni beğenen kişileri keşfet
          </Text>
        </View>
      </View>
    </BrandedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.sm,
  },
  closeText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
