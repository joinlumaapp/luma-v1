import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWeeklyTopStore } from '../../stores/weeklyTopStore';
import { palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';

const WeeklyTopScreen: React.FC = () => {
  const navigation = useNavigation();
  const { matches, nextRefreshAt, fetchWeeklyTop, revealMatch, isLoading } = useWeeklyTopStore();

  useEffect(() => {
    fetchWeeklyTop();
  }, []);

  const handleCardPress = (match: typeof matches[0]) => {
    if (match.isRevealed) {
      navigation.navigate('ProfilePreview' as never, { userId: match.userId } as never);
    } else {
      // TODO: Show jeton purchase modal (40 gold to reveal)
      revealMatch(match.userId);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Haftalik Top 3</Text>
          <Text style={styles.headerSubtitle}>AI secimi: en uyumlu 3 kisin</Text>
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
                <Text style={styles.lockText}>40 jeton ile ac</Text>
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
          Her Pazartesi guncellenir
        </Text>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080F' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, gap: 12,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#141422', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: fontWeights.bold },
  headerSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  cardsContainer: { flex: 1, padding: 16, gap: 12 },
  matchCard: {
    flex: 1, backgroundColor: '#141422', borderWidth: 1, borderColor: '#252540',
    borderRadius: 16, overflow: 'hidden', position: 'relative',
  },
  firstCard: { borderColor: 'rgba(251,191,36,0.3)', borderWidth: 1.5 },
  photoContainer: { width: '100%', aspectRatio: 1.2, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1C1C32', justifyContent: 'center', alignItems: 'center' },
  photoGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  photoInfo: { position: 'absolute', bottom: 12, left: 12 },
  matchName: { color: '#fff', fontSize: 16, fontWeight: fontWeights.bold },
  matchReason: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  compatBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(251,191,36,0.9)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  compatText: { color: '#000', fontSize: 12, fontWeight: fontWeights.bold },
  lockedCard: {
    width: '100%', aspectRatio: 1.2, backgroundColor: 'rgba(139,92,246,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  lockIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  lockText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  compatBadgeBlurred: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(139,92,246,0.3)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  compatTextBlurred: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  crownBadge: {
    position: 'absolute', top: -4, left: -4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: palette.gold[400], justifyContent: 'center', alignItems: 'center',
  },
  refreshText: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center',
    paddingVertical: 16,
  },
});

export default WeeklyTopScreen;
