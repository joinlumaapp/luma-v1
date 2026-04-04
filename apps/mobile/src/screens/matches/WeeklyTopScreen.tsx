import React, { useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWeeklyTopStore } from '../../stores/weeklyTopStore';
import { colors, palette } from '../../theme/colors';
import { WEEKLY_TOP_CONFIG } from '../../constants/config';
import { useCoinStore } from '../../stores/coinStore';
import { fontWeights } from '../../theme/typography';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import type { MatchesStackParamList } from '../../navigation/types';

const WeeklyTopScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MatchesStackParamList>>();
  const { matches, nextRefreshAt, fetchWeeklyTop, revealMatch } = useWeeklyTopStore();

  useEffect(() => {
    fetchWeeklyTop();
  }, []);

  const REVEAL_COST = WEEKLY_TOP_CONFIG.REVEAL_COST_GOLD;
  const coinBalance = useCoinStore((s) => s.balance);
  const spendCoins = useCoinStore((s) => s.spendCoins);

  const handleCardPress = useCallback(async (match: typeof matches[0]) => {
    if (match.isRevealed) {
      navigation.navigate('ProfilePreview', { userId: match.userId });
      return;
    }

    if (coinBalance < REVEAL_COST) {
      Alert.alert(
        'Yetersiz Jeton',
        `Profili açmak için ${REVEAL_COST} jeton gerekli.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Jeton Al', onPress: () => navigation.navigate('JetonMarket' as never) },
        ],
      );
      return;
    }

    Alert.alert(
      'Profili Aç',
      `Bu profili görmek için ${REVEAL_COST} jeton harcanacak.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Aç',
          onPress: async () => {
            const success = await spendCoins(REVEAL_COST, 'weekly_top_reveal');
            if (success) {
              revealMatch(match.userId);
            }
          },
        },
      ],
    );
  }, [coinBalance, spendCoins, revealMatch, navigation, matches]);

  return (
    <SafeAreaView style={styles.container}>
      <BrandedBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Haftalık Top 3</Text>
          <Text style={styles.headerSubtitle}>AI seçimi: en uyumlu 3 kişin</Text>
        </View>
      </View>

      <View style={styles.cardsContainer}>
        {matches.map((match, index) => (
          <TouchableOpacity
            key={match.userId}
            style={[styles.matchCard, index === 0 && styles.firstCard]}
            onPress={() => handleCardPress(match)}
            activeOpacity={0.7}
          >
            {match.isRevealed ? (
              <>
                <View style={styles.photoContainer}>
                  {match.photoUrl ? (
                    <Image source={{ uri: match.photoUrl }} style={styles.photo} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="person" size={40} color={palette.purple[400]} />
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)'] as [string, string]}
                    style={styles.photoGradient}
                  />
                  <View style={styles.photoInfo}>
                    <Text style={styles.matchName}>{match.name}, {match.age}</Text>
                    <Text style={styles.matchReason}>{match.matchReason}</Text>
                  </View>
                </View>
                <View style={styles.compatBadge}>
                  <Text style={styles.compatText}>%{match.compatibilityPercent}</Text>
                </View>
              </>
            ) : (
              <View style={styles.lockedCard}>
                <View style={styles.lockIcon}>
                  <Ionicons name="lock-closed" size={24} color={palette.purple[400]} />
                </View>
                <Text style={styles.lockText}>{REVEAL_COST} jeton ile aç</Text>
                <View style={styles.compatBadgeBlurred}>
                  <Text style={styles.compatTextBlurred}>%??</Text>
                </View>
              </View>
            )}

            {index === 0 && (
              <View style={styles.crownBadge}>
                <Ionicons name="trophy" size={14} color="#000" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {nextRefreshAt && (
        <Text style={styles.refreshText}>
          Her Pazartesi güncellenir
        </Text>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, gap: 12,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: fontWeights.bold },
  headerSubtitle: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  cardsContainer: { flex: 1, padding: 16, gap: 12 },
  matchCard: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    borderRadius: 16, overflow: 'hidden', position: 'relative',
  },
  firstCard: { borderColor: palette.gold[400] + '4D', borderWidth: 1.5 },
  photoContainer: { width: '100%', aspectRatio: 1.2, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  photoGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  photoInfo: { position: 'absolute', bottom: 12, left: 12 },
  matchName: { color: colors.text, fontSize: 16, fontWeight: fontWeights.bold },
  matchReason: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  compatBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: palette.gold[400] + 'E6', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  compatText: { color: colors.textInverse, fontSize: 12, fontWeight: fontWeights.bold },
  lockedCard: {
    width: '100%', aspectRatio: 1.2, backgroundColor: colors.primary + '14',
    justifyContent: 'center', alignItems: 'center',
  },
  lockIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '26',
    borderWidth: 1, borderColor: colors.primary + '4D',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  lockText: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  compatBadgeBlurred: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: colors.primary + '4D', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  compatTextBlurred: { color: colors.textTertiary, fontSize: 12 },
  crownBadge: {
    position: 'absolute', top: -4, left: -4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: palette.gold[400], justifyContent: 'center', alignItems: 'center',
  },
  refreshText: {
    color: colors.textTertiary, fontSize: 11, textAlign: 'center',
    paddingVertical: 16,
  },
});

export default WeeklyTopScreen;
