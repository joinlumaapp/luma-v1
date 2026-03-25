// InstantConnectScreen — Real-time matchmaking with countdown, blur reveal, and video chat
// Flow: Searching → Preview (blur→reveal) → Connected (video chat) → Ended
// Safety: daily limits, report/block, timer-based auto-decline

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInstantConnectStore } from '../../stores/instantConnectStore';
import { useAuthStore } from '../../stores/authStore';
import { useCoinStore } from '../../stores/coinStore';
import { INSTANT_CONNECT_CONFIG } from '../../constants/config';
import { CachedAvatar } from '../../components/common/CachedAvatar';
import { LumaLogo } from '../../components/common/LumaLogo';
import { palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { getFeatureLimit } from '../../constants/packageAccess';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IC_DAILY_LIMITS = INSTANT_CONNECT_CONFIG.DAILY_LIMITS;
const TOKEN_COST_PER_SESSION = INSTANT_CONNECT_CONFIG.TOKEN_COST_PER_SESSION;

// ─── Searching Phase ─────────────────────────────────────────────

const SearchingPhase: React.FC<{ duration: number; onCancel: () => void }> = ({ duration, onCancel }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();

    // Rotate animation
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
    );
    rotateLoop.start();

    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
    };
  }, [pulseAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={searchStyles.container}>
      {/* Animated search ring */}
      <View style={searchStyles.ringContainer}>
        <Animated.View style={[searchStyles.outerRing, { transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[searchStyles.middleRing, { transform: [{ rotate }] }]}>
          <LinearGradient
            colors={[palette.purple[500], palette.pink[500], palette.purple[500]]}
            style={searchStyles.gradientRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <View style={searchStyles.innerCircle}>
          <LumaLogo size="xlarge" />
        </View>
      </View>

      <Text style={searchStyles.title}>Uyumlu birisi araniyor...</Text>
      <Text style={searchStyles.subtitle}>
        {duration < 10 ? `${duration} saniye` : `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`}
      </Text>

      <TouchableOpacity style={searchStyles.cancelButton} onPress={onCancel} activeOpacity={0.8}>
        <Text style={searchStyles.cancelText}>Vazgeç</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Preview Phase ───────────────────────────────────────────────

const PreviewPhase: React.FC<{
  countdown: number;
  isBlurred: boolean;
  onAccept: () => void;
  onDecline: () => void;
}> = ({ countdown, isBlurred, onAccept, onDecline }) => {
  const user = useInstantConnectStore((s) => s.matchedUser);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
  }, [scaleAnim]);

  if (!user) return null;

  const compatColor = user.compatibilityPercent >= 85 ? '#10B981' : user.compatibilityPercent >= 70 ? '#F59E0B' : palette.purple[500];

  return (
    <Animated.View style={[previewStyles.container, { transform: [{ scale: scaleAnim }] }]}>
      {/* Avatar with optional blur */}
      <View style={previewStyles.avatarContainer}>
        <CachedAvatar uri={user.avatarUrl} size={140} borderRadius={70} />
        {isBlurred && (
          <BlurView intensity={30} style={previewStyles.blurOverlay} tint="light" />
        )}
        {user.isVerified && (
          <View style={previewStyles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={28} color="#3B82F6" />
          </View>
        )}
      </View>

      {/* Countdown ring */}
      <View style={previewStyles.countdownContainer}>
        <Text style={previewStyles.countdownNumber}>{countdown}</Text>
        <Text style={previewStyles.countdownLabel}>saniye</Text>
      </View>

      {/* User info */}
      <Text style={previewStyles.userName}>{user.name}, {user.age}</Text>
      <Text style={previewStyles.userDetail}>{user.city} · {user.distance}</Text>
      <View style={[previewStyles.compatBadge, { backgroundColor: compatColor + '20', borderColor: compatColor + '40' }]}>
        <Text style={[previewStyles.compatText, { color: compatColor }]}>%{user.compatibilityPercent} Uyum</Text>
      </View>

      {/* Action buttons */}
      <View style={previewStyles.actionRow}>
        <TouchableOpacity style={previewStyles.declineButton} onPress={onDecline} activeOpacity={0.8}>
          <Ionicons name="close" size={28} color="#EF4444" />
          <Text style={previewStyles.declineText}>Gec</Text>
        </TouchableOpacity>

        <TouchableOpacity style={previewStyles.acceptButton} onPress={onAccept} activeOpacity={0.85}>
          <LinearGradient
            colors={[palette.purple[500], palette.pink[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={previewStyles.acceptGradient}
          >
            <Ionicons name="videocam" size={28} color="#FFFFFF" />
            <Text style={previewStyles.acceptText}>Baglan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Connected Phase ─────────────────────────────────────────────

const ConnectedPhase: React.FC<{
  onEnd: () => void;
  onReport: () => void;
}> = ({ onEnd, onReport }) => {
  const user = useInstantConnectStore((s) => s.matchedUser);
  const durationRef = useRef(0);
  const [duration, setDuration] = React.useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      durationRef.current += 1;
      setDuration(durationRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={connectedStyles.container}>
      {/* Placeholder for video stream */}
      <View style={connectedStyles.videoArea}>
        <CachedAvatar uri={user.avatarUrl} size={120} borderRadius={60} />
        <Text style={connectedStyles.connectedLabel}>Baglanti Kuruldu</Text>
        <Text style={connectedStyles.userName}>{user.name}, {user.age}</Text>
        <Text style={connectedStyles.timer}>{formatTime(duration)}</Text>
      </View>

      {/* Controls */}
      <View style={connectedStyles.controls}>
        <TouchableOpacity style={connectedStyles.controlButton} onPress={onReport} activeOpacity={0.8}>
          <Ionicons name="flag-outline" size={22} color="rgba(255,255,255,0.7)" />
          <Text style={connectedStyles.controlLabel}>Raporla</Text>
        </TouchableOpacity>

        <TouchableOpacity style={connectedStyles.endButton} onPress={onEnd} activeOpacity={0.8}>
          <Ionicons name="call" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={connectedStyles.controlButton} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={22} color="rgba(255,255,255,0.7)" />
          <Text style={connectedStyles.controlLabel}>Mesaj</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────

export const InstantConnectScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');

  const state = useInstantConnectStore((s) => s.state);
  const searchDuration = useInstantConnectStore((s) => s.searchDuration);
  const previewCountdown = useInstantConnectStore((s) => s.previewCountdown);
  const isBlurred = useInstantConnectStore((s) => s.isBlurred);
  const startSearching = useInstantConnectStore((s) => s.startSearching);
  const cancelSearch = useInstantConnectStore((s) => s.cancelSearch);
  const acceptConnection = useInstantConnectStore((s) => s.acceptConnection);
  const declineConnection = useInstantConnectStore((s) => s.declineConnection);
  const endConnection = useInstantConnectStore((s) => s.endConnection);
  const reportUser = useInstantConnectStore((s) => s.reportUser);
  const reset = useInstantConnectStore((s) => s.reset);
  const getDailyUsage = useInstantConnectStore((s) => s.getDailyUsage);

  // Coin store for token-based access
  const coinBalance = useCoinStore((s) => s.balance);
  const spendCoins = useCoinStore((s) => s.spendCoins);

  // Daily limits from config
  const dailyLimit = IC_DAILY_LIMITS[packageTier as keyof typeof IC_DAILY_LIMITS] ?? 1;
  const dailyUsage = getDailyUsage();
  const canUseFree = dailyLimit === -1 || dailyUsage < dailyLimit;
  const remainingFree = dailyLimit === -1 ? 999 : Math.max(0, dailyLimit - dailyUsage);
  const canPayWithTokens = coinBalance >= TOKEN_COST_PER_SESSION;
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const handleStart = useCallback(() => {
    if (canUseFree) {
      startSearching();
      return;
    }
    // Daily limit reached — show paywall
    setShowPaywall(true);
  }, [canUseFree, startSearching]);

  const handlePayWithTokens = useCallback(async () => {
    const spent = await spendCoins(TOKEN_COST_PER_SESSION, 'Anında Bağlan - jeton ile oturum');
    if (spent) {
      setShowPaywall(false);
      startSearching();
    } else {
      Alert.alert('Yetersiz Jeton', 'Jeton bakiyen yetersiz. Jeton satın almak ister misin?', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Jeton Al', onPress: () => navigation.navigate('JetonMarket' as never) },
      ]);
    }
  }, [spendCoins, startSearching, navigation]);

  const handleReport = useCallback(() => {
    Alert.alert(
      'Kullanıcıyı Raporla',
      'Bu kullaniciyi neden raporlamak istiyorsun?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Uygunsuz Davranış', onPress: () => reportUser('inappropriate') },
        { text: 'Spam', onPress: () => reportUser('spam') },
      ],
    );
  }, [reportUser]);

  const handleBack = useCallback(() => {
    if (state !== 'idle') {
      cancelSearch();
    }
    navigation.goBack();
  }, [state, cancelSearch, navigation]);

  return (
    <LinearGradient
      colors={['#1A0A2E', '#2D1B4E', '#1A0A2E']}
      style={styles.container}
    >
      {/* Back button */}
      {state === 'idle' && (
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Idle — Start screen */}
      {state === 'idle' && (
        <View style={styles.idleContainer}>
          <LumaLogo size="hero" />
          <Text style={styles.idleTitle}>Anında Bağlan</Text>
          <Text style={styles.idleSubtitle}>
            Uyumlu biriyle anında video görüşmesi başlat.{'\n'}
            Hızlı, güvenli ve heyecan verici!
          </Text>

          {/* Daily usage indicator */}
          <View style={styles.usageRow}>
            <Ionicons name="flash" size={16} color={palette.gold[400]} />
            <Text style={styles.usageText}>
              {dailyLimit === -1
                ? 'Sınırsız hak'
                : remainingFree > 0
                  ? `Bugün ${remainingFree} hak kaldı`
                  : `${TOKEN_COST_PER_SESSION} jeton ile devam edebilirsin`}
            </Text>
          </View>

          <TouchableOpacity onPress={handleStart} activeOpacity={0.85} style={styles.startButtonWrapper}>
            <LinearGradient
              colors={canUse ? [palette.purple[500], palette.pink[500]] : ['#6B7280', '#4B5563']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startButton}
            >
              <Ionicons name="videocam" size={24} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Başla</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Safety note */}
          <Text style={styles.safetyNote}>
            Görüşmeler izlenmez. Uygunsuz davranışları raporlayabilirsin.
          </Text>
        </View>
      )}

      {/* Searching Phase */}
      {state === 'searching' && (
        <SearchingPhase duration={searchDuration} onCancel={cancelSearch} />
      )}

      {/* Preview Phase */}
      {state === 'preview' && (
        <PreviewPhase
          countdown={previewCountdown}
          isBlurred={isBlurred}
          onAccept={acceptConnection}
          onDecline={declineConnection}
        />
      )}

      {/* Connected Phase */}
      {state === 'connected' && (
        <ConnectedPhase onEnd={endConnection} onReport={handleReport} />
      )}

      {/* Ended Phase */}
      {state === 'ended' && (
        <View style={styles.endedContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          <Text style={styles.endedTitle}>Gorusme Sona Erdi</Text>
          <Text style={styles.endedSubtitle}>Eslesme gondermek ister misin?</Text>
          <View style={styles.endedActions}>
            <TouchableOpacity style={styles.endedSecondary} onPress={() => reset()} activeOpacity={0.8}>
              <Text style={styles.endedSecondaryText}>Kapat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.endedPrimary} onPress={() => { reset(); handleStart(); }} activeOpacity={0.85}>
              <LinearGradient
                colors={[palette.purple[500], palette.pink[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.endedPrimaryGradient}
              >
                <Text style={styles.endedPrimaryText}>Tekrar Dene</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Paywall modal */}
      {showPaywall && (
        <View style={paywallStyles.overlay}>
          <View style={paywallStyles.card}>
            <Text style={paywallStyles.emoji}>{'\u26A1'}</Text>
            <Text style={paywallStyles.title}>Günlük Hakkın Doldu</Text>
            <Text style={paywallStyles.subtitle}>
              Bugün {dailyLimit} oturum hakkını kullandın.{'\n'}
              Jeton kullanarak tekrar baglayabilirsin.
            </Text>

            {/* Token CTA */}
            <TouchableOpacity
              style={[paywallStyles.tokenBtn, !canPayWithTokens && paywallStyles.tokenBtnDisabled]}
              onPress={handlePayWithTokens}
              activeOpacity={0.8}
              disabled={!canPayWithTokens}
            >
              <Text style={paywallStyles.tokenBtnText}>
                {TOKEN_COST_PER_SESSION} jeton ile devam et
              </Text>
              <Text style={paywallStyles.tokenBalance}>
                Bakiye: {coinBalance} jeton
              </Text>
            </TouchableOpacity>

            {/* Upgrade CTA */}
            <TouchableOpacity
              style={paywallStyles.upgradeBtn}
              onPress={() => {
                setShowPaywall(false);
                navigation.navigate('MembershipPlans' as never);
              }}
              activeOpacity={0.7}
            >
              <Text style={paywallStyles.upgradeBtnText}>Paketi Yükselt</Text>
            </TouchableOpacity>

            {/* Dismiss */}
            <TouchableOpacity
              style={paywallStyles.dismissBtn}
              onPress={() => setShowPaywall(false)}
              activeOpacity={0.7}
            >
              <Text style={paywallStyles.dismissText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

// ─── Paywall Styles ──────────────────────────────────────────────

const paywallStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 100,
  },
  card: {
    backgroundColor: '#1E1040',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
  },
  emoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  tokenBtn: {
    width: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  tokenBtnDisabled: {
    opacity: 0.4,
  },
  tokenBtnText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  tokenBalance: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  upgradeBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
    marginBottom: 8,
  },
  upgradeBtnText: {
    fontSize: 14,
    color: '#A855F7',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
});

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: {
    position: 'absolute', left: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  // Idle
  idleContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  idleTitle: {
    fontSize: 28, fontFamily: 'Poppins_600SemiBold', fontWeight: '600',
    color: '#FFFFFF', marginTop: spacing.lg, textAlign: 'center',
  },
  idleSubtitle: {
    fontSize: 15, fontFamily: 'Poppins_400Regular', fontWeight: '400',
    color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginTop: spacing.sm,
  },
  usageRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.lg, backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  usageText: {
    fontSize: 13, fontFamily: 'Poppins_500Medium', fontWeight: '500',
    color: palette.gold[400],
  },
  startButtonWrapper: { marginTop: spacing.xl, width: '100%' },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: 28, gap: 10,
  },
  startButtonText: {
    fontSize: 18, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: '#FFFFFF',
  },
  safetyNote: {
    fontSize: 11, fontFamily: 'Poppins_400Regular', fontWeight: '400',
    color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: spacing.lg,
  },
  // Ended
  endedContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl,
  },
  endedTitle: {
    fontSize: 24, fontFamily: 'Poppins_600SemiBold', fontWeight: '600',
    color: '#FFFFFF', marginTop: spacing.md,
  },
  endedSubtitle: {
    fontSize: 15, fontFamily: 'Poppins_400Regular', fontWeight: '400',
    color: 'rgba(255,255,255,0.6)', marginTop: spacing.sm,
  },
  endedActions: {
    flexDirection: 'row', gap: 12, marginTop: spacing.xl, width: '100%',
  },
  endedSecondary: {
    flex: 1, height: 50, borderRadius: 25,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  endedSecondaryText: {
    fontSize: 15, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: '#FFFFFF',
  },
  endedPrimary: { flex: 1 },
  endedPrimaryGradient: {
    height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center',
  },
  endedPrimaryText: {
    fontSize: 15, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: '#FFFFFF',
  },
});

// ─── Search Phase Styles ─────────────────────────────────────────

const searchStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ringContainer: {
    width: 200, height: 200, justifyContent: 'center', alignItems: 'center',
  },
  outerRing: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    borderWidth: 2, borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  middleRing: {
    position: 'absolute', width: 170, height: 170, borderRadius: 85, overflow: 'hidden',
  },
  gradientRing: {
    width: '100%', height: '100%', borderRadius: 85,
    opacity: 0.4,
  },
  innerCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 20, fontFamily: 'Poppins_600SemiBold', fontWeight: '600',
    color: '#FFFFFF', marginTop: 32,
  },
  subtitle: {
    fontSize: 14, fontFamily: 'Poppins_400Regular', fontWeight: '400',
    color: 'rgba(255,255,255,0.5)', marginTop: 8,
  },
  cancelButton: {
    marginTop: 40, paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  cancelText: {
    fontSize: 15, fontFamily: 'Poppins_500Medium', fontWeight: '500', color: '#FFFFFF',
  },
});

// ─── Preview Phase Styles ────────────────────────────────────────

const previewStyles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl,
  },
  avatarContainer: {
    width: 140, height: 140, borderRadius: 70, overflow: 'hidden',
    borderWidth: 3, borderColor: palette.purple[500],
  },
  blurOverlay: { ...StyleSheet.absoluteFillObject },
  verifiedBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: '#FFFFFF', borderRadius: 14,
  },
  countdownContainer: {
    alignItems: 'center', marginTop: spacing.lg,
  },
  countdownNumber: {
    fontSize: 48, fontFamily: 'Poppins_600SemiBold', fontWeight: '600',
    color: palette.gold[400],
  },
  countdownLabel: {
    fontSize: 13, fontFamily: 'Poppins_400Regular', fontWeight: '400',
    color: 'rgba(255,255,255,0.5)', marginTop: -4,
  },
  userName: {
    fontSize: 24, fontFamily: 'Poppins_600SemiBold', fontWeight: '600',
    color: '#FFFFFF', marginTop: spacing.md,
  },
  userDetail: {
    fontSize: 14, fontFamily: 'Poppins_400Regular', fontWeight: '400',
    color: 'rgba(255,255,255,0.6)', marginTop: 4,
  },
  compatBadge: {
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, marginTop: spacing.sm,
  },
  compatText: {
    fontSize: 14, fontFamily: 'Poppins_600SemiBold', fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row', gap: 20, marginTop: spacing.xl, width: '100%',
    justifyContent: 'center', alignItems: 'center',
  },
  declineButton: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 2, borderColor: 'rgba(239,68,68,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  declineText: {
    fontSize: 10, fontFamily: 'Poppins_500Medium', fontWeight: '500',
    color: '#EF4444', marginTop: 2,
  },
  acceptButton: { flex: 1, maxWidth: 200 },
  acceptGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: 28, gap: 8,
  },
  acceptText: {
    fontSize: 17, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: '#FFFFFF',
  },
});

// ─── Connected Phase Styles ──────────────────────────────────────

const connectedStyles = StyleSheet.create({
  container: { flex: 1 },
  videoArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  connectedLabel: {
    fontSize: 14, fontFamily: 'Poppins_500Medium', fontWeight: '500',
    color: '#10B981', marginTop: spacing.md,
  },
  userName: {
    fontSize: 22, fontFamily: 'Poppins_600SemiBold', fontWeight: '600',
    color: '#FFFFFF', marginTop: 4,
  },
  timer: {
    fontSize: 16, fontFamily: 'Poppins_400Regular', fontWeight: '400',
    color: 'rgba(255,255,255,0.6)', marginTop: 8,
  },
  controls: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 24, paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  controlButton: { alignItems: 'center', gap: 4 },
  controlLabel: {
    fontSize: 11, fontFamily: 'Poppins_400Regular', fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  endButton: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
});
