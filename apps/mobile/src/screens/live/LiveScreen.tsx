// LiveScreen — instant video connection based on compatibility
// Core feature: random 1-on-1 video calls with compatible users

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useCoinStore } from '../../stores/coinStore';
import { useAuthStore } from '../../stores/authStore';
import { BrandedBackground } from '../../components/common/BrandedBackground';

const { width: SCREEN_W } = Dimensions.get('window');
const LIVE_COST = 25;

export const LiveScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  // Simulated online count — replace with real-time data
  const [onlineCount, setOnlineCount] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const coinBalance = useCoinStore((s) => s.balance);
  const spendCoins = useCoinStore((s) => s.spendCoins);
  const user = useAuthStore((s) => s.user);

  // Simulate online user count
  useEffect(() => {
    setOnlineCount(Math.floor(Math.random() * 30) + 8);
    const interval = setInterval(() => {
      setOnlineCount((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(5, prev + delta);
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation for the CTA button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Glow animation for the live dot
  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ]),
    );
    glow.start();
    return () => glow.stop();
  }, [glowAnim]);

  const handleConnect = useCallback(async () => {
    if (coinBalance < LIVE_COST) {
      Alert.alert(
        'Yetersiz Jeton',
        `Canlı bağlantı için ${LIVE_COST} jeton gerekli. Mevcut bakiyen: ${coinBalance}`,
        [
          { text: 'Jeton Al', onPress: () => {} },
          { text: 'Kapat', style: 'cancel' },
        ],
      );
      return;
    }

    const spent = await spendCoins(LIVE_COST, 'live_connect');
    if (spent) {
      // TODO: Open camera and start matching
      Alert.alert(
        'Bağlanıyor...',
        'Uyumlu bir kullanıcı aranıyor. Kamera açılacak.',
        [{ text: 'Tamam' }],
      );
    }
  }, [coinBalance, spendCoins]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Canlı</Text>
        <View style={styles.balancePill}>
          <Ionicons name="diamond" size={14} color={palette.gold[400]} />
          <Text style={styles.balanceText}>{coinBalance}</Text>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Live indicator */}
        <View style={styles.liveIndicator}>
          <Animated.View style={[styles.liveDot, { opacity: glowAnim }]} />
          <View style={styles.liveDotInner} />
          <Text style={styles.onlineText}>
            <Text style={styles.onlineCount}>{onlineCount}</Text> kişi çevrimiçi
          </Text>
        </View>

        {/* Illustration area */}
        <View style={styles.illustrationArea}>
          <View style={styles.iconCircle}>
            <Ionicons name="videocam" size={48} color={palette.purple[400]} />
          </View>
          <View style={styles.orbitRing} />
          <View style={styles.orbitRing2} />
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Uyumuna göre biriyle{'\n'}anında konuş
        </Text>
        <Text style={styles.subDescription}>
          İlgi alanlarına ve kişilik uyumuna göre{'\n'}seni en iyi anlayacak biriyle eşleş
        </Text>

        {/* Main CTA */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity onPress={handleConnect} activeOpacity={0.85}>
            <LinearGradient
              colors={[palette.purple[500], palette.purple[600], '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaButton}
            >
              <Ionicons name="videocam" size={22} color="#FFFFFF" />
              <Text style={styles.ctaText}>Bağlan</Text>
              <View style={styles.ctaCostPill}>
                <Ionicons name="diamond" size={12} color={palette.gold[400]} />
                <Text style={styles.ctaCostText}>{LIVE_COST}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* How it works */}
        <View style={styles.howItWorks}>
          <View style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name="shuffle" size={18} color={palette.purple[400]} />
            </View>
            <Text style={styles.stepText}>Uyumlu biriyle rastgele eşleş</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name="chatbubbles" size={18} color={palette.purple[400]} />
            </View>
            <Text style={styles.stepText}>Yüz yüze konuş, tanış</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name="play-skip-forward" size={18} color={palette.purple[400]} />
            </View>
            <Text style={styles.stepText}>İstediğin zaman geç</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  balanceText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: palette.gold[400],
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: 24,
  },

  // Live indicator
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    position: 'absolute',
  },
  liveDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginLeft: 5,
  },
  onlineText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  onlineCount: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#22C55E',
  },

  // Illustration
  illustrationArea: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.purple[500] + '15',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  orbitRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: palette.purple[500] + '20',
  },
  orbitRing2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: palette.purple[500] + '10',
  },

  // Description
  description: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 32,
  },
  subDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // CTA Button
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: borderRadius.full,
    minWidth: SCREEN_W * 0.65,
    shadowColor: palette.purple[600],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  ctaCostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  ctaCostText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },

  // How it works
  howItWorks: {
    gap: 12,
    paddingTop: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.purple[500] + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
});
