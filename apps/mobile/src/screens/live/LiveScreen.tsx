// LiveScreen — "Canli" tab: full video call flow
// States: idle (camera preview + CTA) → searching → connected (PiP video call) → ended
// When "Baglan" tapped: text/button disappear, searching begins.
// When connected: remote video fullscreen, local camera PiP, call controls at bottom.

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Dimensions,
  Platform,
  Easing,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LiveStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { palette } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { useCoinStore } from '../../stores/coinStore';
import { useInstantConnectStore } from '../../stores/instantConnectStore';
import { useScreenTracking } from '../../hooks/useAnalytics';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Progressive Call Pricing Config ──

interface CallPricingTier {
  upToMinute: number;
  costPerMinute: number;
}

const CALL_PRICING = {
  CONNECTION_COST: 20,
  FREE_MINUTES: 2,
  TIERS: [
    { upToMinute: 2, costPerMinute: 0 },
    { upToMinute: 5, costPerMinute: 3 },
    { upToMinute: 10, costPerMinute: 5 },
    { upToMinute: 20, costPerMinute: 8 },
    { upToMinute: Infinity, costPerMinute: 10 },
  ] as CallPricingTier[],
} as const;

/** Returns the per-minute coin cost based on elapsed minutes into the call. */
function getCostPerMinute(elapsedMinutes: number): number {
  for (const tier of CALL_PRICING.TIERS) {
    if (elapsedMinutes < tier.upToMinute) {
      return tier.costPerMinute;
    }
  }
  // Fallback: last tier rate
  return CALL_PRICING.TIERS[CALL_PRICING.TIERS.length - 1].costPerMinute;
}

// PiP dimensions
const PIP_W = 120;
const PIP_H = 160;
const PIP_MARGIN = 16;

type LiveNavProp = NativeStackNavigationProp<LiveStackParamList, 'Live'>;

type LivePhase = 'idle' | 'searching' | 'connected' | 'ended';

// ── Fallback (no camera permission) ──

const CameraFallback: React.FC<{ onRequestPermission: () => void }> = ({ onRequestPermission }) => (
  <View style={fallbackStyles.container}>
    <View style={fallbackStyles.orbitRing2} />
    <View style={fallbackStyles.orbitRing1} />
    <View style={fallbackStyles.iconCircle}>
      <Ionicons name="videocam" size={48} color={palette.purple[400]} />
    </View>
    <Text style={fallbackStyles.title}>Kamera izni gerekli</Text>
    <Text style={fallbackStyles.subtitle}>
      Canlı bağlantı için kameranı açman gerekiyor
    </Text>
    <TouchableOpacity onPress={onRequestPermission} activeOpacity={0.85}>
      <LinearGradient
        colors={[palette.purple[500], palette.pink[500]] as [string, string]}
        style={fallbackStyles.button}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Ionicons name="camera" size={18} color="#FFFFFF" />
        <Text style={fallbackStyles.buttonText}>Kameraya Izin Ver</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

// ── Call Control Button ──

const CallControlButton: React.FC<{
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'active' | 'danger';
  size?: number;
}> = ({ iconName, label, onPress, variant = 'default', size = 56 }) => {
  const bgColor =
    variant === 'danger'
      ? '#EF4444'
      : variant === 'active'
        ? '#FFFFFF'
        : 'rgba(255, 255, 255, 0.18)';
  const iconColor = variant === 'active' ? '#1A1A1A' : '#FFFFFF';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={controlStyles.wrapper}
    >
      <View
        style={[
          controlStyles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
          },
        ]}
      >
        <Ionicons name={iconName} size={size === 72 ? 28 : 22} color={iconColor} />
      </View>
      <Text style={controlStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

// ── Draggable PiP Camera View ──

const DraggablePiP: React.FC<{
  isFocused: boolean;
  facing: 'front' | 'back';
  insets: { top: number; bottom: number };
}> = ({ isFocused, facing, insets }) => {
  // Start position: bottom-right corner
  const initialX = SCREEN_W - PIP_W - PIP_MARGIN;
  const initialY = SCREEN_H - PIP_H - PIP_MARGIN - 140 - insets.bottom; // above controls

  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          // Flatten current offset into the pan value
          const currentX = (pan.x as unknown as { _value: number })._value;
          const currentY = (pan.y as unknown as { _value: number })._value;
          pan.setOffset({ x: currentX, y: currentY });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false },
        ),
        onPanResponderRelease: () => {
          pan.flattenOffset();
          // Clamp to screen bounds
          const currentX = (pan.x as unknown as { _value: number })._value;
          const currentY = (pan.y as unknown as { _value: number })._value;
          const clampedX = Math.max(PIP_MARGIN, Math.min(currentX, SCREEN_W - PIP_W - PIP_MARGIN));
          const clampedY = Math.max(
            insets.top + PIP_MARGIN,
            Math.min(currentY, SCREEN_H - PIP_H - PIP_MARGIN - insets.bottom),
          );
          Animated.spring(pan, {
            toValue: { x: clampedX, y: clampedY },
            useNativeDriver: false,
            friction: 7,
          }).start();
        },
      }),
    [pan, insets],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        pipStyles.container,
        { transform: pan.getTranslateTransform() },
      ]}
    >
      {isFocused ? (
        <CameraView
          style={pipStyles.camera}
          facing={facing}
          animateShutter={false}
        />
      ) : (
        <View style={[pipStyles.camera, pipStyles.placeholder]}>
          <Ionicons name="videocam-off" size={24} color="rgba(255,255,255,0.4)" />
        </View>
      )}
      <View style={pipStyles.border} />
    </Animated.View>
  );
};

