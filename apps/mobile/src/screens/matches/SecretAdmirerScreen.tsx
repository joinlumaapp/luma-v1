import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSecretAdmirerStore } from '../../stores/secretAdmirerStore';
import { colors, palette } from '../../theme/colors';
import { fontWeights } from '../../theme/typography';
import { BrandedBackground } from '../../components/common/BrandedBackground';

const SecretAdmirerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { receivedAdmirers, fetchReceived, guess, isLoading } = useSecretAdmirerStore();

  useEffect(() => {
    fetchReceived();
  }, []);

  const handleGuess = async (admirerId: string, guessedUserId: string) => {
    try {
      const result = await guess(admirerId, guessedUserId);
      if (result.correct) {
        Alert.alert('Dogru Tahmin!', 'Eslesme olusturuldu! Sohbet baslatabilirsin.', [
          { text: 'Harika!', onPress: () => fetchReceived() },
        ]);
      } else if (result.guessesRemaining > 0) {
        Alert.alert('Yanlis', `${result.guessesRemaining} tahmin hakkin kaldi.`);
      } else {
        Alert.alert('Tahmin Hakkin Bitti', 'Bir dahaki sefere!', [
          { text: 'Tamam', onPress: () => fetchReceived() },
        ]);
      }
    } catch {
      Alert.alert('Hata', 'Bir sorun olustu, tekrar dene.');
    }
  };

  const renderAdmirer = ({ item }: { item: typeof receivedAdmirers[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="eye-off" size={20} color={palette.purple[400]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Gizli Hayranin Var!</Text>
          <Text style={styles.cardSubtitle}>
            Bu 3 kisiden biri seni gizlice begendi
          </Text>
        </View>
        <View style={styles.guessBadge}>
          <Text style={styles.guessText}>
            {item.maxGuesses - item.guessesUsed} tahmin
          </Text>
        </View>
      </View>

      <View style={styles.candidatesRow}>
        {item.candidates.map((candidateId, index) => (
          <TouchableOpacity
            key={candidateId}
            style={styles.candidateCard}
            onPress={() => handleGuess(item.id, candidateId)}
            activeOpacity={0.7}
          >
            <View style={styles.candidateAvatar}>
              <Text style={styles.candidateAvatarText}>?</Text>
            </View>
            <Text style={styles.candidateLabel}>Aday {index + 1}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.expiryText}>
        {new Date(item.expiresAt) > new Date() ? 'Suresi dolmadan tahmin et!' : 'Suresi dolmus'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <BrandedBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizli Hayranlar</Text>
      </View>

      {receivedAdmirers.length === 0 && !isLoading ? (
        <View style={styles.emptyState}>
          <Ionicons name="eye-off-outline" size={48} color={palette.purple[400]} />
          <Text style={styles.emptyTitle}>Henuz gizli hayranin yok</Text>
          <Text style={styles.emptySubtitle}>
            Birisi seni gizlice begendiginde burada gorunecek
          </Text>
        </View>
      ) : (
        <FlatList
          data={receivedAdmirers.filter((a) => a.status === 'PENDING')}
          renderItem={renderAdmirer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
        />
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
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '26',
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: fontWeights.semibold },
  cardSubtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  guessBadge: {
    backgroundColor: colors.primary + '26', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  guessText: { color: palette.purple[400], fontSize: 10, fontWeight: fontWeights.semibold },
  candidatesRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  candidateCard: {
    flex: 1, alignItems: 'center', padding: 12,
    backgroundColor: colors.primary + '14', borderWidth: 1,
    borderColor: colors.primary + '33', borderRadius: 14,
  },
  candidateAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + '33',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  candidateAvatarText: { color: palette.purple[400], fontSize: 24, fontWeight: fontWeights.bold },
  candidateLabel: { color: colors.textSecondary, fontSize: 10 },
  expiryText: {
    color: colors.textTertiary, fontSize: 10, textAlign: 'center', marginTop: 12,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: fontWeights.semibold },
  emptySubtitle: { color: colors.textTertiary, fontSize: 12, textAlign: 'center', paddingHorizontal: 40 },
});

export default SecretAdmirerScreen;
