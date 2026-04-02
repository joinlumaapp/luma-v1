// InstantConnectScreen — "Canlı Keşfet" 1:1 random video chat flow
// Flow: Confirm → Searching (camera placeholder) → Connected (matched user overlay)
// User spends 50 coins to start, 25 coins to skip to next match

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInstantConnectStore } from '../../stores/instantConnectStore';
import { useCoinStore, SURPRISE_MATCH_COST, SURPRISE_SWITCH_COST } from '../../stores/coinStore';
import { CachedAvatar } from '../../components/common/CachedAvatar';
import { palette } from '../../theme/colors';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { spacing, borderRadius } from '../../theme/spacing';
import * as Haptics from 'expo-haptics';

type Phase = 'confirm' | 'searching' | 'connected';

// ─── Confirm Phase ──────────────────────────────────────────────────────────

const ConfirmPhase: React.FC<{
  coinBalance: number;
  onStart: () => void;
}> = ({ coinBalance, onStart }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, [pulseAnim, glowAnim]);

  const hasEnoughCoins = coinBalance >= SURPRISE_MATCH_COST;

  return (
    <View style={confirmStyles.container}>
      {/* Camera icon with pulse */}
      <Animated.View style={[confirmStyles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Animated.View style={[confirmStyles.iconGlow, { opacity: glowAnim }]} />
        <View style={confirmStyles.iconInner}>
          <Ionicons name="videocam" size={48} color="#FFFFFF" />
        </View>
      </Animated.View>

      {/* Title */}
      <Text style={confirmStyles.title}>Canlı Keşfet</Text>
      <Text style={confirmStyles.subtitle}>
        {'Kameran açılacak ve rastgele biriyle\ngörüntülü sohbet başlayacak.'}
      </Text>

      {/* Camera warning pill */}
      <View style={confirmStyles.warningPill}>
        <Text style={confirmStyles.warningEmoji}>{'\uD83D\uDCF9'}</Text>
        <Text style={confirmStyles.warningText}>Kamera kullanılacak</Text>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        onPress={onStart}
        activeOpacity={0.85}
        style={confirmStyles.ctaWrapper}
        disabled={!hasEnoughCoins}
      >
        <LinearGradient
          colors={hasEnoughCoins ? [palette.purple[500], palette.pink[500]] : ['#6B7280', '#4B5563']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={confirmStyles.ctaButton}
        >
          <Text style={confirmStyles.ctaText}>
            Başla {'\u00B7'} {SURPRISE_MATCH_COST} Jeton
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Insufficient balance indicator */}
      {!hasEnoughCoins && (
        <Text style={confirmStyles.insufficientText}>
          Yetersiz jeton (Bakiye: {coinBalance})
        </Text>
      )}

      {/* Small note */}
      <Text style={confirmStyles.noteText}>
        Beğenmezsen geçebilirsin
      </Text>
    </View>
  );
};

// ─── Searching Phase ────────────────────────────────────────────────────────

const SearchingPhase: React.FC<{
  onCancel: () => void;
}> = ({ onCancel }) => {
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const outerRingScale = useRef(new Animated.Value(1)).current;
  const outerRingOpacity = useRef(new Animated.Value(0.3)).current;
  const [dots, setDots] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    // Haptic on search start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Inner pulsing ring animation
    const innerPulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.3,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.6,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    innerPulse.start();

    // Outer pulsing ring (delayed, larger)
    const outerPulse = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(outerRingScale, {
            toValue: 1.5,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(outerRingOpacity, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(outerRingScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(outerRingOpacity, {
            toValue: 0.3,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    outerPulse.start();

    // Animated dots cycling: "" → "." → ".." → "..."
    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    // Elapsed timer
    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      innerPulse.stop();
      outerPulse.stop();
      clearInterval(dotsInterval);
      clearInterval(timerInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={searchStyles.container}>
      {/* Dark camera placeholder background */}
      <LinearGradient
        colors={['#111111', '#1A1028', '#111111']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Pulsing rings in center */}
      <View style={searchStyles.ringArea}>
        {/* Outer ring */}
        <Animated.View
          style={[
            searchStyles.ring,
            searchStyles.outerRing,
            {
              transform: [{ scale: outerRingScale }],
              opacity: outerRingOpacity,
            },
          ]}
        />
        {/* Inner ring */}
        <Animated.View
          style={[
            searchStyles.ring,
            searchStyles.innerRing,
            {
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
        {/* Center camera icon */}
        <View style={searchStyles.centerIcon}>
          <Ionicons name="videocam" size={36} color="rgba(255,255,255,0.5)" />
        </View>
      </View>

      {/* Searching text with animated dots */}
      <Text style={searchStyles.searchingText}>
        Uyumlu biri aranıyor{dots}
      </Text>

      {/* Elapsed timer */}
      <Text style={searchStyles.timer}>{formatTime(elapsedSeconds)}</Text>

      {/* Cancel button */}
      <TouchableOpacity
        style={searchStyles.cancelButton}
        onPress={onCancel}
        activeOpacity={0.8}
      >
        <Text style={searchStyles.cancelText}>Vazgeç</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Connected Phase ────────────────────────────────────────────────────────

const ConnectedPhase: React.FC<{
  onSkip: () => void;
  onLike: () => void;
  coinBalance: number;
}> = ({ onSkip, onLike, coinBalance }) => {
  const user = useInstantConnectStore((s) => s.matchedUser);
  const overlayTranslateY = useRef(new Animated.Value(-60)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(80)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Haptic on match reveal
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Animate top overlay in with spring
    Animated.parallel([
      Animated.spring(overlayTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate bottom controls in
    Animated.parallel([
      Animated.spring(buttonsTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [overlayTranslateY, overlayOpacity, buttonsTranslateY, buttonsOpacity]);

  if (!user) return null;

  const compatColor =
    user.compatibilityPercent >= 85
      ? '#10B981'
      : user.compatibilityPercent >= 70
        ? '#F59E0B'
        : palette.purple[500];

  const canSkip = coinBalance >= SURPRISE_SWITCH_COST;

  return (
    <View style={connectedStyles.container}>
      {/* Dark video placeholder background */}
      <LinearGradient
        colors={['#111111', '#1A1028', '#111111']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top overlay — matched user info */}
      <Animated.View
        style={[
          connectedStyles.topOverlay,
          {
            transform: [{ translateY: overlayTranslateY }],
            opacity: overlayOpacity,
          },
        ]}
      >
        <View style={connectedStyles.userInfoRow}>
          <View style={connectedStyles.avatarBorder}>
            <CachedAvatar
              uri={user.avatarUrl}
              size={56}
              name={user.name}
              verified={user.isVerified}
            />
          </View>
          <View style={connectedStyles.userTextCol}>
            <Text style={connectedStyles.userName}>
              {user.name}, {user.age}
            </Text>
            <Text style={connectedStyles.userCity}>{user.city}</Text>
          </View>
          {/* Compatibility badge */}
          <View
            style={[
              connectedStyles.compatBadge,
              { backgroundColor: compatColor + '25', borderColor: compatColor + '50' },
            ]}
          >
            <Text style={[connectedStyles.compatText, { color: compatColor }]}>
              %{user.compatibilityPercent}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom controls */}
      <Animated.View
        style={[
          connectedStyles.bottomControls,
          {
            transform: [{ translateY: buttonsTranslateY }],
            opacity: buttonsOpacity,
          },
        ]}
      >
        {/* Skip button */}
        <View style={connectedStyles.actionCol}>
          <TouchableOpacity
            style={[
              connectedStyles.skipButton,
              !canSkip && connectedStyles.buttonDisabled,
            ]}
            onPress={onSkip}
            activeOpacity={0.8}
            disabled={!canSkip}
          >
            <Ionicons
              name="close"
              size={30}
              color={canSkip ? '#FF6B6B' : 'rgba(255,107,107,0.4)'}
            />
          </TouchableOpacity>
          <Text style={connectedStyles.actionLabel}>Geç</Text>
          <Text style={connectedStyles.costLabel}>
            {SURPRISE_SWITCH_COST} {'\uD83E\uDE99'}
          </Text>
        </View>

        {/* Like button */}
        <View style={connectedStyles.actionCol}>
          <TouchableOpacity
            onPress={onLike}
            activeOpacity={0.85}
            style={connectedStyles.likeButtonWrapper}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={connectedStyles.likeButton}
            >
              <Ionicons name="heart" size={30} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={connectedStyles.actionLabel}>Beğen</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────

export const InstantConnectScreen: React.FC = () => {
  useScreenTracking('InstantConnect');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Local phase state derived from store state
  const [phase, setPhase] = useState<Phase>('confirm');

  // Store selectors
  const storeState = useInstantConnectStore((s) => s.state);
  const matchedUser = useInstantConnectStore((s) => s.matchedUser);
  const startSpin = useInstantConnectStore((s) => s.startSpin);
  const switchUser = useInstantConnectStore((s) => s.switchUser);
  const likeUser = useInstantConnectStore((s) => s.likeUser);
  const reset = useInstantConnectStore((s) => s.reset);

  // Coin store
  const coinBalance = useCoinStore((s) => s.balance);
  const spendCoins = useCoinStore((s) => s.spendCoins);

  // Reset store on unmount
  useEffect(() => {
    return () => reset();
  }, [reset]);

  // Sync store state → local phase
  useEffect(() => {
    if (storeState === 'revealed' && matchedUser) {
      setPhase('connected');
    }
  }, [storeState, matchedUser]);

  // Handle start — spend coins then enter searching
  const handleStart = useCallback(async () => {
    const spent = await spendCoins(SURPRISE_MATCH_COST, 'Canlı Keşfet - görüntülü sohbet');
    if (spent) {
      setPhase('searching');
      startSpin();
    } else {
      Alert.alert('Yetersiz Jeton', 'Jeton bakiyen yetersiz. Jeton satin almak ister misin?', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Jeton Al', onPress: () => navigation.navigate('JetonMarket' as never) },
      ]);
    }
  }, [spendCoins, startSpin, navigation]);

  // Handle skip — spend coins, go back to searching
  const handleSkip = useCallback(async () => {
    const spent = await spendCoins(SURPRISE_SWITCH_COST, 'Canlı Keşfet - geç');
    if (spent) {
      setPhase('searching');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      switchUser();
    } else {
      Alert.alert('Yetersiz Jeton', 'Sonrakine gecmek icin yeterli jetonun yok.', [
        { text: 'Tamam', style: 'cancel' },
        { text: 'Jeton Al', onPress: () => navigation.navigate('JetonMarket' as never) },
      ]);
    }
  }, [spendCoins, switchUser, navigation]);

  // Handle like — accept matched user
  const handleLike = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    likeUser();
    Alert.alert(
      'Beğenildi!',
      'Karşı taraf da seni beğenirse sohbet başlayacak.',
      [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }, [likeUser, navigation]);

  // Handle cancel from searching
  const handleCancel = useCallback(() => {
    reset();
    setPhase('confirm');
  }, [reset]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    reset();
    navigation.goBack();
  }, [reset, navigation]);

  // Determine if we show the top bar (back + balance)
  const showTopBar = phase === 'confirm' || phase === 'connected';

  return (
    <View style={styles.container}>
      {/* Background gradient for confirm phase, solid dark for others */}
      {phase === 'confirm' ? (
        <LinearGradient
          colors={['#1A0A2E', '#2D1B4E', '#1A0A2E']}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111111' }]} />
      )}

      {/* Back button */}
      {showTopBar && (
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel="Geri don"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Coin balance — top right */}
      {showTopBar && (
        <View style={[styles.balancePill, { top: insets.top + 12 }]}>
          <Text style={styles.balanceEmoji}>{'\uD83E\uDE99'}</Text>
          <Text style={styles.balanceText}>{coinBalance}</Text>
        </View>
      )}

      {/* Phase content */}
      {phase === 'confirm' && (
        <ConfirmPhase coinBalance={coinBalance} onStart={handleStart} />
      )}

      {phase === 'searching' && (
        <SearchingPhase onCancel={handleCancel} />
      )}

      {phase === 'connected' && (
        <ConnectedPhase
          onSkip={handleSkip}
          onLike={handleLike}
          coinBalance={coinBalance}
        />
      )}
    </View>
  );
};

// ─── Main Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balancePill: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  balanceEmoji: {
    fontSize: 14,
  },
  balanceText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.gold[400],
  },
});

// ─── Confirm Phase Styles ───────────────────────────────────────────────────

const confirmStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.purple[500],
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
    gap: 6,
  },
  warningEmoji: {
    fontSize: 14,
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(245, 158, 11, 0.9)',
  },
  ctaWrapper: {
    width: '100%',
    marginTop: spacing.xl,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 27,
    gap: 8,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  insufficientText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: '#EF4444',
    marginTop: spacing.sm,
  },
  noteText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

// ─── Searching Phase Styles ─────────────────────────────────────────────────

const RING_SIZE = 140;

const searchStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringArea: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  ring: {
    position: 'absolute',
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
  },
  innerRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderColor: palette.purple[400],
  },
  outerRing: {
    width: RING_SIZE + 40,
    height: RING_SIZE + 40,
    borderColor: palette.purple[600],
  },
  centerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  searchingText: {
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 220,
  },
  timer: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.3)',
    marginTop: spacing.sm,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
});

// ─── Connected Phase Styles ─────────────────────────────────────────────────

const connectedStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 5,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: palette.purple[500],
    borderRadius: 32,
    padding: 2,
  },
  userTextCol: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userCity: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  compatBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  compatText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 60,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 48,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 5,
  },
  actionCol: {
    alignItems: 'center',
  },
  skipButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.5)',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  likeButtonWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  costLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: palette.gold[400],
    marginTop: 2,
  },
});
