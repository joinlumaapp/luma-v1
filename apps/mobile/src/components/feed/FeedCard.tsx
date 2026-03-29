// FeedCard — minimal, clean post card focused on discovery
// Layout: header (avatar + identity) -> intention -> content -> like action
// Design: soft shadows, warm tones, generous spacing, Poppins typography hierarchy

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { INTENTION_TAG_OPTIONS, type FeedPost } from '../../services/socialFeedService';
// NowListening removed — music feature removed from feed

// ─── Time Ago Helper ──────────────────────────────────────────

const formatTimeAgo = (dateString: string): string => {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'az once';
  if (diffMin < 60) return `${diffMin} dk`;
  if (diffHour < 24) return `${diffHour} sa`;
  if (diffDay < 7) return `${diffDay} gun`;
  return new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
};


// ─── Media Section (photos + video) ──────────────────────────

interface MediaSectionProps {
  photos: string[];
  videoUrl: string | null;
}

const MediaSection: React.FC<MediaSectionProps> = ({ photos, videoUrl }) => {
  if (videoUrl) {
    return (
      <View style={mediaStyles.videoContainer}>
        <Image source={{ uri: videoUrl }} style={mediaStyles.videoThumb} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)']}
          style={mediaStyles.imageGradientOverlay}
          pointerEvents="none"
        />
        <View style={mediaStyles.playOverlay}>
          <View style={mediaStyles.playButton}>
            <Text style={mediaStyles.playIcon}>{'\u25B6'}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (photos.length === 0) return null;

  if (photos.length === 1) {
    return (
      <View style={mediaStyles.singleContainer}>
        <Image source={{ uri: photos[0] }} style={mediaStyles.singlePhoto} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.45)']}
          locations={[0.5, 1]}
          style={mediaStyles.imageGradientOverlay}
          pointerEvents="none"
        />
      </View>
    );
  }

  if (photos.length === 2) {
    return (
      <View style={mediaStyles.doubleContainer}>
        {photos.map((url, i) => (
          <Image key={i} source={{ uri: url }} style={mediaStyles.doublePhoto} />
        ))}
      </View>
    );
  }

  return (
    <View style={mediaStyles.tripleContainer}>
      <Image source={{ uri: photos[0] }} style={mediaStyles.tripleMain} />
      <View style={mediaStyles.tripleRight}>
        {photos.slice(1, 3).map((url, i) => (
          <Image key={i} source={{ uri: url }} style={mediaStyles.tripleSub} />
        ))}
      </View>
    </View>
  );
};

// MusicCard removed — music feature removed from feed

// ─── Question Card (redesigned: soft gradient, inviting) ─────

interface QuestionCardProps {
  content: string;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ content }) => (
  <LinearGradient
    colors={[`${palette.purple[100]}60`, `${palette.pink[50]}50`, `${palette.purple[50]}30`]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={questionStyles.container}
  >
    <View style={questionStyles.iconWrapper}>
      <Text style={questionStyles.icon}>?</Text>
    </View>
    <Text style={questionStyles.text}>{content}</Text>
  </LinearGradient>
);

// ─── Text Content (hook line + body) ─────────────────────────

const TextContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const hookLine = lines[0] || '';
  const restContent = lines.length > 1 ? lines.slice(1).join('\n') : '';

  return (
    <View>
      <Text style={styles.hookLine}>{hookLine}</Text>
      {restContent.length > 0 && (
        <Text style={styles.bodyText}>{restContent}</Text>
      )}
    </View>
  );
};

// ─── FeedCard Component ───────────────────────────────────────

