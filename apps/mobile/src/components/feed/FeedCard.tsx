// FeedCard — individual post card for Social Feed
// Clean, premium card with clear hierarchy: identity → content → actions
// Simplified from v1: removed view count, standalone profile button, compat badge,
// moved topic inline, tightened spacing

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { FEED_TOPICS, type FeedPost } from '../../services/socialFeedService';

// ─── Time Ago Helper ──────────────────────────────────────────

const formatTimeAgo = (dateString: string): string => {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk`;
  if (diffHour < 24) return `${diffHour} sa`;
  if (diffDay < 7) return `${diffDay} gün`;
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
            <Text style={mediaStyles.playIcon}>{'▶'}</Text>
          </View>
        </View>
        <View style={mediaStyles.videoBadge}>
          <Text style={mediaStyles.videoBadgeText}>Video</Text>
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
    <View style={musicStyles.playBtn}>
      <Text style={musicStyles.playIcon}>{'▶'}</Text>
    </View>
  </View>
);

// ─── Question Card ───────────────────────────────────────────

interface QuestionCardProps {
  content: string;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ content }) => (
  <View style={questionStyles.container}>
    <Text style={questionStyles.icon}>{'❓'}</Text>
    <Text style={questionStyles.text}>{content}</Text>
  </View>
);

// ─── FeedCard Component ───────────────────────────────────────

interface FeedCardProps {
  post: FeedPost;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onSave: (postId: string) => void;
  onFollow: (userId: string) => void;
  onProfilePress: (userId: string) => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ post, onLike, onComment, onSave, onFollow, onProfilePress }) => {
  const [expanded, setExpanded] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;

  const topicOption = FEED_TOPICS.find((t) => t.type === post.topic);

  const handleFollowPress = useCallback(() => {
    onFollow(post.userId);
  }, [onFollow, post.userId]);

  const handleLikePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.4,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(likeScale, {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
    onLike(post.id);
  }, [onLike, post.id, likeScale]);

  const handleCommentPress = useCallback(() => {
    onComment(post.id);
  }, [onComment, post.id]);

  const handleSavePress = useCallback(() => {
    onSave(post.id);
  }, [onSave, post.id]);

  const handleProfilePress = useCallback(() => {
    onProfilePress(post.userId);
  }, [onProfilePress, post.userId]);

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const isLongContent = post.content.length > 120;
  const isOwnPost = post.userId === 'dev-user-001';
  const isQuestion = post.postType === 'question';
  const isMusic = post.postType === 'music' && post.musicTitle && post.musicArtist;

  const timeAgo = formatTimeAgo(post.createdAt);

  return (
    <View style={styles.card}>
      {/* ── Header: Avatar + Name + Topic + Time + Follow ── */}
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
          <View style={styles.metaRow}>
            <Text style={styles.timeText}>{timeAgo}</Text>
            {topicOption && (
              <>
                <Text style={styles.metaDot}>{'\u00B7'}</Text>
                <Text style={[styles.topicInline, { color: topicOption.color }]}>
                  {topicOption.emoji} {topicOption.label}
                </Text>
              </>
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
              <Ionicons name="add" size={14} color={palette.purple[400]} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content ── */}
      {isQuestion ? (
        <QuestionCard content={post.content} />
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={isLongContent ? toggleExpand : undefined}
          disabled={!isLongContent}
        >
          <Text
            style={styles.contentText}
            numberOfLines={expanded ? undefined : 3}
          >
            {post.content}
          </Text>
          {isLongContent && !expanded && (
            <Text style={styles.readMore}>devamı</Text>
          )}
        </TouchableOpacity>
      )}

      {/* ── Media ── */}
      <MediaSection photos={post.photoUrls} videoUrl={post.videoUrl} />

      {/* ── Music ── */}
      {isMusic && (
        <MusicCard title={post.musicTitle!} artist={post.musicArtist!} />
      )}

      {/* ── Actions: Like + Comment + Save ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLikePress}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={post.isLiked ? palette.purple[400] : colors.textSecondary}
            />
          </Animated.View>
          {post.likeCount > 0 && (
            <Text style={[styles.actionCount, post.isLiked && styles.actionCountActive]}>
              {post.likeCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCommentPress}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          {post.commentCount > 0 && (
            <Text style={styles.actionCount}>{post.commentCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSavePress}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Ionicons
            name={post.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={post.isSaved ? palette.gold[600] : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
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
    paddingBottom: spacing.sm,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  timeText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  metaDot: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  topicInline: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  // Follow — icon-only pill, minimal footprint
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
  // Actions — clean, evenly spaced, no divider line
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg + 4,
    paddingTop: spacing.xs + 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  actionCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    lineHeight: 16,
  },
  actionCountActive: {
    color: palette.purple[400],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  playIcon: {
    fontSize: 20,
    color: colors.primary,
    marginLeft: 3,
  },
  videoBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  videoBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  imageGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  doublePhoto: {
    flex: 1,
    height: 180,
    backgroundColor: colors.surfaceLight,
  },
  tripleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    gap: 2,
    marginBottom: spacing.sm,
    height: 220,
  },
  tripleMain: {
    flex: 2,
    backgroundColor: colors.surfaceLight,
  },
  tripleRight: {
    flex: 1,
    gap: 2,
  },
  tripleSub: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
  },
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${palette.purple[500]}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  artist: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 2,
  },
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
  icon: {
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  text: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
