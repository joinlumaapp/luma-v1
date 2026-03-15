// FeedCard — individual post card for Social Feed
// Features: avatar, distance, content, photo grid, video, music, actions, compatibility badge

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
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

  return (
    <View style={styles.card}>
      {/* ── Top Section: Avatar, Name, Distance ── */}
      <View style={styles.userRow}>
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
          <Image source={{ uri: post.userAvatarUrl }} style={styles.avatar} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.userInfo} onPress={handleProfilePress} activeOpacity={0.7}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{post.userName}</Text>
            {post.isVerified && <Text style={styles.verifiedBadge}>{'✓'}</Text>}
            {post.distance > 0 && (
              <>
                <Text style={styles.dotSeparator}>{'•'}</Text>
                <Text style={styles.distanceText}>{post.distance} km uzakta</Text>
              </>
            )}
          </View>
          <Text style={styles.timeText}>{formatTimeAgo(post.createdAt)}</Text>
        </TouchableOpacity>
        {!isOwnPost && (
          <TouchableOpacity
            style={[styles.followButton, post.isFollowing && styles.followButtonActive]}
            onPress={handleFollowPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.followButtonText, post.isFollowing && styles.followButtonTextActive]}>
              {post.isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
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

      {/* ── Middle Section: Content ── */}
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
            <Text style={styles.readMore}>{'Devamını Oku \u2192'}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Media (photos + video) */}
      <MediaSection photos={post.photoUrls} videoUrl={post.videoUrl} />

      {/* Music card */}
      {isMusic && (
        <MusicCard title={post.musicTitle!} artist={post.musicArtist!} />
      )}

      {/* Compatibility Badge */}
      {!isOwnPost && post.compatibilityScore > 0 && (
        <View style={styles.compatBadge}>
          <Text style={styles.compatEmoji}>{'\uD83D\uDC9C'}</Text>
          <Text style={styles.compatText}>{post.compatibilityScore}% Uyum</Text>
        </View>
      )}

      {/* ── Bottom Section: Like, Comment, View Profile ── */}
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
            {post.isLiked ? '\uD83D\uDC9C' : '♡'}
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

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSavePress}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionIcon, post.isSaved && styles.actionIconSaved]}>
            {post.isSaved ? '\uD83D\uDD16' : '\u2606'}
          </Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {!isOwnPost && (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            <Text style={styles.profileButtonText}>Profili Gör</Text>
          </TouchableOpacity>
        )}
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  verifiedBadge: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  dotSeparator: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  distanceText: {
    ...typography.caption,
    color: colors.textTertiary,
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
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  followButtonTextActive: {
    color: colors.textSecondary,
  },
  // Topic badge
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
    fontFamily: 'Poppins_600SemiBold',
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
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  // Compatibility badge
  compatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${palette.purple[500]}12`,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  compatEmoji: {
    fontSize: 13,
  },
  compatText: {
    ...typography.caption,
    color: palette.purple[500],
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
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
  actionIconSaved: {
    color: palette.gold[600],
  },
  actionCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionCountLiked: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  profileButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  profileButtonText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
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
    overflow: 'hidden',
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
    fontFamily: 'Poppins_600SemiBold',
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
    borderColor: `${palette.purple[500]}20`,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${palette.purple[500]}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm + 2,
  },
  title: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  artist: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 14,
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
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: palette.info,
  },
  icon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  text: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
});
