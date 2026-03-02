// Premium intro screen — dating app with couple imagery, pulsing heart, gradient CTA
// Each slide: real couple photo background + dark gradient overlay + animated text
// Founder Test Mode: DEV button (top-right) or long-press LUMA logo 3s on page 3

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
  Pressable,
  Alert,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  useAnimatedScrollHandler,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useTestModeStore } from '../../stores/testModeStore';
import { storage } from '../../utils/storage';
import { seedDevData } from '../../utils/devSeedData';
import { palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

type IntroNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'EmotionalIntro'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Overlay gradient — deep dark for text readability over couple photos */
const OVERLAY_GRADIENT: readonly [string, string, ...string[]] = [
  'rgba(7, 5, 26, 0.55)',
  'rgba(18, 10, 40, 0.72)',
  'rgba(26, 14, 48, 0.88)',
];

// ────────────────────────────────────────────
// Couple photo backgrounds (placeholder → replace with real stock photos)
// ────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-var-requires */
const SLIDE_IMAGES: ImageSourcePropType[] = [
  require('../../../assets/intro/couple-1.png'),
  require('../../../assets/intro/couple-2.png'),
  require('../../../assets/intro/couple-3.png'),
];
/* eslint-enable @typescript-eslint/no-var-requires */

// ────────────────────────────────────────────
// Data
// ────────────────────────────────────────────

interface IntroPage {
  id: string;
  title: string;
  subtitle: string;
  showLogo: boolean;
}

const PAGES: IntroPage[] = [
  {
    id: 'page-1',
    title: '\u015Eansa de\u011Fil,\nuyuma g\u00FCven.',
    subtitle: 'Ger\u00E7ek uyum, do\u011Fru sorularla ba\u015Flar.',
    showLogo: false,
  },
  {
    id: 'page-2',
    title: '20 soru.',
    subtitle: 'Ger\u00E7ek uyum i\u00E7in.',
    showLogo: false,
  },
  {
    id: 'page-3',
    title: '',
    subtitle: 'Tesad\u00FCf de\u011Fil. Uyumla.',
    showLogo: true,
  },
];

// ────────────────────────────────────────────
// Pulsing Heart — realistic heartbeat rhythm
// ────────────────────────────────────────────

const PulsingHeart: React.FC = () => {
  const heartScale = useSharedValue(0.88);
  const heartOpacity = useSharedValue(0.18);
  const glowScale = useSharedValue(0.85);
  const glowOpacity = useSharedValue(0.10);

  useEffect(() => {
    // Heartbeat: strong beat → small rebound → rest
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.14, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(0.94, { duration: 350, easing: Easing.in(Easing.cubic) }),
        withTiming(1.06, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0.88, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    heartOpacity.value = withRepeat(
      withSequence(
        withTiming(0.34, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(0.22, { duration: 350, easing: Easing.in(Easing.cubic) }),
        withTiming(0.30, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0.18, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    // Pink glow behind heart
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(0.90, { duration: 350, easing: Easing.in(Easing.cubic) }),
        withTiming(1.20, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0.85, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.28, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(0.08, { duration: 350, easing: Easing.in(Easing.cubic) }),
        withTiming(0.20, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0.10, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [heartScale, heartOpacity, glowScale, glowOpacity]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const heartGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.heartContainer} pointerEvents="none">
      <Animated.View style={[styles.heartGlow, heartGlowStyle]} />
      <Animated.Text style={[styles.heartText, heartStyle]}>
        {'\u2665'}
      </Animated.Text>
    </View>
  );
};

// ────────────────────────────────────────────
// Page content — fade + translateY + logo scale
// ────────────────────────────────────────────

const PageContent: React.FC<{
  page: IntroPage;
  isActive: boolean;
  onLogoLongPress?: () => void;
}> = ({ page, isActive, onLogoLongPress }) => {
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(14);
  const logoScale = useSharedValue(0.90);

  useEffect(() => {
    if (isActive) {
      titleOpacity.value = 0;
      titleTranslateY.value = 20;
      subtitleOpacity.value = 0;
      subtitleTranslateY.value = 14;
      logoScale.value = 0.90;

      titleOpacity.value = withDelay(
        200,
        withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }),
      );
      titleTranslateY.value = withDelay(
        200,
        withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) }),
      );
      subtitleOpacity.value = withDelay(
        550,
        withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
      );
      subtitleTranslateY.value = withDelay(
        550,
        withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }),
      );
      if (page.showLogo) {
        logoScale.value = withDelay(
          200,
          withTiming(1.0, { duration: 900, easing: Easing.out(Easing.cubic) }),
        );
      }
    }
  }, [isActive, titleOpacity, titleTranslateY, subtitleOpacity, subtitleTranslateY, logoScale, page.showLogo]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      { translateY: titleTranslateY.value },
      { scale: logoScale.value },
    ],
  }));

  return (
    <View style={styles.pageContent}>
      {page.showLogo && (
        <Pressable
          onLongPress={onLogoLongPress}
          delayLongPress={3000}
        >
          <Animated.Text style={[styles.logoText, logoStyle]}>
            LUMA
          </Animated.Text>
        </Pressable>
      )}
      {page.title !== '' && (
        <Animated.Text style={[styles.pageTitle, titleStyle]}>
          {page.title}
        </Animated.Text>
      )}
      {page.subtitle !== '' && (
        <Animated.Text style={[styles.pageSubtitle, subtitleStyle]}>
          {page.subtitle}
        </Animated.Text>
      )}
    </View>
  );
};

