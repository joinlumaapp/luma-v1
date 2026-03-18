// LUMA V1 -- Derin Uyumluluk Analizi Ekranı
// Radar chart ile 7 uyumluluk boyutunu görselleştirir
// Premium kullanıcılara özel detaylı analiz

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { compatibilityService } from '../../services/compatibilityService';
import { useAuthStore } from '../../stores/authStore';
import { useScreenTracking } from '../../hooks/useAnalytics';

// ─── Types ────────────────────────────────────────────────────

type NavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'CompatibilityInsight'>;
type ScreenRouteProp = RouteProp<MatchesStackParamList, 'CompatibilityInsight'>;

interface DimensionData {
  key: string;
  labelTr: string;
  descriptionTr: string;
  score: number;
  isPremiumLocked: boolean;
  color: string;
}

interface CompatibilityData {
  finalScore: number;
  level: 'NORMAL' | 'SUPER';
  dimensions: DimensionData[];
}

// ─── Constants ────────────────────────────────────────────────

const DIMENSION_LABELS: Array<{
  key: string;
  labelTr: string;
  descriptionTr: string;
  categories: string[];
  color: string;
}> = [
  {
    key: 'communication',
    labelTr: 'İletişim Uyumu',
    descriptionTr:
      'İletişim tarzlarınızın ne kadar uyumlu olduğunu gösterir. Aynı dili konuşmak, ilişkinin temelidir.',
    categories: ['communication'],
    color: palette.purple[400],
  },
  {
    key: 'life_goals',
    labelTr: 'Yaşam Hedefleri',
    descriptionTr:
      'Hayattan ne beklediğiniz ve gelecek vizyonunuzun ne kadar örtüştüğünün göstergesidir.',
    categories: ['life_goals', 'future_vision'],
    color: palette.pink[400],
  },
  {
    key: 'values',
    labelTr: 'Değerler',
    descriptionTr:
      'Temel değerlerinizin ve hayata bakış açınızın ne kadar uyumlu olduğunu ölçer.',
    categories: ['values'],
    color: palette.gold[400],
  },
  {
    key: 'lifestyle',
    labelTr: 'Yaşam Tarzı',
    descriptionTr:
      'Günlük rutinler, hobiler ve yaşam tercihleri açısından ne kadar uyumlu olduğunuzu gösterir.',
    categories: ['lifestyle'],
    color: '#10B981',
  },
  {
    key: 'emotional_intelligence',
    labelTr: 'Duygusal Zeka',
    descriptionTr:
      'Duyguları anlama, ifade etme ve empati kurma becerinizin ne kadar örtüştüğünün ölçüsüdür.',
    categories: ['emotional_intelligence', 'attachment_style'],
    color: '#3B82F6',
  },
  {
    key: 'relationship_expectations',
    labelTr: 'İlişki Beklentileri',
    descriptionTr:
      'Bir ilişkiden ne beklediğiniz, sevgi dili ve yakınlık anlayışınızın uyumu.',
    categories: ['relationship_expectations', 'love_language', 'intimacy'],
    color: '#F472B6',
  },
  {
    key: 'social_compatibility',
    labelTr: 'Sosyal Uyum',
    descriptionTr:
      'Sosyal çevre, arkadaş ilişkileri ve toplumsal yaklaşımlarınızın ne kadar benzer olduğunu ölçer.',
    categories: ['social_compatibility', 'intellectual'],
    color: '#8B5CF6',
  },
];

// Premium-locked dimensions for free users (last 3)
const PREMIUM_LOCKED_DIMENSION_KEYS = [
  'emotional_intelligence',
  'relationship_expectations',
  'social_compatibility',
];

// ─── Radar Chart Component ────────────────────────────────────

const RADAR_SIZE = 260;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 100;
const POINT_COUNT = 7;

interface RadarChartProps {
  scores: number[]; // 0-100 for each of 7 dimensions
  dimensionColors: string[];
  lockedIndices: number[];
}