// ── Main Screen ──

export const LiveScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LiveNavProp>();
  const isFocused = useIsFocused();
  useScreenTracking('Live');

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<LivePhase>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [currentRate, setCurrentRate] = useState(0);
  const [rateChangeNotice, setRateChangeNotice] = useState<string | null>(null);

  // Progressive billing interval ref
  const billingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedMinutesRef = useRef(0);
  const rateChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlsSlideAnim = useRef(new Animated.Value(100)).current;
  const controlsOpacityAnim = useRef(new Animated.Value(0)).current;

  // Searching animation — 3 concentric ripple rings
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const outerRingScale = useRef(new Animated.Value(0)).current;
  const outerRingOpacity = useRef(new Animated.Value(0.6)).current;
  const thirdRingScale = useRef(new Animated.Value(0)).current;
  const thirdRingOpacity = useRef(new Animated.Value(0.6)).current;
  const [searchDots, setSearchDots] = useState('');
  const [searchSeconds, setSearchSeconds] = useState(0);

  // Store
  const coinBalance = useCoinStore((s) => s.balance);
  const spendCoins = useCoinStore((s) => s.spendCoins);
  const storeState = useInstantConnectStore((s) => s.state);
  const matchedUser = useInstantConnectStore((s) => s.matchedUser);
  const startSpin = useInstantConnectStore((s) => s.startSpin);
  const switchUser = useInstantConnectStore((s) => s.switchUser);
  const likeUser = useInstantConnectStore((s) => s.likeUser);
  const resetStore = useInstantConnectStore((s) => s.reset);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      resetStore();
      if (billingIntervalRef.current !== null) {
        clearInterval(billingIntervalRef.current);
      }
      if (rateChangeTimeoutRef.current !== null) {
        clearTimeout(rateChangeTimeoutRef.current);
      }
    };
  }, [resetStore]);

  // CTA pulse animation (idle phase only)
  useEffect(() => {
    if (phase !== 'idle') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, phase]);

  // Searching phase animations — 3 expanding ripple rings with stagger
  useEffect(() => {
    if (phase !== 'searching') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Ring 1 — starts at 0ms, expands scale 0→3, opacity 0.6→0 over 2s, repeats
    const ring1Loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 3, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
        ]),
      ]),
    );
    ring1Loop.start();

    // Ring 2 — starts at 700ms stagger
    const ring2Loop = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.parallel([
          Animated.timing(outerRingScale, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(outerRingOpacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(outerRingScale, {
            toValue: 3, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(outerRingOpacity, {
            toValue: 0, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
        ]),
      ]),
    );
    ring2Loop.start();

    // Ring 3 — starts at 1400ms stagger
    const ring3Loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.parallel([
          Animated.timing(thirdRingScale, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(thirdRingOpacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(thirdRingScale, {
            toValue: 3, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(thirdRingOpacity, {
            toValue: 0, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
        ]),
      ]),
    );
    ring3Loop.start();

    // Cycling dots: "" → "." → ".." → "..." every 500ms
    const dotsInterval = setInterval(() => {
      setSearchDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    const timerInterval = setInterval(() => {
      setSearchSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      ring1Loop.stop();
      ring2Loop.stop();
      ring3Loop.stop();
      clearInterval(dotsInterval);
      clearInterval(timerInterval);
    };
  }, [phase, ringScale, ringOpacity, outerRingScale, outerRingOpacity, thirdRingScale, thirdRingOpacity]);

  // Helper: clear progressive billing interval
  const clearBillingInterval = useCallback(() => {
    if (billingIntervalRef.current !== null) {
      clearInterval(billingIntervalRef.current);
      billingIntervalRef.current = null;
    }
    if (rateChangeTimeoutRef.current !== null) {
      clearTimeout(rateChangeTimeoutRef.current);
      rateChangeTimeoutRef.current = null;
    }
  }, []);

  // Sync store state to phase — charge connection cost when connection is established
  useEffect(() => {
    if (storeState === 'revealed' && matchedUser && phase === 'searching') {
      const connectionCost = CALL_PRICING.CONNECTION_COST;

      // Check if user has enough coins for connection
      if (coinBalance < connectionCost) {
        Alert.alert(
          'Yetersiz Jeton',
          `Canlı bağlantı için ${connectionCost} jeton gerekli. Mevcut bakiyen: ${coinBalance}`,
          [
            { text: 'Jeton Al', onPress: () => navigation.navigate('JetonMarket' as never) },
            { text: 'Kapat', style: 'cancel' },
          ],
        );
        resetStore();
        setPhase('idle');
        controlsSlideAnim.setValue(100);
        controlsOpacityAnim.setValue(0);
        return;
      }

      spendCoins(connectionCost, 'Canlı bağlantı').then((spent) => {
        if (!spent) {
          Alert.alert('Yetersiz Jeton', 'Jeton bakiyen yetersiz.', [
            { text: 'Jeton Al', onPress: () => navigation.navigate('JetonMarket' as never) },
            { text: 'Kapat', style: 'cancel' },
          ]);
          resetStore();
          setPhase('idle');
          controlsSlideAnim.setValue(100);
          controlsOpacityAnim.setValue(0);
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setPhase('connected');
        setCallDuration(0);
        elapsedMinutesRef.current = 0;
        setCurrentRate(getCostPerMinute(0));
        setRateChangeNotice(null);

        // Animate controls in
        Animated.parallel([
          Animated.spring(controlsSlideAnim, {
            toValue: 0, tension: 50, friction: 8, useNativeDriver: true,
          }),
          Animated.timing(controlsOpacityAnim, {
            toValue: 1, duration: 400, useNativeDriver: true,
          }),
        ]).start();
      }).catch((error) => {
        console.warn('[Live] Coin spend failed:', error);
        resetStore();
        setPhase('idle');
        controlsSlideAnim.setValue(100);
        controlsOpacityAnim.setValue(0);
      });
    }
  }, [storeState, matchedUser, phase, coinBalance, spendCoins, navigation, resetStore, controlsSlideAnim, controlsOpacityAnim]);

  // Call duration timer when connected
  useEffect(() => {
    if (phase !== 'connected') return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Progressive coin deduction — every 60 seconds during connected phase
  useEffect(() => {
    if (phase !== 'connected') return;

    billingIntervalRef.current = setInterval(() => {
      elapsedMinutesRef.current += 1;
      const minute = elapsedMinutesRef.current;
      const cost = getCostPerMinute(minute);

      // Update current rate display
      setCurrentRate(cost);

      // Check if rate is about to change next minute and show notice
      const nextMinuteCost = getCostPerMinute(minute + 1);
      if (nextMinuteCost > cost) {
        setRateChangeNotice(`Ücret artıyor: ${nextMinuteCost} jeton/dk`);
        rateChangeTimeoutRef.current = setTimeout(() => {
          setRateChangeNotice(null);
        }, 5000);
      }

      // Skip deduction for free minutes
      if (cost === 0) return;

      // Deduct coins for this minute
      spendCoins(cost, `Canlı görüşme dk ${minute}`).then((spent) => {
        if (!spent) {
          // User ran out of coins — end the call
          clearBillingInterval();
          Alert.alert(
            'Yetersiz Jeton',
            'Jetonunuz bitti! Görüşme sonlandırılıyor.',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  resetStore();
                  setPhase('idle');
                  setCallDuration(0);
                  setIsMuted(false);
                  setIsVideoOff(false);
                  setIsFrontCamera(true);
                  setCurrentRate(0);
                  setRateChangeNotice(null);
                  controlsSlideAnim.setValue(100);
                  controlsOpacityAnim.setValue(0);
                },
              },
            ],
          );
        }
      }).catch((error) => {
        console.warn('[Live] Billing failed:', error);
        clearBillingInterval();
      });
    }, 60_000);

    return () => {
      clearBillingInterval();
    };
  }, [phase, spendCoins, resetStore, clearBillingInterval, controlsSlideAnim, controlsOpacityAnim]);

  // Format call duration
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ── Handlers ──

  const handleConnect = useCallback(() => {
    // Searching and skipping are FREE — coins only charged when connection is established
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 300, useNativeDriver: true,
    }).start(() => {
      setPhase('searching');
      setSearchSeconds(0);
      setSearchDots('');
      fadeAnim.setValue(1);
      startSpin();
    });
  }, [fadeAnim, startSpin]);

  const handleCancelSearch = useCallback(() => {
    resetStore();
    setPhase('idle');
    // Reset controls animation for next connected phase
    controlsSlideAnim.setValue(100);
    controlsOpacityAnim.setValue(0);
  }, [resetStore, controlsSlideAnim, controlsOpacityAnim]);

  const handleEndCall = useCallback(() => {
    clearBillingInterval();
    setPhase('ended');
    // Show ended briefly, then return to idle
    setTimeout(() => {
      resetStore();
      setPhase('idle');
      setCallDuration(0);
      setIsMuted(false);
      setIsVideoOff(false);
      setIsFrontCamera(true);
      setCurrentRate(0);
      setRateChangeNotice(null);
      controlsSlideAnim.setValue(100);
      controlsOpacityAnim.setValue(0);
    }, 1500);
  }, [resetStore, clearBillingInterval, controlsSlideAnim, controlsOpacityAnim]);

  const handleSkip = useCallback(() => {
    // Skip is FREE — just end current connection and search for next person
    clearBillingInterval();
    setPhase('searching');
    setSearchSeconds(0);
    setSearchDots('');
    setCurrentRate(0);
    setRateChangeNotice(null);
    controlsSlideAnim.setValue(100);
    controlsOpacityAnim.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    switchUser();
  }, [switchUser, clearBillingInterval, controlsSlideAnim, controlsOpacityAnim]);

  const handleLike = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    likeUser();
    handleEndCall();
  }, [likeUser, handleEndCall]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    // When real WebRTC is connected: webrtcService.toggleMute()
  }, []);

  const handleToggleVideo = useCallback(() => {
    setIsVideoOff((prev) => !prev);
    // When real WebRTC is connected: webrtcService.toggleVideo()
  }, []);

  const handleFlipCamera = useCallback(() => {
    setIsFrontCamera((prev) => !prev);
  }, []);

  // Camera not permitted
  if (!permission?.granted) {
    return <CameraFallback onRequestPermission={requestPermission} />;
  }

  return (
    <View style={s.container}>
      {/* ── IDLE PHASE: Full-screen camera + overlay + CTA ── */}
      {phase === 'idle' && (
        <>
          {isFocused && (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="front"
              animateShutter={false}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'transparent', 'rgba(0,0,0,0.5)']}
            locations={[0, 0.3, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top bar */}
          <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
            <Text style={s.title}>Canlı</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('JetonMarket' as never)}
              activeOpacity={0.7}
              style={s.balancePill}
            >
              <Text style={{ fontSize: 14 }}>{'\uD83E\uDE99'}</Text>
              <Text style={s.balanceText}>{coinBalance}</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom CTA */}
          <Animated.View
            style={[s.bottomSection, { paddingBottom: insets.bottom + 16, opacity: fadeAnim }]}
          >
            <Text style={s.tagline}>
              Uyumuna göre biriyle{'\n'}anında tanış
            </Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity onPress={handleConnect} activeOpacity={0.85}>
                <LinearGradient
                  colors={[palette.purple[500], palette.pink[500]] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.ctaButton}
                >
                  <Ionicons name="videocam" size={22} color="#FFFFFF" />
                  <Text style={s.ctaText}>Bağlan</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </>
      )}

      {/* ── SEARCHING PHASE ── */}
      {phase === 'searching' && (
        <View style={searchStyles.container}>
          <LinearGradient
            colors={['#111111', '#1A1028', '#111111']}
            style={StyleSheet.absoluteFillObject}
          />

          {/* 3 concentric expanding ripple rings */}
          <View style={searchStyles.ringArea}>
            <Animated.View
              style={[
                searchStyles.ring,
                searchStyles.rippleRing,
                { transform: [{ scale: thirdRingScale }], opacity: thirdRingOpacity },
              ]}
            />
            <Animated.View
              style={[
                searchStyles.ring,
                searchStyles.rippleRing,
                { transform: [{ scale: outerRingScale }], opacity: outerRingOpacity },
              ]}
            />
            <Animated.View
              style={[
                searchStyles.ring,
                searchStyles.rippleRing,
                { transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
            />
            <View style={searchStyles.centerIcon}>
              <Ionicons name="videocam" size={36} color="rgba(255,255,255,0.5)" />
            </View>
          </View>

          <Text style={searchStyles.searchingText}>
            Uyumlu biri aran{'\u0131'}yor{searchDots}
          </Text>
          <Text style={searchStyles.timer}>{formatTime(searchSeconds)}</Text>

          <TouchableOpacity
            style={[searchStyles.cancelButton, { bottom: insets.bottom + 40 }]}
            onPress={handleCancelSearch}
            activeOpacity={0.8}
          >
            <Text style={searchStyles.cancelText}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── CONNECTED PHASE: Video call with PiP ── */}
      {phase === 'connected' && matchedUser && (
        <View style={connStyles.container}>
          {/* Remote video — fullscreen placeholder
              When real WebRTC is integrated, replace this with RTCView for remoteStream */}
          <View style={connStyles.remoteVideo}>
            <LinearGradient
              colors={['#0D0D1A', '#1A1028', '#0D0D1A']}
              style={StyleSheet.absoluteFillObject}
            />
            {/* No user info shown — Omegle style: discover through conversation */}
            <View style={connStyles.remoteAvatarContainer}>
              <View style={connStyles.remoteVideoIcon}>
                <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.3)" />
              </View>
              <Text style={connStyles.remoteVideoSubLabel}>
                Video bağlantısı kuruluyor...
              </Text>
            </View>
          </View>

          {/* Local camera PiP — draggable */}
          {!isVideoOff && (
            <DraggablePiP
              isFocused={isFocused}
              facing={isFrontCamera ? 'front' : 'back'}
              insets={insets}
            />
          )}

          {/* Top overlay — timer + cost rate */}
          <View style={[connStyles.topOverlay, { paddingTop: insets.top + 8 }]}>
            <View style={connStyles.durationPill}>
              <View style={connStyles.liveDot} />
              <Text style={connStyles.durationText}>{formatTime(callDuration)}</Text>
              {currentRate > 0 && (
                <Text style={connStyles.rateText}>
                  {currentRate} jeton/dk
                </Text>
              )}
              {currentRate === 0 && phase === 'connected' && (
                <Text style={connStyles.freeText}>Ücretsiz</Text>
              )}
            </View>
            {rateChangeNotice !== null && (
              <View style={connStyles.rateNoticePill}>
                <Ionicons name="arrow-up-circle" size={14} color="#FBBF24" />
                <Text style={connStyles.rateNoticeText}>{rateChangeNotice}</Text>
              </View>
            )}
          </View>

          {/* Bottom controls */}
          <Animated.View
            style={[
              connStyles.bottomControls,
              {
                paddingBottom: insets.bottom + 20,
                transform: [{ translateY: controlsSlideAnim }],
                opacity: controlsOpacityAnim,
              },
            ]}
          >
            {/* Media controls row */}
            <View style={connStyles.controlsRow}>
              <CallControlButton
                iconName={isMuted ? 'mic-off' : 'mic'}
                label={isMuted ? 'Sesi Ac' : 'Sessiz'}
                onPress={handleToggleMute}
                variant={isMuted ? 'active' : 'default'}
              />
              <CallControlButton
                iconName={isVideoOff ? 'videocam-off' : 'videocam'}
                label={isVideoOff ? 'Kamera Ac' : 'Kamera Kapat'}
                onPress={handleToggleVideo}
                variant={isVideoOff ? 'active' : 'default'}
              />
              <CallControlButton
                iconName="camera-reverse"
                label="Cevir"
                onPress={handleFlipCamera}
              />
            </View>

            {/* Action row: Skip + End Call + Like */}
            <View style={connStyles.actionRow}>
              <CallControlButton
                iconName="close"
                label="Geç"
                onPress={handleSkip}
              />
              <CallControlButton
                iconName="call"
                label="Bitir"
                onPress={handleEndCall}
                variant="danger"
                size={72}
              />
              <CallControlButton
                iconName="heart"
                label="Begen"
                onPress={handleLike}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {/* ── ENDED PHASE ── */}
      {phase === 'ended' && (
        <View style={endedStyles.container}>
          <LinearGradient
            colors={['#111111', '#1A1028', '#111111']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={endedStyles.iconCircle}>
            <Ionicons name="checkmark-circle" size={56} color={palette.purple[400]} />
          </View>
          <Text style={endedStyles.text}>Bağlantı sona erdi</Text>
          <Text style={endedStyles.subText}>Ana ekrana dönülüyor...</Text>
        </View>
      )}
    </View>
  );
};

// ── Fallback Styles ──

const fallbackStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  orbitRing1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: palette.purple[500] + '25',
  },
  orbitRing2: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: palette.purple[500] + '12',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.purple[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// ── Call Control Styles ──

const controlStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 6,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
});

// ── PiP Styles ──

const pipStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: PIP_W,
    height: PIP_H,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 10 },
    }),
  },
  camera: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  placeholder: {
    backgroundColor: '#1C1C32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: palette.purple[500] + '70',
  },
});

// ── Main Styles (idle phase) ──

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
  },
  balanceText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  tagline: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: borderRadius.full,
    minWidth: SCREEN_W * 0.7,
    ...Platform.select({
      ios: {
        shadowColor: palette.purple[700],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  ctaText: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

// ── Searching Styles ──

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
  rippleRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderColor: palette.purple[400],
    backgroundColor: 'transparent',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 220,
  },
  timer: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    marginTop: spacing.sm,
  },
  cancelButton: {
    position: 'absolute',
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
});

// ── Connected Phase Styles ──

const connStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  // Remote video — fullscreen
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0D1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteAvatarContainer: {
    alignItems: 'center',
    gap: 12,
  },
  remoteVideoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoSubLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  // Top overlay — timer only
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  durationText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  rateText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 4,
  },
  freeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#34D399',
    marginLeft: 4,
  },
  rateNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginTop: 6,
  },
  rateNoticeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FBBF24',
  },
  // Bottom controls
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 36,
  },
});

// ── Ended Phase Styles ──

const endedStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.purple[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
});
