// FeedCard — individual post card for Social Feed
// Features: avatar, follow button, content, photo grid, video thumbnail, actions

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { FEED_TOPICS, type FeedPost } from '../../services/socialFeedService';

const CARD_PADDING = spacing.lg;

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
  // Video thumbnail
  if (videoUrl) {
    return (
      <View style={mediaStyles.videoContainer}>
        <Image source={{ uri: videoUrl }} style={mediaStyles.videoThumb} />
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
        <Image source={{ uri: photos[0] }} style={mediaStyles.singlePhoto} />
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

  // 3+ photos
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

// ─── FeedCard Component ───────────────────────────────────────

interface FeedCardProps {
  post: FeedPost;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onFollow: (userId: string) => void;
  onProfilePress: (userId: string) => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ post, onLike, onComment, onFollow, onProfilePress }) => {
  const [expanded, setExpanded] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;

  const topicOption = FEED_TOPICS.find((t) => t.type === post.topic);

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

  const handleFollowPress = useCallback(() => {
    onFollow(post.userId);
  }, [onFollow, post.userId]);

  const handleProfilePress = useCallback(() => {
    onProfilePress(post.userId);
  }, [onProfilePress, post.userId]);

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const isLongContent = post.content.length > 120;
  // Don't show follow button on own posts
  const isOwnPost = post.userId === 'dev-user-001';

  return (
    <View style={styles.card}>
      {/* User Row */}
      <View style={styles.userRow}>
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
          <Image source={{ uri: post.userAvatarUrl }} style={styles.avatar} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.userInfo} onPress={handleProfilePress} activeOpacity={0.7}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{post.userName}</Text>
            {post.isVerified && <Text style={styles.verifiedBadge}>{'✓'}</Text>}
          </View>
          <Text style={styles.timeText}>{formatTimeAgo(post.createdAt)}</Text>
        </TouchableOpacity>
        {/* Follow button */}
        {!isOwnPost && (
          <TouchableOpacity
            style={[styles.followButton, post.isFollowing && styles.followButtonActive]}
            onPress={handleFollowPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.followButtonText, post.isFollowing && styles.followButtonTextActive]}>
              {post.isFollowing ? 'Takip' : 'Takip Et'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Topic Badge */}
      {topicOption && (
        <View style={[styles.topicBadge, { backgroundColor: `${topicOption.color}15` }]}>
          <Text style={styles.topicEmoji}>{topicOption.emoji}</Text>
          <Text style={[styles.topicLabel, { color: topicOption.color }]}>
            {topicOption.label}
          </Text>
        </View>
      )}

      {/* Content */}
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
          <Text style={styles.readMore}>devamını oku</Text>
        )}
      </TouchableOpacity>

      {/* Media (photos + video) */}
      <MediaSection photos={post.photoUrls} videoUrl={post.videoUrl} />

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLikePress}
          activeOpacity={0.7}
        >
          <Animated.Text
            style={[
              styles.actionIcon,
              post.isLiked && styles.actionIconLiked,
              { transform: [{ scale: likeScale }] },
            ]}
          >
            {post.isLiked ? '\uD83D\uDC9C' : '\u2661'}
          </Animated.Text>
          <Text style={[styles.actionCount, post.isLiked && styles.actionCountLiked]}>
            {post.likeCount > 0 ? post.likeCount : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCommentPress}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>{'\uD83D\uDCAC'}</Text>
          <Text style={styles.actionCount}>
            {post.commentCount > 0 ? post.commentCount : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>{'\u2197\uFE0F'}</Text>
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
    padding: CARD_PADDING,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 4,
    ...shadows.small,
  },
  // User row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceLight,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm + 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  verifiedBadge: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  timeText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  // Follow button
  followButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  followButtonActive: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  followButtonText: {
    ...typography.captionSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  followButtonTextActive: {
    color: colors.textSecondary,
  },
  // Topic badge — now below user row
  topicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    gap: 4,
    marginBottom: spacing.sm,
  },
  topicEmoji: {
    fontSize: 13,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Content
  contentText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  readMore: {
    ...typography.caption,
    color: colors.primary,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  actionIconLiked: {
    color: colors.primary,
  },
  actionCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionCountLiked: {
    color: colors.primary,
    fontWeight: '600',
  },
});

// ─── Media Styles ─────────────────────────────────────────────

const mediaStyles = StyleSheet.create({
  // Video
  videoContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    height: 220,
    backgroundColor: colors.surfaceLight,
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 22,
    color: colors.primary,
    marginLeft: 3,
  },
  videoBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  videoBadgeText: {
    ...typography.captionSmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Photos
  singleContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  singlePhoto: {
    width: '100%',
    height: 220,
    backgroundColor: colors.surfaceLight,
  },
  doubleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    gap: spacing.xs,
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
    gap: spacing.xs,
    marginBottom: spacing.sm,
    height: 220,
  },
  tripleMain: {
    flex: 2,
    backgroundColor: colors.surfaceLight,
  },
  tripleRight: {
    flex: 1,
    gap: spacing.xs,
  },
  tripleSub: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
  },
});