interface FeedCardProps {
  post: FeedPost;
  onLike: (postId: string) => void;
  onFollow: (userId: string) => void;
  onProfilePress: (userId: string) => void;
  onPostTap?: (post: FeedPost) => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ post, onLike, onFollow, onProfilePress, onPostTap }) => {
  const [showDoubleTapMenu, setShowDoubleTapMenu] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const likeGlow = useRef(new Animated.Value(0)).current;
  const likeCountAnim = useRef(new Animated.Value(0)).current;
  const floatingHearts = useRef(
    Array.from({ length: 3 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;
  const doubleTapScale = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const doubleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const intentionOption = INTENTION_TAG_OPTIONS.find((t) => t.id === post.intentionTag);

  const handleFollowPress = useCallback(() => {
    onFollow(post.userId);
  }, [onFollow, post.userId]);

  const handleLikePress = useCallback(() => {
    const willLike = !post.isLiked;

    // Haptic feedback — light tap
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Scale bounce: quick pop up then spring back
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }),
    ]).start();

    // Glow pulse on like
    if (willLike) {
      likeGlow.setValue(0);
      Animated.sequence([
        Animated.timing(likeGlow, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(likeGlow, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();

      // Floating heart particles
      floatingHearts.forEach((heart, i) => {
        heart.opacity.setValue(0);
        heart.translateY.setValue(0);
        heart.translateX.setValue(0);
        heart.scale.setValue(0);
        Animated.parallel([
          Animated.timing(heart.opacity, {
            toValue: 0.8,
            duration: 150,
            delay: i * 60,
            useNativeDriver: true,
          }),
          Animated.timing(heart.scale, {
            toValue: 0.6 + i * 0.15,
            duration: 200,
            delay: i * 60,
            useNativeDriver: true,
          }),
          Animated.timing(heart.translateY, {
            toValue: -(20 + i * 12),
            duration: 500,
            delay: i * 60,
            useNativeDriver: true,
          }),
          Animated.timing(heart.translateX, {
            toValue: (i - 1) * 14,
            duration: 500,
            delay: i * 60,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Animated.timing(heart.opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        });
      });
    }

    // Count animation: slide up on like, slide down on unlike
    likeCountAnim.setValue(willLike ? 8 : -8);
    Animated.spring(likeCountAnim, {
      toValue: 0,
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();

    onLike(post.id);
  }, [onLike, post.id, post.isLiked, likeScale, likeGlow, likeCountAnim, floatingHearts]);

  const handleProfilePress = useCallback(() => {
    onProfilePress(post.userId);
  }, [onProfilePress, post.userId]);

  // Single tap on content = open full-screen post detail, double tap = like
  const handleContentPress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap = like
      lastTapRef.current = 0;
      if (doubleTapTimerRef.current) { clearTimeout(doubleTapTimerRef.current); doubleTapTimerRef.current = null; }
      handleLikePress();
    } else {
      // Single tap = open post detail
      lastTapRef.current = now;
      doubleTapTimerRef.current = setTimeout(() => {
        if (onPostTap) onPostTap(post);
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }, [post, onPostTap, handleLikePress]);

  const dismissDoubleTapMenu = useCallback(() => {
    Animated.timing(doubleTapScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowDoubleTapMenu(false));
    if (doubleTapTimerRef.current) { clearTimeout(doubleTapTimerRef.current); doubleTapTimerRef.current = null; }
  }, [doubleTapScale]);

  const handleDoubleTapLike = useCallback(() => { dismissDoubleTapMenu(); handleLikePress(); }, [dismissDoubleTapMenu, handleLikePress]);

  const isOwnPost = post.userId === 'dev-user-001';
  const isQuestion = post.postType === 'question';
  const timeAgo = formatTimeAgo(post.createdAt);

  return (
    <View style={styles.card}>

      {/* ── Header: Avatar + Identity + Follow ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
          <View style={styles.avatarRing}>
            <Image source={{ uri: post.userAvatarUrl }} style={styles.avatar} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo} onPress={handleProfilePress} activeOpacity={0.7}>
          {/* Name + badge */}
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{post.userName}</Text>
            {post.verificationLevel === 'VERIFIED' && (
              <Ionicons name="checkmark-circle" size={15} color={palette.purple[400]} style={styles.verifiedIcon} />
            )}
            {post.verificationLevel === 'PREMIUM' && (
              <Ionicons name="shield-checkmark" size={15} color={palette.gold[500]} style={styles.verifiedIcon} />
            )}
          </View>

          {/* Subtitle: city + time */}
          <View style={styles.subtitleRow}>
            {post.userCity ? (
              <Text style={styles.subtitleText}>{post.userCity}</Text>
            ) : null}
            {post.userCity ? <Text style={styles.subtitleDot}>{'\u00B7'}</Text> : null}
            <Text style={styles.subtitleText}>{timeAgo}</Text>
          </View>

        </TouchableOpacity>

        {!isOwnPost && (
          <TouchableOpacity
            style={[styles.followButton, post.isFollowing && styles.followButtonActive]}
            onPress={handleFollowPress}
            activeOpacity={0.7}
          >
            {post.isFollowing ? (
              <>
                <Ionicons name="checkmark" size={13} color={palette.purple[400]} />
                <Text style={styles.followButtonTextActive}>Takip</Text>
              </>
            ) : (
              <Text style={styles.followButtonText}>Takip Et</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Intention chip — small, subtle ── */}
      {intentionOption && (
        <View style={[
          styles.intentionChip,
          { backgroundColor: intentionOption.color + '10', borderColor: intentionOption.color + '20' },
        ]}>
          <Text style={styles.intentionEmoji}>{intentionOption.emoji}</Text>
          <Text style={[styles.intentionLabel, { color: intentionOption.color }]}>
            {intentionOption.label}
          </Text>
        </View>
      )}

      {/* ── Content (tappable) ── */}
      <Pressable onPress={handleContentPress}>
        {isQuestion ? (
          <QuestionCard content={post.content} />
        ) : (
          <TextContent content={post.content} />
        )}

        <MediaSection photos={post.photoUrls} videoUrl={post.videoUrl} />

        {/* MusicCard removed — music feature removed */}

        {/* Double-tap overlay removed — double tap triggers like directly */}
      </Pressable>

      {/* ── Action Separator ── */}
      <View style={styles.actionSeparator} />

      {/* ── Horizontal Action Bar: Like only ── */}
      <View style={styles.actionRow}>
        {/* Like — premium interaction with glow + floating hearts */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleLikePress} activeOpacity={0.7}>
          <View style={styles.likeWrapper}>
            {/* Glow pulse behind heart */}
            <Animated.View
              style={[
                styles.likeGlow,
                {
                  opacity: likeGlow,
                  transform: [{ scale: Animated.add(likeGlow, new Animated.Value(0.8)) }],
                },
              ]}
            />

            {/* Floating heart particles */}
            {floatingHearts.map((heart, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.floatingHeart,
                  {
                    opacity: heart.opacity,
                    transform: [
                      { translateY: heart.translateY },
                      { translateX: heart.translateX },
                      { scale: heart.scale },
                    ],
                  },
                ]}
              >
                {'\u2764'}
              </Animated.Text>
            ))}

            <Animated.View style={[styles.actionBtnInner, post.isLiked && styles.actionBtnActive, { transform: [{ scale: likeScale }] }]}>
              <Ionicons
                name={post.isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={post.isLiked ? palette.rose[500] : colors.textSecondary}
              />
              {post.likeCount > 0 && (
                <Animated.Text
                  style={[
                    styles.actionCount,
                    post.isLiked && { color: palette.rose[500] },
                    { transform: [{ translateY: likeCountAnim }] },
                  ]}
                >
                  {post.likeCount}
                </Animated.Text>
              )}
            </Animated.View>
          </View>
        </TouchableOpacity>


      </View>

    </View>
  );
};

// ─── Main Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Card Container ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md + 4,
    paddingBottom: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.smd,
    borderWidth: 1,
    borderColor: `${palette.pink[200]}30`,
    shadowColor: palette.purple[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // ── Header ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm + 4,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.purple[200] + '50',
    backgroundColor: colors.surfaceLight,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceLight,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.smd,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  userName: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    flexShrink: 1,
  },
  verifiedIcon: {
    marginLeft: 3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  subtitleText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  subtitleDot: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.sm,
    marginTop: 4,
    paddingHorizontal: spacing.smd,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: palette.purple[300] + '50',
    backgroundColor: palette.purple[50] + '60',
  },
  followButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: palette.purple[500],
  },
  followButtonActive: {
    borderColor: colors.surfaceBorder,
    backgroundColor: 'transparent',
  },
  followButtonTextActive: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textTertiary,
  },

  // ── Intention Chip (small, subtle) ──
  intentionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  intentionEmoji: {
    fontSize: 13,
  },
  intentionLabel: {
    fontSize: 11.5,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ── Text Content ──
  hookLine: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    marginBottom: 2,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    marginBottom: spacing.sm,
  },

  // ── Double-tap overlay ──
  doubleTapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    zIndex: 10,
  },
  doubleTapLikeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${palette.rose[500]}90`,
    borderWidth: 2,
    borderColor: palette.rose[400],
  },
  _doubleTapFlirtBtn_removed: {
    // Removed: flirt button no longer in feed
    display: 'none',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: palette.coral[500],
    borderWidth: 2,
    borderColor: palette.coral[300],
    shadowColor: palette.coral[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 10,
  },
  doubleTapBtnText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },

  // ── Action Separator ──
  actionSeparator: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginTop: spacing.sm,
    marginHorizontal: -spacing.xs,
    opacity: 0.6,
  },

  // ── Horizontal Action Bar ──
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm + 2,
  },
  actionBtn: {
    marginRight: spacing.sm,
  },
  likeWrapper: {
    position: 'relative',
  },
  likeGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: borderRadius.full,
    backgroundColor: palette.rose[400] + '20',
  },
  floatingHeart: {
    position: 'absolute',
    top: 0,
    left: 8,
    fontSize: 10,
    color: palette.rose[400],
    zIndex: 10,
  },
  actionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
  },
  actionBtnActive: {
    backgroundColor: palette.rose[50] + '80',
  },
  actionCount: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },

  // ── Flirt CTA removed — actions moved to profile screen ──
  _flirtCta_removed: {
    display: 'none',
  },
  _flirtCtaInner_removed: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    shadowColor: palette.coral[500],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  _flirtCtaGradient_removed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
  },
  _flirtCtaText_removed: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Mini Comment Input — removed, comments disabled ──
  _commentInput_removed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 3,
    marginTop: spacing.smd,
    borderWidth: 0.5,
    borderColor: palette.purple[100] + '50',
  },
  _commentPlaceholder_removed: {
    flex: 1,
    fontSize: 13,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    letterSpacing: 0.1,
  },
});

// ─── Media Styles ─────────────────────────────────────────────

const mediaStyles = StyleSheet.create({
  videoContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm + 2,
    height: 240,
    backgroundColor: colors.surfaceLight,
    position: 'relative' as const,
  },
  videoThumb: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  playIcon: { fontSize: 20, color: palette.purple[500], marginLeft: 3 },
  imageGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  singleContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm + 2,
    position: 'relative' as const,
  },
  singlePhoto: {
    width: '100%',
    height: 260,
    backgroundColor: colors.surfaceLight,
  },
  doubleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    gap: 2,
    marginBottom: spacing.sm + 2,
  },
  doublePhoto: { flex: 1, height: 180, backgroundColor: colors.surfaceLight },
  tripleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    gap: 2,
    marginBottom: spacing.sm + 2,
    height: 220,
  },
  tripleMain: { flex: 2, backgroundColor: colors.surfaceLight },
  tripleRight: { flex: 1, gap: 2 },
  tripleSub: { flex: 1, backgroundColor: colors.surfaceLight },
});

// Music styles removed — music feature removed

// ─── Question Card Styles ─────────────────────────────────────

const questionStyles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md + 4,
    marginBottom: spacing.smd,
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: palette.purple[200] + '40',
  },
  icon: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
    color: palette.purple[500],
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.15,
  },
});
