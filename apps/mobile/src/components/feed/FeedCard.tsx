// FeedCard — dating-first, action-driven post card
// Layout: header → intention → content → horizontal actions (Like, Comment, Flirt) → comment input
// Flirt is the primary CTA — largest, most vibrant, icon+text

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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { INTENTION_TAG_OPTIONS, type FeedPost } from '../../services/socialFeedService';

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

// ─── Music Card ──────────────────────────────────────────────

interface MusicCardProps {
  title: string;
  artist: string;
}

const MusicCard: React.FC<MusicCardProps> = ({ title, artist }) => (
  <View style={musicStyles.container}>
    <View style={musicStyles.iconCircle}>
      <Text style={musicStyles.icon}>{'\uD83C\uDFB5'}</Text>
    </View>
    <View style={musicStyles.info}>
      <Text style={musicStyles.title} numberOfLines={1}>{title}</Text>
      <Text style={musicStyles.artist} numberOfLines={1}>{artist}</Text>
    </View>
  </View>
);

// ─── Question Card ───────────────────────────────────────────

interface QuestionCardProps {
  content: string;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ content }) => (
  <View style={questionStyles.container}>
    <Text style={questionStyles.icon}>{'\u2753'}</Text>
    <Text style={questionStyles.text}>{content}</Text>
  </View>
);

// ─── FeedCard Component ───────────────────────────────────────

interface FeedCardProps {
  post: FeedPost;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onFollow: (userId: string) => void;
  onProfilePress: (userId: string) => void;
  onFlirt: (userId: string) => void;
  onPostTap?: (post: FeedPost) => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ post, onLike, onComment, onFollow, onProfilePress, onFlirt, onPostTap }) => {
  const [expanded, setExpanded] = useState(false);
  const [showDoubleTapMenu, setShowDoubleTapMenu] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const flirtScale = useRef(new Animated.Value(1)).current;
  const doubleTapScale = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const doubleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const intentionOption = INTENTION_TAG_OPTIONS.find((t) => t.id === post.intentionTag);

  const handleFollowPress = useCallback(() => {
    onFollow(post.userId);
  }, [onFollow, post.userId]);

  const handleLikePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    onLike(post.id);
  }, [onLike, post.id, likeScale]);

  const handleFlirtPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(flirtScale, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.spring(flirtScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    onFlirt(post.userId);
  }, [onFlirt, post.userId, flirtScale]);

  const handleCommentPress = useCallback(() => {
    onComment(post.id);
  }, [onComment, post.id]);

  const handleProfilePress = useCallback(() => {
    onProfilePress(post.userId);
  }, [onProfilePress, post.userId]);

  // Double-tap: single → quick preview, double → action menu
  const handleContentPress = useCallback(() => {
    if (post.userId === 'dev-user-001') return;
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      lastTapRef.current = 0;
      if (doubleTapTimerRef.current) { clearTimeout(doubleTapTimerRef.current); doubleTapTimerRef.current = null; }
      setShowDoubleTapMenu(true);
      Animated.spring(doubleTapScale, { toValue: 1, friction: 5, tension: 150, useNativeDriver: true }).start();
      doubleTapTimerRef.current = setTimeout(() => dismissDoubleTapMenu(), 3000);
    } else {
      lastTapRef.current = now;
      doubleTapTimerRef.current = setTimeout(() => {
        if (onPostTap) onPostTap(post);
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }, [post, onPostTap, doubleTapScale]);

  const dismissDoubleTapMenu = useCallback(() => {
    Animated.timing(doubleTapScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowDoubleTapMenu(false));
    if (doubleTapTimerRef.current) { clearTimeout(doubleTapTimerRef.current); doubleTapTimerRef.current = null; }
  }, [doubleTapScale]);

  const handleDoubleTapLike = useCallback(() => { dismissDoubleTapMenu(); handleLikePress(); }, [dismissDoubleTapMenu, handleLikePress]);
  const handleDoubleTapFlirt = useCallback(() => { dismissDoubleTapMenu(); handleFlirtPress(); }, [dismissDoubleTapMenu, handleFlirtPress]);

  const toggleExpand = useCallback(() => { setExpanded((prev) => !prev); }, []);

  const isLongContent = post.content.length > 120;
  const isOwnPost = post.userId === 'dev-user-001';
  const isQuestion = post.postType === 'question';
  const isMusic = post.postType === 'music' && post.musicTitle && post.musicArtist;
  const timeAgo = formatTimeAgo(post.createdAt);

  return (
    <View style={styles.card}>
      {/* ── Header: Avatar + Name + Time + Follow ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
          <Image source={{ uri: post.userAvatarUrl }} style={styles.avatar} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo} onPress={handleProfilePress} activeOpacity={0.7}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{post.userName}</Text>
            {post.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color={palette.purple[400]} />
            )}
          </View>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </TouchableOpacity>

        {!isOwnPost && (
          <TouchableOpacity
            style={[styles.followButton, post.isFollowing && styles.followButtonActive]}
            onPress={handleFollowPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {post.isFollowing ? (
              <Ionicons name="checkmark" size={14} color={colors.textTertiary} />
            ) : (
              <Ionicons name="add" size={14} color={palette.purple[400]} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Intention Badge ── */}
      {intentionOption && (
        <View style={[styles.intentionBadge, { backgroundColor: intentionOption.color + '15', borderColor: intentionOption.color + '30' }]}>
          <Text style={styles.intentionEmoji}>{intentionOption.emoji}</Text>
          <Text style={[styles.intentionLabel, { color: intentionOption.color }]}>{intentionOption.label}</Text>
        </View>
      )}

      {/* ── Content (tappable) ── */}
      <Pressable onPress={handleContentPress}>
        {isQuestion ? (
          <QuestionCard content={post.content} />
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={isLongContent ? toggleExpand : undefined}
            disabled={!isLongContent}
          >
            <Text style={styles.contentText} numberOfLines={expanded ? undefined : 3}>
              {post.content}
            </Text>
            {isLongContent && !expanded && (
              <Text style={styles.readMore}>devami</Text>
            )}
          </TouchableOpacity>
        )}

        <MediaSection photos={post.photoUrls} videoUrl={post.videoUrl} />

        {isMusic && (
          <MusicCard title={post.musicTitle!} artist={post.musicArtist!} />
        )}

        {/* Double-tap overlay */}
        {showDoubleTapMenu && (
          <Animated.View style={[styles.doubleTapOverlay, { opacity: doubleTapScale, transform: [{ scale: doubleTapScale }] }]}>
            <TouchableOpacity style={styles.doubleTapLikeBtn} onPress={handleDoubleTapLike} activeOpacity={0.8}>
              <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={26} color="#FFFFFF" />
              <Text style={styles.doubleTapBtnText}>Beğen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doubleTapFlirtBtn} onPress={handleDoubleTapFlirt} activeOpacity={0.8}>
              <Ionicons name="flame" size={28} color="#FFFFFF" />
              <Text style={styles.doubleTapBtnText}>Flört</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Pressable>

      {/* ── Horizontal Action Bar: Like · Comment · FLIRT ── */}
      <View style={styles.actionRow}>
        {/* Like */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleLikePress} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={post.isLiked ? '#EF4444' : colors.textSecondary}
            />
          </Animated.View>
          {post.likeCount > 0 && (
            <Text style={[styles.actionCount, post.isLiked && { color: '#EF4444' }]}>{post.likeCount}</Text>
          )}
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleCommentPress} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          {post.commentCount > 0 && (
            <Text style={styles.actionCount}>{post.commentCount}</Text>
          )}
        </TouchableOpacity>

        {/* FLIRT — primary CTA, largest + gradient */}
        {!isOwnPost && (
          <TouchableOpacity style={styles.flirtCta} onPress={handleFlirtPress} activeOpacity={0.8}>
            <Animated.View style={[styles.flirtCtaInner, { transform: [{ scale: flirtScale }] }]}>
              <LinearGradient
                colors={['#FF8C33', '#FF6B00', '#E85D00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.flirtCtaGradient}
              >
                <Ionicons name="flame" size={18} color="#FFFFFF" />
                <Text style={styles.flirtCtaText}>Flört Başlat</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Mini comment input — feels like a chat ── */}
      <TouchableOpacity style={styles.commentInput} onPress={handleCommentPress} activeOpacity={0.8}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textTertiary} />
        <Text style={styles.commentPlaceholder}>Bir şeyler yaz, sohbet başlat...</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    flexShrink: 1,
  },
  timeText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    marginTop: 1,
  },
  followButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: palette.purple[400] + '40',
  },
  followButtonActive: {
    borderColor: colors.surfaceBorder,
  },
  // Intention badge
  intentionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  intentionEmoji: { fontSize: 12 },
  intentionLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  // Content
  contentText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  readMore: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: -4,
    marginBottom: spacing.sm,
  },
  // Double-tap overlay
  doubleTapOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: borderRadius.md,
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
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EF444490',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  doubleTapFlirtBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#FF6B00',
    borderWidth: 2,
    borderColor: '#FF8C33',
    shadowColor: '#FF6B00',
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
  // ── Horizontal action bar ──
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingRight: spacing.lg,
  },
  actionCount: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  // Flirt CTA — primary, pushed to right
  flirtCta: {
    marginLeft: 'auto',
  },
  flirtCtaInner: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  flirtCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  flirtCtaText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  // ── Mini comment input ──
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  commentPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
});

