// CompatibilityBottomSheet — Detailed compatibility breakdown overlay
// Triggered by tapping the compat % badge on a discovery card
// Shows: score, strong areas, differences, and conversation starters

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { compatibilityService } from '../../services/compatibilityService';
import type { DetailedCompatibilityResponse } from '../../services/compatibilityService';
import { colors, palette, glassmorphism } from '../../theme/colors';
import { typography, fontWeights } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.72;

interface CompatibilityBottomSheetProps {
  visible: boolean;
  targetUserId: string | null;
  onClose: () => void;
}

export const CompatibilityBottomSheet: React.FC<CompatibilityBottomSheetProps> = ({
  visible,
  targetUserId,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DetailedCompatibilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Animation
  const overlayOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SHEET_HEIGHT);
  const scoreWidth = useSharedValue(0);

  useEffect(() => {
    if (visible && targetUserId) {
      // Animate in
      overlayOpacity.value = withTiming(1, { duration: 250 });
      sheetTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });

      // Fetch data
      setIsLoading(true);
      setError(false);
      compatibilityService
        .getDetailedCompatibility(targetUserId)
        .then((response) => {
          setData(response);
          // Animate score bar
          scoreWidth.value = withDelay(300, withTiming(response.score, {
            duration: 800,
            easing: Easing.out(Easing.cubic),
          }));
        })
        .catch(() => {
          setError(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Animate out
      overlayOpacity.value = withTiming(0, { duration: 200 });
      sheetTranslateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
      // Reset
      setTimeout(() => {
        setData(null);
        scoreWidth.value = 0;
      }, 300);
    }
  }, [visible, targetUserId, overlayOpacity, sheetTranslateY, scoreWidth]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const scoreBarStyle = useAnimatedStyle(() => ({
    width: `${scoreWidth.value}%` as `${number}%`,
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Uyum Detayı</Text>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Kapat">
            <Text style={styles.closeText}>{'\u2715'}</Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={palette.purple[400]} />
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
          )}

          {error && (
            <View style={styles.loadingContainer}>
              <Text style={styles.errorText}>Uyum bilgisi yüklenemedi.</Text>
              <Pressable onPress={onClose} style={styles.retryButton}>
                <Text style={styles.retryText}>Kapat</Text>
              </Pressable>
            </View>
          )}

          {data && !isLoading && !error && (
            <>
              {/* Score bar */}
              <View style={styles.scoreSection}>
                <View style={styles.scoreBarTrack}>
                  <Animated.View style={[styles.scoreBarFill, scoreBarStyle]}>
                    <View style={[
                      styles.scoreBarGradient,
                      { backgroundColor: data.level === 'SUPER' ? palette.gold[400] : palette.purple[400] },
                    ]} />
                  </Animated.View>
                </View>
                <Text style={[
                  styles.scoreValue,
                  data.level === 'SUPER' && styles.scoreValueSuper,
                ]}>
                  %{data.score}
                  {data.level === 'SUPER' && ' \u2B50'}
                </Text>
              </View>

              {/* Strong areas */}
              {data.strongAreas.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{'\u2714'} Güçlü Alanlar</Text>
                  {data.strongAreas.map((area) => (
                    <View key={area.category} style={styles.areaCard}>
                      <Text style={styles.areaLabel}>{area.labelTr}</Text>
                      <Text style={styles.areaDescription}>{area.description}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Differences */}
              {data.differences.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{'\u26A0'} Potansiyel Farklılıklar</Text>
                  {data.differences.map((area) => (
                    <View key={area.category} style={styles.areaCard}>
                      <Text style={styles.areaLabel}>{area.labelTr}</Text>
                      <Text style={styles.areaDescription}>{area.description}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Conversation starters */}
              {data.conversationStarters.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{'\uD83D\uDCAC'} Sohbet Başlatıcı</Text>
                  {data.conversationStarters.map((starter, idx) => (
                    <View key={idx} style={styles.starterCard}>
                      <Text style={styles.starterText}>&ldquo;{starter}&rdquo;</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ height: spacing.xl }} />
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: glassmorphism.border,
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[900],
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: glassmorphism.border,
  },
  retryText: {
    ...typography.bodySmall,
    color: palette.purple[300],
    fontWeight: fontWeights.semibold,
  },
  // Score bar
  scoreSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  scoreBarTrack: {
    height: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  scoreBarGradient: {
    flex: 1,
    borderRadius: 5,
  },
  scoreValue: {
    ...typography.h3,
    color: palette.purple[300],
    fontWeight: fontWeights.bold,
  },
  scoreValueSuper: {
    color: palette.gold[300],
  },
  // Sections
  section: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  areaCard: {
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: glassmorphism.border,
    gap: 4,
  },
  areaLabel: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: palette.purple[300],
  },
  areaDescription: {
    fontSize: 14,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  // Conversation starters
  starterCard: {
    backgroundColor: glassmorphism.bgLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: glassmorphism.border,
  },
  starterText: {
    fontSize: 14,
    fontWeight: fontWeights.regular,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
