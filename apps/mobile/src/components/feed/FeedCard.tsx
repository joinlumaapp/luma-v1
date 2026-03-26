// FeedCard — premium, warm, dating-first post card
// Layout: header (avatar + identity + badges) -> intention -> content -> actions -> comment input
// Flirt is the primary CTA — largest, most vibrant, icon+text
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
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

// ─── Identity Line Helper ─────────────────────────────────────

const buildIdentityLine = (age: number, city: string, profession: string | null): string => {
  const parts: string[] = [];
  if (age > 0) parts.push(String(age));
  if (city) parts.push(city);
  if (profession) parts.push(profession);
  return parts.join(' \u2022 ');
};

// ─── Vibe Chips ───────────────────────────────────────────────

interface VibeChipsProps {
  vibes: string[];
  maxCount?: number;
}

const VibeChips: React.FC<VibeChipsProps> = ({ vibes, maxCount = 3 }) => {
  if (!vibes || vibes.length === 0) return null;
  const visibleVibes = vibes.slice(0, maxCount);

  return (
    <View style={vibeStyles.container}>
      {visibleVibes.map((vibe, index) => (
        <View key={index} style={vibeStyles.chip}>
          <Text style={vibeStyles.chipText}>{vibe}</Text>
        </View>
      ))}
    </View>
  );
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

interface TextContentProps {
  content: string;
  expanded: boolean;
  isLong: boolean;
  onToggle: () => void;
}

const TextContent: React.FC<TextContentProps> = ({ content, expanded, isLong, onToggle }) => {
  const lines = content.split('\n');
  const hookLine = lines[0] || '';
  const restContent = lines.length > 1 ? lines.slice(1).join('\n') : '';
  const hasMultipleLines = lines.length > 1;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={isLong ? onToggle : undefined}
      disabled={!isLong}
    >
      {/* Hook line: first line is slightly larger and bolder */}
      <Text style={styles.hookLine} numberOfLines={expanded ? undefined : 1}>
        {hookLine}
      </Text>

      {/* Remaining text: normal body style */}
      {hasMultipleLines && (
        <Text style={styles.bodyText} numberOfLines={expanded ? undefined : 2}>
          {restContent}
        </Text>
      )}

      {/* If content is short but was a single block, show as body when no hook split */}
      {!hasMultipleLines && content.length > 60 && (
        <Text style={styles.bodyText} numberOfLines={expanded ? undefined : 2}>
          {/* Hook line already rendered above, this handles overflow for single-line long posts */}
        </Text>
      )}

      {isLong && !expanded && (
        <Text style={styles.readMore}>devamını oku</Text>
      )}
    </TouchableOpacity>
  );
};

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
  const identityLine = buildIdentityLine(post.userAge, post.userCity, post.userProfession);

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

  // Double-tap: single -> quick preview, double -> action menu
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

      {/* ── Header: Avatar + Identity + Follow ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
          <View style={styles.avatarRing}>
            <Image source={{ uri: post.userAvatarUrl }} style={styles.avatar} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo} onPress={handleProfilePress} activeOpacity={0.7}>
          {/* Name row: name, age, verified */}
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {post.userName}
              {post.userAge > 0 && (
                <Text style={styles.userAge}>, {post.userAge}</Text>
              )}
            </Text>
            {post.isVerified && (
              <Ionicons name="checkmark-circle" size={15} color={palette.purple[400]} style={styles.verifiedIcon} />
            )}
          </View>

          {/* Subtitle: city + profession */}
          {identityLine.length > 0 && (
            <Text style={styles.identityLine} numberOfLines={1}>{identityLine}</Text>
          )}

          {/* Inline micro-badges: distance + compatibility */}
          <View style={styles.metaRow}>
            <Text style={styles.timeText}>{timeAgo}</Text>
            {post.distance > 0 && (
              <View style={styles.metaBadge}>
                <Ionicons name="location" size={10} color={palette.coral[400]} />
                <Text style={styles.metaBadgeText}>{post.distance} km</Text>
              </View>
            )}
            {post.compatibilityScore > 0 && (
              <View style={[styles.metaBadge, styles.compatBadge]}>
                <Text style={styles.compatBadgeIcon}>{'\uD83D\uDC9C'}</Text>
                <Text style={styles.compatBadgeText}>%{post.compatibilityScore} uyum</Text>
              </View>
            )}
          </View>
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
              <Ionicons name="add" size={15} color={palette.purple[500]} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Vibe Chips ── */}
      <VibeChips vibes={post.userVibes} maxCount={3} />

      {/* ── Intention Badge (premium, soft glow) ── */}
      {intentionOption && (
        <View style={[
          styles.intentionBadge,
          {
            backgroundColor: intentionOption.color + '12',
            borderColor: intentionOption.color + '25',
            shadowColor: intentionOption.color,
          },
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
          <TextContent
            content={post.content}
            expanded={expanded}
            isLong={isLongContent}
            onToggle={toggleExpand}
          />
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

      {/* ── Action Separator ── */}
      <View style={styles.actionSeparator} />

      {/* ── Horizontal Action Bar: Like + Comment + FLIRT ── */}
      <View style={styles.actionRow}>
        {/* Like */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleLikePress} activeOpacity={0.7}>
          <Animated.View style={[styles.actionBtnInner, post.isLiked && styles.actionBtnActive, { transform: [{ scale: likeScale }] }]}>
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={post.isLiked ? palette.rose[500] : colors.textSecondary}
            />
            {post.likeCount > 0 && (
              <Text style={[styles.actionCount, post.isLiked && { color: palette.rose[500] }]}>{post.likeCount}</Text>
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleCommentPress} activeOpacity={0.7}>
          <View style={styles.actionBtnInner}>
            <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />
            {post.commentCount > 0 && (
              <Text style={styles.actionCount}>{post.commentCount}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* FLIRT — primary CTA, pushed to right */}
        {!isOwnPost && (
          <TouchableOpacity style={styles.flirtCta} onPress={handleFlirtPress} activeOpacity={0.8}>
            <Animated.View style={[styles.flirtCtaInner, { transform: [{ scale: flirtScale }] }]}>
              <LinearGradient
                colors={[palette.coral[400], palette.coral[500], palette.coral[600]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.flirtCtaGradient}
              >
                <Ionicons name="flame" size={17} color="#FFFFFF" />
                <Text style={styles.flirtCtaText}>Flört Başlat</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Mini comment input — warm and personal ── */}
      <TouchableOpacity style={styles.commentInput} onPress={handleCommentPress} activeOpacity={0.8}>
        <Ionicons name="chatbubble-ellipses-outline" size={15} color={palette.purple[300]} />
        <Text style={styles.commentPlaceholder}>Ona ne söylemek istersin?</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Vibe Chip Styles ─────────────────────────────────────────

const vibeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm + 2,
  },
  chip: {
    backgroundColor: palette.purple[50] + 'CC',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: palette.purple[200] + '60',
  },
  chipText: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: palette.purple[600],
    letterSpacing: 0.2,
  },
});

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
  userAge: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  verifiedIcon: {
    marginLeft: 3,
  },
  identityLine: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    marginTop: 1,
    letterSpacing: 0.15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: palette.gray[100] + '80',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  metaBadgeText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  compatBadge: {
    backgroundColor: palette.purple[50] + '90',
  },
  compatBadgeIcon: {
    fontSize: 9,
  },
  compatBadgeText: {
    fontSize: 10,
    color: palette.purple[500],
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  followButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: palette.purple[300] + '40',
    backgroundColor: palette.purple[50] + '50',
  },
  followButtonActive: {
    borderColor: colors.surfaceBorder,
    backgroundColor: 'transparent',
  },

  // ── Intention Badge (premium, soft glow) ──
  intentionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: spacing.smd,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginBottom: spacing.smd,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
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
  readMore: {
    fontSize: 13,
    color: palette.purple[400],
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
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
  doubleTapFlirtBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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

  // ── Flirt CTA (primary, pushed to right) ──
  flirtCta: {
    marginLeft: 'auto',
  },
  flirtCtaInner: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    shadowColor: palette.coral[500],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  flirtCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
  },
  flirtCtaText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Mini Comment Input ──
  commentInput: {
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
  commentPlaceholder: {
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

// ─── Music Card Styles ────────────────────────────────────────

const musicStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${palette.purple[50]}80`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: `${palette.purple[200]}30`,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${palette.purple[100]}70`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 18 },
  info: { flex: 1, marginLeft: spacing.smd },
  title: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  artist: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    marginTop: 2,
  },
});

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
