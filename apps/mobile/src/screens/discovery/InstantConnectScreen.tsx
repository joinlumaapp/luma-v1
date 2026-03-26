// InstantConnectScreen — "Sürpriz Bağlan" coin-based random video chat
// Flow: Idle → Spinning (roulette animation) → Revealed (user card)
// User spends 25 coins to spin, 15 coins to switch for a different match

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInstantConnectStore } from '../../stores/instantConnectStore';
import { useCoinStore, SURPRISE_MATCH_COST, SURPRISE_SWITCH_COST } from '../../stores/coinStore';
import { CachedAvatar } from '../../components/common/CachedAvatar';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import * as Haptics from 'expo-haptics';

// Mock avatar URLs for the spinning roulette animation
const SPIN_AVATARS = [
  'https://i.pravatar.cc/150?img=1',
  'https://i.pravatar.cc/150?img=5',
  'https://i.pravatar.cc/150?img=9',
  'https://i.pravatar.cc/150?img=16',
  'https://i.pravatar.cc/150?img=20',
  'https://i.pravatar.cc/150?img=23',
];

// ─── Idle Phase ─────────────────────────────────────────────────

const IdlePhase: React.FC<{
  coinBalance: number;
  onSpin: () => void;
}> = ({ coinBalance, onSpin }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
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
          toValue: 0.7,
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
    <View style={idleStyles.container}>
      {/* Dice icon with pulse */}
      <Animated.View style={[idleStyles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Animated.View style={[idleStyles.iconGlow, { opacity: glowAnim }]} />
        <View style={idleStyles.iconInner}>
          <Ionicons name="dice" size={56} color="#FFFFFF" />
        </View>
      </Animated.View>

      {/* Title */}
      <Text style={idleStyles.title}>Sürpriz Bağlan</Text>
      <Text style={idleStyles.subtitle}>
        {'25 jeton ile rastgele biriyle görüntülü konuş.\nBeğenmezsen geç, yenisiyle tanış!'}
      </Text>

      {/* Coin indicator pill */}
      <View style={idleStyles.coinPill}>
        <Text style={idleStyles.coinEmoji}>{'\uD83E\uDE99'}</Text>
        <Text style={idleStyles.coinPillText}>{SURPRISE_MATCH_COST} Jeton</Text>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        onPress={onSpin}
        activeOpacity={0.85}
        style={idleStyles.ctaWrapper}
        disabled={!hasEnoughCoins}
      >
        <LinearGradient
          colors={hasEnoughCoins ? [palette.purple[500], palette.pink[500]] : ['#6B7280', '#4B5563']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={idleStyles.ctaButton}
        >
          <Ionicons name="sparkles" size={22} color="#FFFFFF" />
          <Text style={idleStyles.ctaText}>Şansını Dene</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Balance indicator when insufficient */}
      {!hasEnoughCoins && (
        <Text style={idleStyles.insufficientText}>
          Yetersiz jeton (Bakiye: {coinBalance})
        </Text>
      )}

      {/* Small note */}
      <Text style={idleStyles.noteText}>
        Beğenmezsen {SURPRISE_SWITCH_COST} jetonla bir sonrakine geç
      </Text>
    </View>
  );
};

// ─── Spinning Phase ─────────────────────────────────────────────

const SpinningPhase: React.FC = () => {
  const [currentAvatarIndex, setCurrentAvatarIndex] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Haptic feedback on spin start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Glow pulse animation
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.8,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.4,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoop.start();

    // Rotating ring animation
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotateLoop.start();

    // Avatar cycling — starts fast (200ms), slows down over time
    let speed = 200;
    let elapsed = 0;
    let active = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const cycle = () => {
      if (!active) return;
      timerId = setTimeout(() => {
        if (!active) return;
        elapsed += speed;

        setCurrentAvatarIndex((prev) => (prev + 1) % SPIN_AVATARS.length);

        // Scale bounce on each avatar switch
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.85,
            duration: speed * 0.3,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: speed * 0.4,
            useNativeDriver: true,
          }),
        ]).start();

        // Haptic on each tick
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        // Slow down after 1.5s
        if (elapsed > 1500 && speed < 400) {
          speed = 400;
        }
        // Slow down more after 2s
        if (elapsed > 2000 && speed < 600) {
          speed = 600;
        }

        cycle();
      }, speed);
    };

    cycle();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      glowLoop.stop();
      rotateLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={spinStyles.container}>
      {/* Glow background */}
      <Animated.View style={[spinStyles.glowBg, { opacity: glowPulse }]} />

      {/* Spinning ring */}
      <View style={spinStyles.ringArea}>
        <Animated.View style={[spinStyles.outerRing, { transform: [{ rotate }] }]}>
          <LinearGradient
            colors={[palette.purple[500], palette.pink[500], palette.purple[400]]}
            style={spinStyles.ringGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        {/* Cycling avatar */}
        <Animated.View style={[spinStyles.avatarSlot, { transform: [{ scale: scaleAnim }] }]}>
          <Image
            source={{ uri: SPIN_AVATARS[currentAvatarIndex] }}
            style={spinStyles.spinAvatar}
            blurRadius={3}
          />
        </Animated.View>
      </View>

      <Text style={spinStyles.title}>Eslesmen bulunuyor...</Text>

      {/* Animated dots */}
      <View style={spinStyles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <SpinningDot key={i} delay={i * 300} />
        ))}
      </View>
    </View>
  );
};

