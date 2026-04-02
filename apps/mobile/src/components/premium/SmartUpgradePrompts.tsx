// SmartUpgradePrompts — Natural, non-aggressive upgrade nudges
// Contextual prompts that appear at the RIGHT moment, not randomly
// Psychological triggers: social proof, scarcity, FOMO, loss aversion

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CachedAvatar } from '../common/CachedAvatar';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontWeights } from '../../theme/typography';

// ─── 1. "Birisi seni begendi" teaser ────────────────────────────

interface LikedYouTeaserProps {
  count: number;
  blurredAvatars: string[];
  onPress: () => void;
}

export const LikedYouTeaser: React.FC<LikedYouTeaserProps> = ({ count, blurredAvatars, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  if (count <= 0) return null;

  return (
    <Animated.View style={[teaserStyles.container, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={teaserStyles.touchable}>
        {/* Blurred avatars */}
        <View style={teaserStyles.avatarRow}>
          {blurredAvatars.slice(0, 3).map((uri, i) => (
            <View key={i} style={[teaserStyles.blurredAvatar, { marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i }]}>
              <CachedAvatar uri={uri} size={36} />
              <View style={teaserStyles.blurOverlay} />
            </View>
          ))}
        </View>

        <View style={teaserStyles.textCol}>
          <Text style={teaserStyles.title}>
            {count} kisi seni begendi
          </Text>
          <Text style={teaserStyles.subtitle}>
            Kim oldugunu gormek ister misin?
          </Text>
        </View>

        <View style={teaserStyles.arrow}>
          <Ionicons name="chevron-forward" size={18} color={palette.gold[500]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const teaserStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.gold[500] + '30',
    backgroundColor: palette.gold[500] + '08',
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  avatarRow: { flexDirection: 'row' },
  blurredAvatar: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: '#FFFFFF', overflow: 'hidden',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  textCol: { flex: 1 },
  title: {
    fontSize: 14, fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12, fontFamily: 'Poppins_400Regular', fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },
  arrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: palette.gold[500] + '15', justifyContent: 'center', alignItems: 'center',
  },
});

// ─── 2. Sinirli sureli boost teklifi ─────────────────────────────

interface TimedBoostOfferProps {
  discountPercent: number;
  expiresInMinutes: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export const TimedBoostOffer: React.FC<TimedBoostOfferProps> = ({
  discountPercent,
  expiresInMinutes,
  onAccept,
  onDismiss,
}) => {
  const [minutesLeft, setMinutesLeft] = useState(expiresInMinutes);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Countdown
    const timer = setInterval(() => {
      setMinutesLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 60000);

    // Shimmer
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
    ).start();

    return () => clearInterval(timer);
  }, [shimmerAnim, onDismiss]);

  return (
    <View style={boostStyles.container}>
      <LinearGradient
        colors={[palette.gold[500] + '15', palette.gold[500] + '05']}
        style={boostStyles.gradient}
      >
        <View style={boostStyles.header}>
          <View style={boostStyles.urgencyBadge}>
            <Ionicons name="time-outline" size={12} color={palette.gold[600]} />
            <Text style={boostStyles.urgencyText}>{minutesLeft} dk kaldi</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={boostStyles.content}>
          <Ionicons name="flash" size={28} color={palette.gold[500]} />
          <View style={boostStyles.textCol}>
            <Text style={boostStyles.title}>
              Boost %{discountPercent} indirimli!
            </Text>
            <Text style={boostStyles.subtitle}>
              Profilini 30 dakika one cikar, 10x daha fazla goruntulenme al.
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onAccept} activeOpacity={0.85}>
          <LinearGradient
            colors={[palette.gold[500], palette.gold[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={boostStyles.acceptButton}
          >
            <Text style={boostStyles.acceptText}>Simdi Boost Yap</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const boostStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.gold[500] + '25',
  },
  gradient: { padding: spacing.md, gap: spacing.sm },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  urgencyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: palette.gold[500] + '20', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  urgencyText: {
    fontSize: 11, fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold,
    color: palette.gold[600],
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  textCol: { flex: 1 },
  title: {
    fontSize: 16, fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 13, fontFamily: 'Poppins_400Regular', fontWeight: fontWeights.regular,
    color: colors.textSecondary, lineHeight: 19,
  },
  acceptButton: {
    height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  acceptText: {
    fontSize: 15, fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
});

// ─── 3. Eslesme sonrasi premium onerisi ──────────────────────────

interface MatchUpgradeNudgeProps {
  matchName: string;
  matchAvatarUrl: string;
  feature: 'priority_message' | 'see_read' | 'unlimited_chat';
  onUpgrade: () => void;
  onDismiss: () => void;
}

const NUDGE_CONFIG = {
  priority_message: {
    icon: 'arrow-up-circle' as const,
    title: 'Mesajin one cikarilsin mi?',
    subtitle: '{name} her gun onlarca mesaj aliyor. Oncelikli mesaj ile ilk sen gorun.',
    cta: 'Oncelikli Gonder',
    cost: '30 Jeton',
  },
  see_read: {
    icon: 'eye-outline' as const,
    title: 'Mesajin okundu mu?',
    subtitle: '{name} mesajini okudugunda bildirim al. Premium ile bu ozellik aktif.',
    cta: 'Premium\'a Gec',
    cost: '',
  },
  unlimited_chat: {
    icon: 'chatbubbles-outline' as const,
    title: 'Sohbete devam et!',
    subtitle: 'Gunluk mesaj limitine ulastin. Premium ile sinir olmadan sohbet et.',
    cta: 'Limiti Kaldir',
    cost: '',
  },
};

export const MatchUpgradeNudge: React.FC<MatchUpgradeNudgeProps> = ({
  matchName,
  matchAvatarUrl,
  feature,
  onUpgrade,
  onDismiss,
}) => {
  const config = NUDGE_CONFIG[feature];
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }).start();
  }, [slideAnim]);

  return (
    <Animated.View style={[nudgeStyles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={nudgeStyles.row}>
        <CachedAvatar uri={matchAvatarUrl} size={40} />
        <View style={nudgeStyles.textCol}>
          <Text style={nudgeStyles.title}>{config.title}</Text>
          <Text style={nudgeStyles.subtitle}>
            {config.subtitle.replace('{name}', matchName)}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onUpgrade} activeOpacity={0.85}>
        <LinearGradient
          colors={[palette.purple[500], palette.purple[700]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={nudgeStyles.ctaButton}
        >
          <Ionicons name={config.icon} size={16} color="#FFFFFF" />
          <Text style={nudgeStyles.ctaText}>{config.cta}</Text>
          {config.cost ? (
            <View style={nudgeStyles.costBadge}>
              <Text style={nudgeStyles.costText}>{config.cost}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const nudgeStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  textCol: { flex: 1 },
  title: {
    fontSize: 15, fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 13, fontFamily: 'Poppins_400Regular', fontWeight: fontWeights.regular,
    color: colors.textSecondary, lineHeight: 19, marginTop: 2,
  },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 44, borderRadius: 22, gap: 8,
  },
  ctaText: {
    fontSize: 15, fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
  costBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  costText: {
    fontSize: 11, fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
});

// ─── 4. Haftalik rapor ile upgrade ───────────────────────────────

interface WeeklyInsightNudgeProps {
  viewCount: number;
  likeCount: number;
  missedMatches: number;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export const WeeklyInsightNudge: React.FC<WeeklyInsightNudgeProps> = ({
  viewCount,
  likeCount,
  missedMatches,
  onUpgrade,
  onDismiss,
}) => {
  return (
    <View style={weeklyStyles.container}>
      <View style={weeklyStyles.header}>
        <Ionicons name="bar-chart-outline" size={18} color={palette.purple[500]} />
        <Text style={weeklyStyles.headerTitle}>Haftalik Rapor</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={weeklyStyles.statsRow}>
        <View style={weeklyStyles.statItem}>
          <Text style={weeklyStyles.statNumber}>{viewCount}</Text>
          <Text style={weeklyStyles.statLabel}>Goruntuleme</Text>
        </View>
        <View style={weeklyStyles.statDivider} />
        <View style={weeklyStyles.statItem}>
          <Text style={weeklyStyles.statNumber}>{likeCount}</Text>
          <Text style={weeklyStyles.statLabel}>Begeni</Text>
        </View>
        <View style={weeklyStyles.statDivider} />
        <View style={weeklyStyles.statItem}>
          <Text style={[weeklyStyles.statNumber, { color: '#EF4444' }]}>{missedMatches}</Text>
          <Text style={weeklyStyles.statLabel}>Kacirilan</Text>
        </View>
      </View>

      {/* Loss aversion message */}
      {missedMatches > 0 && (
        <Text style={weeklyStyles.lossText}>
          Bu hafta {missedMatches} potansiyel eslesmeyi kacirdin. Premium ile hepsini gor.
        </Text>
      )}

      <TouchableOpacity onPress={onUpgrade} activeOpacity={0.85}>
        <LinearGradient
          colors={[palette.purple[500], palette.pink[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={weeklyStyles.upgradeButton}
        >
          <Text style={weeklyStyles.upgradeText}>Kacirma, Premium'a Gec</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const weeklyStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  headerTitle: {
    fontSize: 16, fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold,
    color: colors.text, flex: 1,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md, padding: spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontSize: 22, fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold,
    color: palette.purple[600],
  },
  statLabel: {
    fontSize: 11, fontFamily: 'Poppins_400Regular', fontWeight: fontWeights.regular,
    color: colors.textTertiary, marginTop: 2,
  },
  statDivider: {
    width: 1, height: 28, backgroundColor: colors.surfaceBorder,
  },
  lossText: {
    fontSize: 13, fontFamily: 'Poppins_400Regular', fontWeight: fontWeights.regular,
    color: '#EF4444', lineHeight: 19,
  },
  upgradeButton: {
    height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
  },
  upgradeText: {
    fontSize: 15, fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
});

// ─── 5. Sosyal kanit banner ──────────────────────────────────────

interface SocialProofBannerProps {
  recentUpgradeCount: number;
  onPress: () => void;
}

export const SocialProofBanner: React.FC<SocialProofBannerProps> = ({ recentUpgradeCount, onPress }) => {
  if (recentUpgradeCount < 5) return null;

  return (
    <TouchableOpacity style={socialStyles.container} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name="trending-up" size={16} color={palette.purple[500]} />
      <Text style={socialStyles.text}>
        Son 24 saatte <Text style={socialStyles.bold}>{recentUpgradeCount} kisi</Text> Premium'a gecti
      </Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

const socialStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.md,
    backgroundColor: palette.purple[500] + '08',
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: palette.purple[500] + '15',
  },
  text: {
    flex: 1, fontSize: 13, fontFamily: 'Poppins_400Regular', fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },
  bold: {
    fontFamily: 'Poppins_600SemiBold', fontWeight: fontWeights.semibold, color: colors.text,
  },
});