// ────────────────────────────────────────────
// Animated dot indicators
// ────────────────────────────────────────────

const AnimatedDot: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const dotWidth = useSharedValue(isActive ? 28 : 7);
  const dotOpacity = useSharedValue(isActive ? 1 : 0.3);

  useEffect(() => {
    dotWidth.value = withSpring(isActive ? 28 : 7, { damping: 15, stiffness: 200 });
    dotOpacity.value = withTiming(isActive ? 1 : 0.3, { duration: 300 });
  }, [isActive, dotWidth, dotOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: dotWidth.value,
    opacity: dotOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        isActive ? styles.dotActive : styles.dotInactive,
        animatedStyle,
      ]}
    />
  );
};

const DotIndicators: React.FC<{ activeIndex: number; total: number }> = ({
  activeIndex,
  total,
}) => (
  <View style={styles.dotsContainer}>
    {Array.from({ length: total }, (_, i) => (
      <AnimatedDot key={`dot-${i}`} isActive={i === activeIndex} />
    ))}
  </View>
);

// ────────────────────────────────────────────
// Gradient CTA button with glow + spring press
// ────────────────────────────────────────────

const GradientCTAButton: React.FC<{
  label: string;
  onPress: () => void;
}> = ({ label, onPress }) => {
  const pressScale = useSharedValue(1);
  const ctaGlowOpacity = useSharedValue(0.25);
  const ctaGlowScale = useSharedValue(1);

  useEffect(() => {
    ctaGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.25, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    ctaGlowScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [ctaGlowOpacity, ctaGlowScale]);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [pressScale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const ctaGlowStyle = useAnimatedStyle(() => ({
    opacity: ctaGlowOpacity.value,
    transform: [{ scale: ctaGlowScale.value }],
  }));

  return (
    <Animated.View style={[styles.ctaWrapper, buttonStyle]}>
      <Animated.View style={[styles.ctaGlowBg, ctaGlowStyle]} />
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={1}
        style={styles.ctaTouchable}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[palette.purple[500], palette.pink[500]] as [string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ────────────────────────────────────────────
// Glass-morphism secondary button
// ────────────────────────────────────────────

const GlassButton: React.FC<{
  label: string;
  onPress: () => void;
}> = ({ label, onPress }) => (
  <TouchableOpacity
    style={styles.glassButton}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityLabel={label}
    accessibilityRole="button"
  >
    <Text style={styles.glassButtonText}>{label}</Text>
  </TouchableOpacity>
);

// ────────────────────────────────────────────
// Founder Test Panel (__DEV__ only)
// ────────────────────────────────────────────

const FounderTestPanel: React.FC<{
  visible: boolean;
  onClose: () => void;
  onFounderLogin: () => void;
  onNormalTest: () => void;
}> = ({ visible, onClose, onFounderLogin, onNormalTest }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={styles.testPanel}>
        <Text style={styles.testPanelTitle}>Founder Test Modu</Text>
        <Text style={styles.testPanelSubtitle}>
          Sadece geli\u015Ftirme modunda g\u00F6r\u00FCn\u00FCr
        </Text>

        <TouchableOpacity
          style={styles.testPanelButton}
          onPress={onFounderLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.testPanelButtonText}>
            Founder Giri\u015Fi (Tam Atla)
          </Text>
          <Text style={styles.testPanelButtonDesc}>
            Auth + onboarding atla, mock data ile MainTabs&apos;a git
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testPanelButton, styles.testPanelButtonOutline]}
          onPress={onNormalTest}
          activeOpacity={0.8}
        >
          <Text style={styles.testPanelButtonText}>
            Normal Test (Ak\u0131\u015F \u0130\u00E7i)
          </Text>
          <Text style={styles.testPanelButtonDesc}>
            OTP: 000000 otomatik, selfie otomatik onayla
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose}>
          <Text style={styles.testPanelCancel}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ────────────────────────────────────────────
// Main screen
// ────────────────────────────────────────────

const AnimatedFlatList = Animated.FlatList<IntroPage>;

const EmotionalIntroScreen: React.FC = () => {
  const navigation = useNavigation<IntroNavigationProp>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const flatListRef = useRef<Animated.FlatList<IntroPage>>(null);
  const scrollX = useSharedValue(0);
  const isLastPage = activeIndex === PAGES.length - 1;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // Navigation handlers
  const handleStartTest = useCallback(() => {
    navigation.navigate('PhoneEntry');
  }, [navigation]);

  const handleGoogleAuth = useCallback(() => {
    // Google OAuth not yet integrated
    Alert.alert(
      'Google ile Giri\u015F',
      'Google ile giri\u015F yak\u0131nda aktif olacak. \u015Eimdilik telefon numaran\u0131 ile devam edebilirsin.',
    );
  }, []);

  const handleLogin = useCallback(() => {
    navigation.navigate('PhoneEntry');
  }, [navigation]);

  // Page scroll with haptic
  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (newIndex !== activeIndex) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveIndex(newIndex);
      }
    },
    [activeIndex],
  );

  // Founder Test Mode handlers
  const handleFounderLogin = useCallback(async () => {
    setShowTestPanel(false);
    const { login, setOnboarded } = useAuthStore.getState();
    login('dev-access-token', 'dev-refresh-token', {
      id: 'dev-user-001',
      phone: '+90 555 555 5555',
      isVerified: true,
      packageTier: 'reserved',
    });
    setOnboarded(true);
    await storage.setTokens('dev-access-token', 'dev-refresh-token');
    await storage.setOnboarded(true);
    seedDevData();
  }, []);

  const handleNormalTest = useCallback(() => {
    setShowTestPanel(false);
    useTestModeStore.getState().setTestMode(true);
    navigation.navigate('PhoneEntry');
  }, [navigation]);

  const handleLogoLongPress = useCallback(() => {
    if (__DEV__) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setShowTestPanel(true);
    }
  }, []);

  const handleDevPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTestPanel(true);
  }, []);

  // FlatList renderers — each slide has couple photo background + overlay
  const renderPage = useCallback(
    ({ item, index }: { item: IntroPage; index: number }) => (
      <View style={styles.page}>
        {/* Couple photo background */}
        <Image
          source={SLIDE_IMAGES[index]}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        {/* Dark gradient overlay for text readability */}
        <LinearGradient
          colors={OVERLAY_GRADIENT}
          style={StyleSheet.absoluteFillObject}
        />
        <PageContent
          page={item}
          isActive={index === activeIndex}
          onLogoLongPress={handleLogoLongPress}
        />
      </View>
    ),
    [activeIndex, handleLogoLongPress],
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

      {/* Base dark background — couple photos are per-slide */}
      <View style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#07051A' }]} />
      </View>

      {/* Pulsing heart — grows and shrinks like a heartbeat, overlaid on photos */}
      <PulsingHeart />

      {/* DEV test button — visible only in development mode */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.devButton}
          onPress={handleDevPress}
          activeOpacity={0.7}
        >
          <Text style={styles.devButtonText}>DEV</Text>
        </TouchableOpacity>
      )}

      {/* Swipeable pages — manual only */}
      <AnimatedFlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        bounces={false}
        style={styles.flatList}
      />

      {/* Bottom: dots + auth section on last page */}
      <View style={styles.bottomSection}>
        <DotIndicators activeIndex={activeIndex} total={PAGES.length} />

        {isLastPage && (
          <View style={styles.authSection}>
            <GradientCTAButton
              label="Uyumluluk testine ba\u015Fla"
              onPress={handleStartTest}
            />
            <GlassButton
              label="Google ile devam et"
              onPress={handleGoogleAuth}
            />
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.7}
              accessibilityLabel="Giri\u015F yap"
              accessibilityRole="link"
            >
              <Text style={styles.loginText}>
                {'Hesab\u0131n var m\u0131? '}
                <Text style={styles.loginLink}>Giri\u015F yap</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Founder Test Mode modal — __DEV__ only */}
      {__DEV__ && (
        <FounderTestPanel
          visible={showTestPanel}
          onClose={() => setShowTestPanel(false)}
          onFounderLogin={handleFounderLogin}
          onNormalTest={handleNormalTest}
        />
      )}
    </View>
  );
};