// ─── Media Styles ─────────────────────────────────────────────

const mediaStyles = StyleSheet.create({
  videoContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
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
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: { fontSize: 20, color: colors.primary, marginLeft: 3 },
  imageGradientOverlay: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: '40%',
  },
  singleContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    position: 'relative' as const,
  },
  singlePhoto: {
    width: '100%',
    height: 260,
    backgroundColor: colors.surfaceLight,
  },
  doubleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    gap: 2,
    marginBottom: spacing.sm,
  },
  doublePhoto: { flex: 1, height: 180, backgroundColor: colors.surfaceLight },
  tripleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    gap: 2,
    marginBottom: spacing.sm,
    height: 220,
  },
  tripleMain: { flex: 2, backgroundColor: colors.surfaceLight },
  tripleRight: { flex: 1, gap: 2 },
  tripleSub: { flex: 1, backgroundColor: colors.surfaceLight },
});

// ─── Music Card Styles ────────────────────────────────────────

const musicStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${palette.purple[500]}08`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: `${palette.purple[500]}15`,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${palette.purple[500]}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 18 },
  info: { flex: 1, marginLeft: spacing.sm },
  title: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  artist: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
});

// ─── Question Card Styles ─────────────────────────────────────

const questionStyles = StyleSheet.create({
  container: {
    backgroundColor: `${palette.info}08`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: palette.info,
  },
  icon: { fontSize: 18, marginBottom: spacing.xs },
  text: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
