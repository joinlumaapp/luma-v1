// Emotional intro screen — 3-page horizontal swipeable intro with auto-advance
// Premium dark gradient, Reanimated v4 fade-in text, dot indicators, skip/start buttons

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { LumaLogo } from '../../components/animations/LumaLogo';

type EmotionalIntroNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'EmotionalIntro'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Auto-advance interval in milliseconds */
const AUTO_ADVANCE_INTERVAL = 4000;

/** Gradient background colors */
const GRADIENT_COLORS: readonly [string, string, ...string[]] = [
  '#0F0F23',
  '#1A0A3E',
  '#2D1B69',
];

// Page content definitions
interface IntroPage {
  id: string;
  title: string;
  subtitle: string;
  showLogo: boolean;
}

const PAGES: IntroPage[] = [
  {
    id: 'page-1',
    title: 'Bir ba\u011Flant\u0131 hayal et...',
    subtitle: 'Ger\u00E7ekten seni anlayan biriyle...',
    showLogo: false,
  },
  {
    id: 'page-2',
    title: 'Y\u00FCzeysel de\u011Fil, ger\u00E7ek uyumluluk',
    subtitle: 'Bilimsel uyumluluk analizi ile',
    showLogo: false,
  },
  {
    id: 'page-3',
    title: 'Tesad\u00FCfen de\u011Fil. Uyumlulukla.',
    subtitle: '',
    showLogo: true,
  },
];

// Animated text component for fade-in entrance
const AnimatedPageContent: React.FC<{
  page: IntroPage;
  isActive: boolean;
}> = ({ page, isActive }) => {
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(15);

  useEffect(() => {
    if (isActive) {
      // Reset then animate in
      titleOpacity.value = 0;
      titleTranslateY.value = 20;
      subtitleOpacity.value = 0;
      subtitleTranslateY.value = 15;

      titleOpacity.value = withDelay(
        200,
        withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
      );
      titleTranslateY.value = withDelay(
        200,
        withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
      );
      subtitleOpacity.value = withDelay(
        500,
        withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
      );
      subtitleTranslateY.value = withDelay(
        500,
        withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [isActive, titleOpacity, titleTranslateY, subtitleOpacity, subtitleTranslateY]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  return (
    <View style={styles.pageContent}>
      {page.showLogo && (
        <View style={styles.logoWrapper}>
          <LumaLogo size={1.2} showTagline={false} />
        </View>
      )}
      <Animated.Text style={[styles.pageTitle, titleStyle]}>
        {page.title}
      </Animated.Text>
      {page.subtitle !== '' && (
        <Animated.Text style={[styles.pageSubtitle, subtitleStyle]}>
          {page.subtitle}
        </Animated.Text>
      )}
    </View>
  );
};

// Dot indicator component
const DotIndicators: React.FC<{ activeIndex: number; total: number }> = ({
  activeIndex,
  total,
}) => {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={`dot-${i}`}
          style={[
            styles.dot,
            i === activeIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
};

const EmotionalIntroScreen: React.FC = () => {
  const navigation = useNavigation<EmotionalIntroNavigationProp>();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<IntroPage>>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLastPage = activeIndex === PAGES.length - 1;

  // Use theme for potential dark/light awareness (premium dark feel)
  useTheme();

  // Auto-advance timer
  const startAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearInterval(autoAdvanceTimer.current);
    }
    autoAdvanceTimer.current = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = prev < PAGES.length - 1 ? prev + 1 : prev;
        if (nextIndex !== prev && flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
        }
        // Stop auto-advance on last page
        if (nextIndex === PAGES.length - 1 && autoAdvanceTimer.current) {
          clearInterval(autoAdvanceTimer.current);
          autoAdvanceTimer.current = null;
        }
        return nextIndex;
      });
    }, AUTO_ADVANCE_INTERVAL);
  }, []);

  useEffect(() => {
    startAutoAdvance();
    return () => {
      if (autoAdvanceTimer.current) {
        clearInterval(autoAdvanceTimer.current);
      }
    };
  }, [startAutoAdvance]);

  const handleSkip = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearInterval(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    navigation.navigate('Welcome');
  }, [navigation]);

  const handleStart = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearInterval(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    navigation.navigate('Welcome');
  }, [navigation]);

  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
        // Reset auto-advance on manual swipe
        if (newIndex < PAGES.length - 1) {
          startAutoAdvance();
        } else if (autoAdvanceTimer.current) {
          clearInterval(autoAdvanceTimer.current);
          autoAdvanceTimer.current = null;
        }
      }
    },
    [activeIndex, startAutoAdvance],
  );

  const renderPage = useCallback(
    ({ item, index }: { item: IntroPage; index: number }) => {
      return (
        <View style={styles.page}>
          <AnimatedPageContent page={item} isActive={index === activeIndex} />
        </View>
      );
    },
    [activeIndex],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<IntroPage> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Gradient background */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip button (top-right) — hidden on last page */}
      {!isLastPage && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          accessibilityLabel="Atla"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Atla</Text>
        </TouchableOpacity>
      )}

      {/* Swipeable pages */}
      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={getItemLayout}
        bounces={false}
        style={styles.flatList}
      />

      {/* Bottom area: dots + start button */}
      <View style={styles.bottomSection}>
        <DotIndicators activeIndex={activeIndex} total={PAGES.length} />

        {isLastPage && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            activeOpacity={0.85}
            accessibilityLabel="Ba\u015Fla"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[palette.purple[600], palette.pink[500]] as [string, string]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>Ba\u015Fla</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default EmotionalIntroScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  flatList: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  pageContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  logoWrapper: {
    marginBottom: spacing.xl,
  },
  pageTitle: {
    ...typography.h2,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: 0.5,
    lineHeight: 36,
  },
  pageSubtitle: {
    ...typography.bodyLarge,
    color: palette.gray[400],
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 26,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    right: spacing.lg,
    zIndex: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    ...typography.body,
    color: palette.gray[500],
    fontWeight: '600',
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl + 10 : spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: palette.purple[400],
    width: 24,
  },
  dotInactive: {
    backgroundColor: palette.gray[700],
  },
  startButton: {
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  startButtonGradient: {
    height: 58,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