const RadarChart: React.FC<RadarChartProps> = ({
  scores,
  dimensionColors,
  lockedIndices,
}) => {
  const getPoint = (index: number, radius: number): { x: number; y: number } => {
    // Start from top (- PI/2) and go clockwise
    const angle = (Math.PI * 2 * index) / POINT_COUNT - Math.PI / 2;
    return {
      x: RADAR_CENTER + radius * Math.cos(angle),
      y: RADAR_CENTER + radius * Math.sin(angle),
    };
  };

  // Generate grid rings (20%, 40%, 60%, 80%, 100%)
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Generate score points
  const scorePoints = scores.map((score, i) => {
    const normalizedRadius = (score / 100) * RADAR_RADIUS;
    return getPoint(i, normalizedRadius);
  });

  return (
    <View style={radarStyles.container}>
      {/* Grid rings */}
      {rings.map((ring, ringIndex) => {
        const ringRadius = RADAR_RADIUS * ring;
        return (
          <View
            key={`ring-${ringIndex}`}
            style={[
              radarStyles.ring,
              {
                width: ringRadius * 2,
                height: ringRadius * 2,
                borderRadius: ringRadius,
                left: RADAR_CENTER - ringRadius,
                top: RADAR_CENTER - ringRadius,
              },
            ]}
          />
        );
      })}

      {/* Axis lines */}
      {Array.from({ length: POINT_COUNT }).map((_, i) => {
        const angle = (360 * i) / POINT_COUNT - 90;
        return (
          <View
            key={`axis-${i}`}
            style={[
              radarStyles.axisLine,
              {
                width: RADAR_RADIUS,
                left: RADAR_CENTER,
                top: RADAR_CENTER,
                transform: [
                  { translateX: 0 },
                  { translateY: -0.5 },
                  { rotate: `${angle}deg` },
                  { translateX: RADAR_RADIUS / 2 },
                ],
              },
            ]}
          />
        );
      })}

      {/* Score area polygon (approximated with positioned dots and connections) */}
      {scorePoints.map((point, i) => {
        const nextPoint = scorePoints[(i + 1) % POINT_COUNT];
        const isLocked = lockedIndices.includes(i);

        // Line from this point to next
        const dx = nextPoint.x - point.x;
        const dy = nextPoint.y - point.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <View key={`line-${i}`}>
            {/* Connection line */}
            <View
              style={[
                radarStyles.scoreLine,
                {
                  width: length,
                  left: point.x,
                  top: point.y - 1,
                  transform: [{ rotate: `${angleDeg}deg` }],
                  transformOrigin: 'left center',
                  backgroundColor: isLocked
                    ? colors.textTertiary + '40'
                    : colors.primary + '80',
                },
              ]}
            />
          </View>
        );
      })}

      {/* Score dots */}
      {scorePoints.map((point, i) => {
        const isLocked = lockedIndices.includes(i);
        return (
          <View
            key={`dot-${i}`}
            style={[
              radarStyles.scoreDot,
              {
                left: point.x - 5,
                top: point.y - 5,
                backgroundColor: isLocked
                  ? colors.textTertiary
                  : dimensionColors[i],
                borderColor: isLocked
                  ? colors.textTertiary + '60'
                  : dimensionColors[i] + '60',
              },
            ]}
          />
        );
      })}

      {/* Dimension labels around the chart */}
      {DIMENSION_LABELS.map((_dim, i) => {
        const labelPoint = getPoint(i, RADAR_RADIUS + 36);
        const isLocked = lockedIndices.includes(i);
        return (
          <View
            key={`label-${i}`}
            style={[
              radarStyles.dimensionLabel,
              {
                left: labelPoint.x - 40,
                top: labelPoint.y - 10,
              },
            ]}
          >
            <Text
              style={[
                radarStyles.dimensionLabelText,
                isLocked && radarStyles.dimensionLabelLocked,
              ]}
              numberOfLines={2}
            >
              {isLocked ? '***' : `${scores[i]}%`}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const radarStyles = StyleSheet.create({
  container: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.surfaceBorder + '60',
  },
  axisLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: colors.surfaceBorder + '40',
  },
  scoreLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  scoreDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  dimensionLabel: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
  },
  dimensionLabelText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  dimensionLabelLocked: {
    color: colors.textTertiary,
  },
});

// ─── Main Screen Component ────────────────────────────────────

export const CompatibilityInsightScreen: React.FC = () => {
  useScreenTracking('CompatibilityInsight');

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { matchId, partnerName } = route.params;

  const packageTier = useAuthStore((state) => state.user?.packageTier ?? 'FREE');
  // Dimensions are locked for Free and Gold users (need Pro or Reserved to unlock all 7)
  const isFreeUser = packageTier === 'FREE' || packageTier === 'GOLD';

  const [isLoading, setIsLoading] = useState(true);
  const [compatibilityData, setCompatibilityData] = useState<CompatibilityData | null>(null);
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const loadCompatibilityData = useCallback(async () => {
    try {
      setIsLoading(true);
      const score = await compatibilityService.getScoreWithUser(matchId);

      // Backend returns breakdown as Record<string, number> (category -> score)
      const breakdown: Record<string, number> =
        (score.breakdown && typeof score.breakdown === 'object' && !Array.isArray(score.breakdown))
          ? score.breakdown as Record<string, number>
          : {};

      // Map raw category scores to 7 dimension scores
      const dimensions: DimensionData[] = DIMENSION_LABELS.map((dim) => {
        const categoryScores = dim.categories
          .map((cat) => {
            // Try both uppercase and lowercase category keys
            return breakdown[cat] ?? breakdown[cat.toUpperCase()] ?? undefined;
          })
          .filter((s): s is number => s !== undefined);

        const avgScore =
          categoryScores.length > 0
            ? Math.round(
                categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length,
              )
            : 0;

        const isPremiumLocked =
          isFreeUser && PREMIUM_LOCKED_DIMENSION_KEYS.includes(dim.key);

        return {
          key: dim.key,
          labelTr: dim.labelTr,
          descriptionTr: dim.descriptionTr,
          score: isPremiumLocked ? 0 : avgScore,
          isPremiumLocked,
          color: dim.color,
        };
      });

      setCompatibilityData({
        finalScore: score.finalScore,
        level: score.level === 'SUPER' ? 'SUPER' : 'NORMAL',
        dimensions,
      });

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch {
      // Silently handle — show empty state
    } finally {
      setIsLoading(false);
    }
  }, [matchId, isFreeUser, fadeAnim]);

  useEffect(() => {
    loadCompatibilityData();
  }, [loadCompatibilityData]);

  const getScoreColor = (score: number): string => {
    if (score >= 90) return colors.success;
    if (score >= 70) return colors.accent;
    if (score >= 50) return colors.warning;
    return colors.error;
  };

  const getLevelBadge = (
    level: 'NORMAL' | 'SUPER',
  ): { text: string; color: string; bgColor: string } => {
    if (level === 'SUPER') {
      return {
        text: 'Süper Uyum',
        color: colors.accent,
        bgColor: colors.accent + '20',
      };
    }
    return {
      text: 'Normal Uyum',
      color: colors.primary,
      bgColor: colors.primary + '20',
    };
  };

  const toggleDimension = (key: string) => {
    setExpandedDimension((prev) => (prev === key ? null : key));
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Uyum analizi hazırlanıyor...</Text>
        <TouchableOpacity
          style={{ marginTop: 24 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.retryText, { color: colors.textSecondary }]}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!compatibilityData) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Uyum verisi yüklenemedi</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadCompatibilityData}
        >
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.retryButton, { marginTop: 12, backgroundColor: 'transparent' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.retryText, { color: colors.textSecondary }]}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = getLevelBadge(compatibilityData.level);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Uyum Analizi</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Partner name and overall score */}
          <View style={styles.overallSection}>
            <Text style={styles.partnerLabel}>
              {partnerName} ile Uyumunuz
            </Text>

            {/* Big score circle */}
            <View
              style={[
                styles.scoreCircle,
                {
                  borderColor: getScoreColor(compatibilityData.finalScore),
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreValue,
                  { color: getScoreColor(compatibilityData.finalScore) },
                ]}
              >
                %{compatibilityData.finalScore}
              </Text>
              <Text style={styles.scoreLabel}>Genel Uyum</Text>
            </View>

            {/* Level badge */}
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: badge.bgColor },
              ]}
            >
              {compatibilityData.level === 'SUPER' && (
                <Text style={[styles.levelStar, { color: badge.color }]}>
                  {'\u2605'}{' '}
                </Text>
              )}
              <Text style={[styles.levelText, { color: badge.color }]}>
                {badge.text}
              </Text>
            </View>
          </View>

          {/* Radar Chart */}
          <View style={styles.radarSection}>
            <Text style={styles.sectionTitle}>7 Boyutlu Uyum Haritası</Text>
            <View style={styles.radarContainer}>
              <RadarChart
                scores={compatibilityData.dimensions.map((d) => d.score)}
                dimensionColors={compatibilityData.dimensions.map((d) => d.color)}
                lockedIndices={compatibilityData.dimensions
                  .map((d, i) => (d.isPremiumLocked ? i : -1))
                  .filter((i) => i >= 0)}
              />
            </View>
          </View>

          {/* Dimension breakdown */}
          <View style={styles.dimensionsSection}>
            <Text style={styles.sectionTitle}>Boyut Detayları</Text>

            {compatibilityData.dimensions.map((dim) => (
              <View key={dim.key} style={styles.dimensionCard}>
                {/* Dimension header */}
                <TouchableOpacity
                  style={styles.dimensionHeader}
                  onPress={() => {
                    if (!dim.isPremiumLocked) {
                      toggleDimension(dim.key);
                    }
                  }}
                  activeOpacity={dim.isPremiumLocked ? 1 : 0.7}
                >
                  <View style={styles.dimensionInfo}>
                    <View
                      style={[
                        styles.dimensionDot,
                        {
                          backgroundColor: dim.isPremiumLocked
                            ? colors.textTertiary
                            : dim.color,
                        },
                      ]}
                    />
                    <Text style={styles.dimensionName}>{dim.labelTr}</Text>
                  </View>

                  {dim.isPremiumLocked ? (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>
                      <Text style={styles.lockText}>Pro</Text>
                    </View>
                  ) : (
                    <View style={styles.dimensionScoreContainer}>
                      <Text
                        style={[
                          styles.dimensionScore,
                          { color: getScoreColor(dim.score) },
                        ]}
                      >
                        %{dim.score}
                      </Text>
                      <Text style={styles.expandIcon}>
                        {expandedDimension === dim.key ? '\u25B2' : '\u25BC'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Score bar */}
                {!dim.isPremiumLocked && (
                  <View style={styles.dimensionBar}>
                    <View
                      style={[
                        styles.dimensionBarFill,
                        {
                          width: `${dim.score}%`,
                          backgroundColor: dim.color,
                        },
                      ]}
                    />
                  </View>
                )}

                {dim.isPremiumLocked && (
                  <View style={styles.dimensionBar}>
                    <View style={styles.dimensionBarLocked} />
                  </View>
                )}

                {/* Expandable explanation — "Bu ne anlama geliyor?" */}
                {expandedDimension === dim.key && !dim.isPremiumLocked && (
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationTitle}>
                      Bu ne anlama geliyor?
                    </Text>
                    <Text style={styles.explanationText}>
                      {dim.descriptionTr}
                    </Text>
                    {dim.score >= 80 && (
                      <View style={styles.insightBadge}>
                        <Text style={styles.insightText}>
                          Bu alanda muhteşem bir uyumunuz var!
                        </Text>
                      </View>
                    )}
                    {dim.score >= 50 && dim.score < 80 && (
                      <View
                        style={[
                          styles.insightBadge,
                          { backgroundColor: colors.warning + '15' },
                        ]}
                      >
                        <Text
                          style={[styles.insightText, { color: colors.warning }]}
                        >
                          İyi bir temel var, birlikte geliştirebilirsiniz.
                        </Text>
                      </View>
                    )}
                    {dim.score < 50 && (
                      <View
                        style={[
                          styles.insightBadge,
                          { backgroundColor: colors.info + '15' },
                        ]}
                      >
                        <Text
                          style={[styles.insightText, { color: colors.info }]}
                        >
                          Farklılıklar ilişkiyi zenginleştirebilir. Anlayış
                          önemli!
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Upgrade CTA for locked dimension users */}
          {isFreeUser && (
            <View style={styles.premiumCta}>
              <Text style={styles.premiumCtaTitle}>
                Tüm Boyutları Aç
              </Text>
              <Text style={styles.premiumCtaSubtitle}>
                Pro ile 7 boyutun tamamını gör ve ruh eşini bul!
              </Text>
              <TouchableOpacity
                style={styles.premiumCtaButton}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MembershipPlans')}
              >
                <Text style={styles.premiumCtaButtonText}>
                  Pro'ya Yükselt
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Overall insight */}
          <View style={styles.overallInsight}>
            <Text style={styles.overallInsightTitle}>
              Genel Değerlendirme
            </Text>
            <Text style={styles.overallInsightText}>
              {compatibilityData.finalScore >= 90
                ? `${partnerName} ile aranızda olağanüstü bir uyum var. Değerleriniz, yaşam hedefleriniz ve iletişim tarzlarınız birbirini tamamlıyor. Bu, nadir bulunan bir bağlantı!`
                : compatibilityData.finalScore >= 70
                  ? `${partnerName} ile iyi bir uyum içerisindesiniz. Bazı alanlarda çok güçlü bir bağlantınız var. Birbirinizi tanıdıkça bu uyum daha da güçlenir.`
                  : compatibilityData.finalScore >= 50
                    ? `${partnerName} ile ortaklığınız var ama farklılıklar da mevcut. Bu farklılıklar, doğru iletişimle ilişkiyi zenginleştirebilir.`
                    : `${partnerName} ile farklı bakış açılarına sahipsiniz. Farklılıklar her zaman kötü değildir — önemli olan anlayış ve saygıdır.`}
            </Text>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: spacing.xxl }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: {
    ...typography.button,
    color: colors.text,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    ...typography.h4,
    color: colors.text,
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // Overall score section
  overallSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  partnerLabel: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.glow,
  },
  scoreValue: {
    ...typography.h1,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  scoreLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: -2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  levelStar: {
    fontSize: 16,
  },
  levelText: {
    ...typography.bodySmall,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },

  // Radar section
  radarSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  radarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    ...shadows.medium,
  },

  // Dimensions section
  dimensionsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  dimensionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  dimensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dimensionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dimensionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  dimensionName: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  dimensionScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dimensionScore: {
    ...typography.bodyLarge,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  expandIcon: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  dimensionBar: {
    height: 6,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dimensionBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  dimensionBarLocked: {
    height: '100%',
    width: '100%',
    backgroundColor: colors.textTertiary + '30',
    borderRadius: 3,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceBorder,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  lockIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  lockText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // Explanation
  explanationContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  explanationTitle: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  explanationText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  insightBadge: {
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  insightText: {
    ...typography.captionSmall,
    color: colors.success,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },

  // Premium CTA
  premiumCta: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    alignItems: 'center',
    ...shadows.medium,
  },
  premiumCtaTitle: {
    ...typography.h4,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  premiumCtaSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  premiumCtaButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  premiumCtaButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },

  // Overall insight
  overallInsight: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.small,
  },
  overallInsightTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  overallInsightText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