// Animated dot for loading indicator
const SpinningDot: React.FC<{ delay: number }> = ({ delay }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, delay]);

  return <Animated.View style={[spinStyles.dot, { opacity }]} />;
};

// ─── Revealed Phase ─────────────────────────────────────────────

const RevealedPhase: React.FC<{
  onSwitch: () => void;
  onLike: () => void;
  coinBalance: number;
}> = ({ onSwitch, onLike, coinBalance }) => {
  const user = useInstantConnectStore((s) => s.matchedUser);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Haptic on reveal
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  if (!user) return null;

  const compatColor =
    user.compatibilityPercent >= 85
      ? '#10B981'
      : user.compatibilityPercent >= 70
        ? '#F59E0B'
        : palette.purple[500];

  const canSwitch = coinBalance >= SURPRISE_SWITCH_COST;

  return (
    <Animated.View
      style={[
        revealStyles.container,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      {/* Avatar with purple ring border */}
      <View style={revealStyles.avatarWrapper}>
        <View style={revealStyles.avatarRing}>
          <CachedAvatar
            uri={user.avatarUrl}
            size={140}
            name={user.name}
            verified={user.isVerified}
          />
        </View>
      </View>

      {/* User info */}
      <Text style={revealStyles.userName}>
        {user.name}, {user.age}
      </Text>
      <Text style={revealStyles.userCity}>{user.city}</Text>

      {/* Compatibility badge */}
      <View
        style={[
          revealStyles.compatBadge,
          { backgroundColor: compatColor + '20', borderColor: compatColor + '40' },
        ]}
      >
        <Text style={[revealStyles.compatText, { color: compatColor }]}>
          %{user.compatibilityPercent} Uyum
        </Text>
      </View>

      {/* Action buttons */}
      <View style={revealStyles.actionRow}>
        {/* Switch button */}
        <View style={revealStyles.switchCol}>
          <TouchableOpacity
            style={[
              revealStyles.switchButton,
              !canSwitch && revealStyles.switchButtonDisabled,
            ]}
            onPress={onSwitch}
            activeOpacity={0.8}
            disabled={!canSwitch}
          >
            <Ionicons
              name="shuffle"
              size={26}
              color={canSwitch ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
            />
          </TouchableOpacity>
          <Text style={revealStyles.switchLabel}>Geç</Text>
          <Text style={revealStyles.switchCost}>
            {SURPRISE_SWITCH_COST} {'\uD83E\uDE99'}
          </Text>
        </View>

        {/* Like button */}
        <TouchableOpacity onPress={onLike} activeOpacity={0.85} style={revealStyles.likeWrapper}>
          <LinearGradient
            colors={[palette.purple[500], palette.pink[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={revealStyles.likeButton}
          >
            <Ionicons name="heart" size={24} color="#FFFFFF" />
            <Text style={revealStyles.likeText}>Beğen</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────

export const InstantConnectScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Store state
  const state = useInstantConnectStore((s) => s.state);
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

  // Handle initial spin — spend 25 coins then trigger store spin
  const handleSpin = useCallback(async () => {
    const spent = await spendCoins(SURPRISE_MATCH_COST, 'Sürpriz Bağlan - görüntülü sohbet');
    if (spent) {
      startSpin();
    } else {
      Alert.alert('Yetersiz Jeton', 'Jeton bakiyen yetersiz. Jeton satin almak ister misin?', [
        { text: 'Vazgec', style: 'cancel' },
        { text: 'Jeton Al', onPress: () => navigation.navigate('JetonMarket' as never) },
      ]);
    }
  }, [spendCoins, startSpin, navigation]);

  // Handle switch — spend 15 coins then re-spin
  const handleSwitch = useCallback(async () => {
    const spent = await spendCoins(SURPRISE_SWITCH_COST, 'Sürpriz Bağlan - sonrakine geç');
    if (spent) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      switchUser();
    } else {
      Alert.alert('Yetersiz Jeton', 'Sonrakine geçmek için yeterli jetonun yok.', [
        { text: 'Tamam', style: 'cancel' },
        { text: 'Jeton Al', onPress: () => navigation.navigate('JetonMarket' as never) },
      ]);
    }
  }, [spendCoins, switchUser, navigation]);

  // Handle like — accept the matched user
  const handleLike = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    likeUser();
    Alert.alert(
      'Beğenildi!',
      'Beğenin gönderildi! Karşı taraf da seni beğenirse sohbet başlayacak.',
      [
        {
          text: 'Tamam',
          onPress: () => {
            navigation.goBack();
          },
        },
      ],
    );
  }, [likeUser, navigation]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    reset();
    navigation.goBack();
  }, [reset, navigation]);

  return (
    <LinearGradient
      colors={['#1A0A2E', '#2D1B4E', '#1A0A2E']}
      style={styles.container}
    >
      {/* Back button — visible in idle and revealed states */}
      {state !== 'spinning' && (
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

      {/* Coin balance indicator — top right */}
      {state !== 'spinning' && (
        <View style={[styles.balancePill, { top: insets.top + 12 }]}>
          <Text style={styles.balanceEmoji}>{'\uD83E\uDE99'}</Text>
          <Text style={styles.balanceText}>{coinBalance}</Text>
        </View>
      )}

      {/* Idle state */}
      {state === 'idle' && (
        <IdlePhase coinBalance={coinBalance} onSpin={handleSpin} />
      )}

      {/* Spinning state */}
      {state === 'spinning' && <SpinningPhase />}

      {/* Revealed state */}
      {state === 'revealed' && (
        <RevealedPhase
          onSwitch={handleSwitch}
          onLike={handleLike}
          coinBalance={coinBalance}
        />
      )}
    </LinearGradient>
  );
};

// ─── Main Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

// ─── Idle Phase Styles ───────────────────────────────────────────

const idleStyles = StyleSheet.create({
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
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: spacing.lg,
    gap: 6,
  },
  coinEmoji: {
    fontSize: 16,
  },
  coinPillText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.gold[400],
  },
  ctaWrapper: {
    width: '100%',
    marginTop: spacing.xl,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 10,
  },
  ctaText: {
    fontSize: 18,
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
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

// ─── Spinning Phase Styles ───────────────────────────────────────

const spinStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBg: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: palette.purple[600],
  },
  ringArea: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
  },
  ringGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    opacity: 0.5,
  },
  avatarSlot: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(139, 92, 246, 0.6)',
  },
  spinAvatar: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.purple[400],
  },
});

// ─── Revealed Phase Styles ───────────────────────────────────────

const revealStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarRing: {
    borderWidth: 3,
    borderColor: palette.purple[500],
    borderRadius: 76,
    padding: 3,
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.sm,
  },
  userCity: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  compatBadge: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    marginTop: spacing.smd,
  },
  compatText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: 20,
    width: '100%',
    justifyContent: 'center',
  },
  switchCol: {
    alignItems: 'center',
  },
  switchButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchButtonDisabled: {
    opacity: 0.4,
  },
  switchLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  switchCost: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: palette.gold[400],
    marginTop: 2,
  },
  likeWrapper: {
    flex: 1,
    maxWidth: 200,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 8,
  },
  likeText: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