export default EmotionalIntroScreen;

// ────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07051A',
  },
  // Pulsing heart
  heartContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.28,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  heartGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.pink[600],
    ...Platform.select({
      ios: {
        shadowColor: palette.pink[400],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 70,
      },
      android: {},
    }),
  },
  heartText: {
    fontSize: 140,
    color: palette.pink[400],
    textAlign: 'center',
    lineHeight: 160,
  },
  // DEV button
  devButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  devButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.purple[300],
    letterSpacing: 1,
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
    overflow: 'hidden',
  },
  pageContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 24,
    marginBottom: spacing.xl,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(168, 85, 247, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 30,
      },
      android: {},
    }),
  },
  pageTitle: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -0.5,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(236, 72, 153, 0.3)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
      },
      android: {},
    }),
  },
  pageSubtitle: {
    fontSize: 17,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.3,
    paddingHorizontal: spacing.lg,
  },
  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: palette.pink[400],
    ...Platform.select({
      ios: {
        shadowColor: palette.pink[400],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
      },
      android: {},
    }),
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  // Bottom section
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
  },
  authSection: {
    width: '100%',
    gap: spacing.md,
    alignItems: 'center',
  },
  // CTA button
  ctaWrapper: {
    width: '100%',
  },
  ctaGlowBg: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: -8,
    bottom: -8,
    borderRadius: borderRadius.lg,
    backgroundColor: palette.pink[600],
    ...Platform.select({
      ios: {
        shadowColor: palette.pink[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  ctaTouchable: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  ctaGradient: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  // Glass button
  glassButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.2,
  },
  // Login link
  loginText: {
    fontSize: 14,
    fontWeight: '400',
    color: palette.gray[500],
    marginTop: spacing.xs,
  },
  loginLink: {
    color: palette.pink[400],
    fontWeight: '600',
  },
  // Test panel modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  testPanel: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.purple[800],
  },
  testPanelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  testPanelSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: palette.gray[500],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  testPanelButton: {
    backgroundColor: palette.purple[800],
    borderRadius: 14,
    padding: spacing.md,
    gap: 4,
  },
  testPanelButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: palette.purple[600],
  },
  testPanelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  testPanelButtonDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: palette.gray[400],
  },
  testPanelCancel: {
    fontSize: 14,
    fontWeight: '500',
    color: palette.gray[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
