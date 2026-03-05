// FeedCard — individual post card for Social Feed
// Glassmorphism card with avatar, content, photo grid, and action buttons

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors, glassmorphism } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { FEED_TOPICS, type FeedPost } from '../../services/socialFeedService';

const CARD_PADDING = spacing.md;

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

// ─── Photo Grid ───────────────────────────────────────────────

interface PhotoGridProps {
  photos: string[];
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ photos }) => {
  if (photos.length === 0) return null;

  if (photos.length === 1) {
    return (
      <View style={photoStyles.singleContainer}>
        <Image source={{ uri: photos[0] }} style={photoStyles.singlePhoto} />
      </View>
    );
  }

  if (photos.length === 2) {
    return (
      <View style={photoStyles.doubleContainer}>
        {photos.map((url, i) => (
          <Image key={i} source={{ uri: url }} style={photoStyles.doublePhoto} />
        ))}
      </View>
    );
  }

  // 3+ photos: grid layout
  return (
    <View style={photoStyles.tripleContainer}>
      <Image source={{ uri: photos[0] }} style={photoStyles.tripleMain} />
      <View style={photoStyles.tripleRight}>
        {photos.slice(1, 3).map((url, i) => (
          <Image key={i} source={{ uri: url }} style={photoStyles.tripleSub} />
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
}

export const FeedCard: React.FC<FeedCardProps> = ({ post, onLike, onComment }) => {
  const [expanded, setExpanded] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;

  const topicOption = FEED_TOPICS.find((t) => t.type === post.topic);

  const handleLikePress = useCallback(() => {
    // Bounce animation
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

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const isLongContent = post.content.length > 120;

  return (
    <View style={styles.card}>
      {/* User Row */}
      <View style={styles.userRow}>
        <Image source={{ uri: post.userAvatarUrl }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{post.userName}</Text>
            {post.isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
          </View>
          <Text style={styles.timeText}>{formatTimeAgo(post.createdAt)}</Text>
        </View>
        {topicOption && (
          <View style={[styles.topicBadge, { backgroundColor: `${topicOption.color}20` }]}>
            <Text style={styles.topicEmoji}>{topicOption.emoji}</Text>
            <Text style={[styles.topicLabel, { color: topicOption.color }]}>
              {topicOption.label}
            </Text>
          </View>
        )}
      </View>

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

      {/* Photo Grid */}
      <PhotoGrid photos={post.photoUrls} />

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
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: glassmorphism.border,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  verifiedBadge: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  timeText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginTop: 1,
  },
  topicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 3,
  },
  topicEmoji: {
    fontSize: 12,
  },
  topicLabel: {
    fontSize: 11,
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
    ...typography.caption,
    color: colors.primary,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: 18,
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

// ─── Photo Styles ─────────────────────────────────────────────

const photoStyles = StyleSheet.create({
  singleContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  singlePhoto: {
    width: '100%',
    height: 200,
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
    height: 160,
    backgroundColor: colors.surfaceLight,
  },
  tripleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    height: 200,
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
