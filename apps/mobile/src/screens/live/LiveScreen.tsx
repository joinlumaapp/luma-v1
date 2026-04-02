// LiveScreen — "Canlı" tab: full-screen camera preview with overlay controls
// Layout: full-screen front camera → semi-transparent LUMA overlay → bottom CTA
// Fallback: static illustration when camera permission not granted

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LiveStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { palette } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { useCoinStore } from '../../stores/coinStore';
import { INSTANT_CONNECT_CONFIG } from '../../constants/config';
import { useScreenTracking } from '../../hooks/useAnalytics';

const { width: SCREEN_W } = Dimensions.get('window');
const LIVE_COST = INSTANT_CONNECT_CONFIG.MATCH_COST;

type LiveNavProp = NativeStackNavigationProp<LiveStackParamList, 'Live'>;

// ── Fallback (no camera permission) ──
const CameraFallback: React.FC<{ onRequestPermission: () => void }> = ({ onRequestPermission }) => (
  <View style={fallbackStyles.container}>
    {/* Orbit rings */}
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
        <Text style={fallbackStyles.buttonText}>Kameraya İzin Ver</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

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
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
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

// ── Main Screen ──
export const LiveScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LiveNavProp>();
  useScreenTracking('Live');

  const [permission, requestPermission] = useCameraPermissions();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const coinBalance = useCoinStore((s) => s.balance);


  // Pulse animation for CTA
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleConnect = useCallback(() => {
    if (coinBalance < LIVE_COST) {
      Alert.alert(
        'Yetersiz Jeton',
        `Canlı bağlantı için ${LIVE_COST} jeton gerekli. Mevcut bakiyen: ${coinBalance}`,
        [
          { text: 'Jeton Al', onPress: () => navigation.navigate('JetonMarket' as never) },
          { text: 'Kapat', style: 'cancel' },
        ],
      );
      return;
    }

    navigation.getParent()?.navigate('DiscoveryTab', { screen: 'InstantConnect' });
  }, [coinBalance, navigation]);

  // Camera not permitted yet → show fallback
  if (!permission?.granted) {
    return (
      <CameraFallback onRequestPermission={requestPermission} />
    );
  }

  return (
    <View style={s.container}>
      {/* Full-screen front camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="front"
        animateShutter={false}
      />

      {/* Purple/pink gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top bar — title + balance */}
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

      {/* Bottom section — CTA + info */}
      <View style={[s.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        {/* Tagline */}
        <Text style={s.tagline}>
          Uyumuna göre biriyle{'\n'}anında tanış
        </Text>

        {/* Main CTA */}
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

      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
  // Top bar
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
  // Bottom section
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
  // CTA
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
  ctaCostPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  ctaCostText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
