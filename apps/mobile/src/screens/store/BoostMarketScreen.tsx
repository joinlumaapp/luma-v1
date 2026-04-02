// BoostMarketScreen — Boost pack purchase screen
// LUMA themed (purple/pink gradient hero), 2×2 pack grid, "Devam" CTA
// Users buy boost packs to increase profile visibility 10x

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontWeights } from '../../theme/typography';
import { useScreenTracking } from '../../hooks/useAnalytics';

// ── Boost Packs ──
interface BoostPack {
  id: string;
  count: number;
  price: string;
  discount?: string;
  popular?: boolean;
}

const BOOST_PACKS: BoostPack[] = [
  { id: 'boost_20', count: 20, price: '₺759,99', discount: '%37 KAYDET', popular: true },
  { id: 'boost_10', count: 10, price: '₺409,99', discount: '%32 KAYDET' },
  { id: 'boost_5', count: 5, price: '₺239,99', discount: '%20 KAYDET' },
  { id: 'boost_1', count: 1, price: '₺59,99' },
];

// ── Pack Card ──
const PackCard: React.FC<{
  pack: BoostPack;
  selected: boolean;
  onSelect: (id: string) => void;
}> = ({ pack, selected, onSelect }) => (
  <TouchableOpacity
    style={[cardStyles.card, selected && cardStyles.cardSelected]}
    onPress={() => onSelect(pack.id)}
    activeOpacity={0.85}
  >
    {pack.popular && (
      <View style={cardStyles.popularBadge}>
        <Text style={cardStyles.popularText}>EN POPÜLER</Text>
      </View>
    )}

    <Text style={cardStyles.count}>{pack.count}</Text>
    <Text style={cardStyles.label}>
      {pack.count === 1 ? 'Boost' : "Boost'ler"}
    </Text>

    {pack.discount && (
      <View style={cardStyles.discountBadge}>
        <Text style={cardStyles.discountText}>{pack.discount}</Text>
      </View>
    )}

    <Text style={cardStyles.price}>{pack.price}</Text>
  </TouchableOpacity>
);

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
    minHeight: 160,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: palette.purple[500],
    backgroundColor: '#FAF5FF',
    borderWidth: 2,
  },
  count: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: '#1F2937',
  },
  label: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: fontWeights.regular,
    color: '#6B7280',
  },
  discountBadge: {
    backgroundColor: palette.purple[100],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: 4,
  },
  discountText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: palette.purple[700],
  },
  price: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: '#1F2937',
    marginTop: 4,
  },
  popularBadge: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: palette.purple[500],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  popularText: {
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

// ── Main Screen ──
export const BoostMarketScreen: React.FC = () => {
  useScreenTracking('BoostMarket');
  const navigation = useNavigation();

  const [selectedPack, setSelectedPack] = useState<string>('boost_20');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleSelect = useCallback((id: string) => {
    setSelectedPack(id);
  }, []);

  const handlePurchase = useCallback(async () => {
    if (isPurchasing) return;
    const pack = BOOST_PACKS.find((p) => p.id === selectedPack);
    if (!pack) return;

    setIsPurchasing(true);
    try {
      // TODO: Integrate with real IAP when boost pack products are configured
      Alert.alert(
        'Başarılı!',
        `${pack.count} Boost hakkı hesabına eklendi.`,
        [{ text: 'Tamam', onPress: () => navigation.goBack() }],
      );
    } finally {
      setIsPurchasing(false);
    }
  }, [isPurchasing, selectedPack, navigation]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* Hero section */}
        <LinearGradient
          colors={[palette.purple[500], palette.pink[500], palette.purple[700]] as [string, string, string]}
          style={s.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Close button */}
          <TouchableOpacity
            style={s.closeButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={s.iconCircle}>
            <Text style={s.iconEmoji}>{'\u26A1'}</Text>
          </View>

          {/* Title */}
          <Text style={s.heroTitle}>Boost'ler</Text>
          <Text style={s.heroSubtitle}>
            24 saat boyunca profilini öne çıkar{'\n'}
            ve 10x daha fazla görünürlük kazan
          </Text>
        </LinearGradient>

        {/* Pack grid — scrollable */}
        <ScrollView
          style={s.packScroll}
          contentContainerStyle={s.packScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.packRow}>
            {BOOST_PACKS.slice(0, 2).map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                selected={selectedPack === pack.id}
                onSelect={handleSelect}
              />
            ))}
          </View>
          <View style={s.packRow}>
            {BOOST_PACKS.slice(2, 4).map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                selected={selectedPack === pack.id}
                onSelect={handleSelect}
              />
            ))}
          </View>
        </ScrollView>

        {/* CTA button — fixed at bottom */}
        <View style={s.ctaSection}>
          <TouchableOpacity
            style={s.ctaButton}
            onPress={handlePurchase}
            activeOpacity={0.85}
            disabled={isPurchasing}
          >
            <LinearGradient
              colors={[palette.purple[500], palette.pink[500]] as [string, string]}
              style={s.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={s.ctaText}>
                {isPurchasing ? 'İşleniyor...' : 'Devam'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  hero: {
    paddingTop: Platform.OS === 'ios' ? 16 : 40,
    paddingBottom: 32,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 40,
    left: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  iconEmoji: {
    fontSize: 36,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: fontWeights.regular,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  packScroll: {
    flex: 1,
  },
  packScrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  packRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ctaSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    paddingTop: spacing.md,
  },
  ctaButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  ctaText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
});
