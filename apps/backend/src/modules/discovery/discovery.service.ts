import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { SwipeDto, SwipeDirection } from './dto';
import { FeedFilterDto, GenderPreferenceParam } from './dto/feed-filter.dto';

// Turkish labels for compatibility dimension categories
const DIMENSION_LABELS_TR: Record<string, string> = {
  COMMUNICATION: 'Iletisim Tarzi',
  LIFE_GOALS: 'Yasam Hedefleri',
  VALUES: 'Degerler',
  LIFESTYLE: 'Yasam Tarzi',
  EMOTIONAL_INTELLIGENCE: 'Duygusal Zeka',
  RELATIONSHIP_EXPECTATIONS: 'Iliski Beklentileri',
  SOCIAL_COMPATIBILITY: 'Sosyal Uyum',
  ATTACHMENT_STYLE: 'Baglanma Tarzi',
  LOVE_LANGUAGE: 'Sevgi Dili',
  CONFLICT_STYLE: 'Catisma Yaklasimi',
  FUTURE_VISION: 'Gelecek Vizyonu',
  INTELLECTUAL: 'Entelektuel Uyum',
  INTIMACY: 'Yakinlik',
  GROWTH_MINDSET: 'Gelisim Odaklilik',
  CORE_FEARS: 'Temel Kaygilar',
};

// Threshold for a dimension to be considered "strong"
const STRONG_DIMENSION_THRESHOLD = 70;

// Daily swipe limits per package tier (LOCKED: 4 packages)
const DAILY_SWIPE_LIMITS: Record<string, number> = {
  FREE: 20,
  GOLD: 60,
  PRO: 200,
  RESERVED: 999999, // Unlimited
};

// Daily super like limits per package tier (LOCKED: 4 packages)
const DAILY_SUPER_LIKE_LIMITS: Record<string, number> = {
  FREE: 1,
  GOLD: 5,
  PRO: 999999, // Unlimited
  RESERVED: 999999, // Unlimited
};

// Undo swipe time window in milliseconds (5 seconds)
const UNDO_WINDOW_MS = 5000;

// Fetch more candidates than needed so post-filter (age/distance) still yields enough cards
const FEED_CANDIDATE_BATCH_SIZE = 120;
// Maximum cards returned to the client per request
const FEED_PAGE_SIZE = 30;

// Default filter values
const DEFAULT_MIN_AGE = 18;
const DEFAULT_MAX_AGE = 65;
const DEFAULT_MAX_DISTANCE_KM = 100;

// ─── Smart Feed Scoring Weights ─────────────────────────────────
const SCORE_WEIGHTS = {
  COMPATIBILITY: 0.32,       // Compatibility score contribution
  DISTANCE: 0.18,            // Distance proximity score
  ACTIVITY: 0.14,            // Recent activity score
  PROFILE_COMPLETENESS: 0.09, // Profile completeness bonus
  INTENTION_MATCH: 0.09,     // Intention tag matching bonus
  PHOTO_COUNT: 0.05,         // Photo count factor
  NEW_USER_BOOST: 0.05,      // New user visibility boost
  PREMIUM_PRIORITY: 0.08,   // Premium package priority boost
};

// New user boost: accounts created within this many days get a boost
const NEW_USER_BOOST_DAYS = 7;
// Activity recency: users active within this many hours get highest score
const ACTIVITY_RECENCY_HOURS = 24;
// Maximum photo count for scoring (diminishing returns above this)
const MAX_PHOTO_COUNT_FOR_SCORE = 6;

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
  ) {}

  /**
   * Get the discovery card feed for the current user.
   * Returns profiles sorted by smart scoring algorithm, filtered by preferences.
   * Supports gender, age, distance, and intention tag filters.
   */
  async getFeed(userId: string, filters?: FeedFilterDto) {
    // Block discovery for users with an active relationship
    const activeRelationship = await this.prisma.relationship.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'ACTIVE',
      },
    });

    if (activeRelationship) {
      return {
        cards: [],
        remaining: 0,
        dailyLimit: 0,
        totalCandidates: 0,
        message: 'Aktif bir ilişkiniz var. Keşif modu devre dışı.',
      };
    }

    // Get current user with profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new BadRequestException('Keşif için profil oluşturmanız gerekiyor');
    }

    const today = this.getToday();

    // Parallel: exclusion IDs + daily swipe count (avoids sequential waterfall)
    const [swipedIds, blockedIds, todaySwipeCount] = await Promise.all([
      this.prisma.swipe
        .findMany({
          where: { swiperId: userId },
          select: { targetId: true },
        })
        .then((swipes) => swipes.map((s) => s.targetId)),
      this.prisma.block
        .findMany({
          where: {
            OR: [{ blockerId: userId }, { blockedId: userId }],
          },
          select: { blockerId: true, blockedId: true },
        })
        .then((blocks) =>
          blocks.map((b) =>
            b.blockerId === userId ? b.blockedId : b.blockerId,
          ),
        ),
      this.prisma.dailySwipeCount.findUnique({
        where: { userId_date: { userId, date: today } },
      }),
    ]);

    // Exclude users who are currently in active relationships
    const activeRelationships = await this.prisma.relationship.findMany({
      where: { status: 'ACTIVE' },
      select: { userAId: true, userBId: true },
    });
    const usersInRelationships = new Set<string>();
    for (const rel of activeRelationships) {
      usersInRelationships.add(rel.userAId);
      usersInRelationships.add(rel.userBId);
    }

    const excludeIds = new Set([userId, ...swipedIds, ...blockedIds, ...usersInRelationships]);

    // Build dynamic filter conditions
    const profileWhere = this.buildProfileWhereClause(excludeIds, filters);

    // Fetch larger candidate pool — age/distance filtering is in-memory
    const candidates = await this.prisma.userProfile.findMany({
      where: profileWhere,
      include: {
        user: {
          select: {
            id: true,
            isSelfieVerified: true,
            isFullyVerified: true,
            packageTier: true,
            createdAt: true,
            photos: {
              where: { isApproved: true },
              orderBy: { order: 'asc' },
              take: 6,
            },
          },
        },
      },
      take: FEED_CANDIDATE_BATCH_SIZE,
      orderBy: { lastActiveAt: 'desc' },
    });

    // Apply age + distance filter in a single pass, pre-compute distances
    const minAge = filters?.minAge ?? DEFAULT_MIN_AGE;
    const maxAge = filters?.maxAge ?? DEFAULT_MAX_AGE;
    const maxDistanceKm = filters?.maxDistance ?? DEFAULT_MAX_DISTANCE_KM;

    const userLat = user.profile!.latitude;
    const userLon = user.profile!.longitude;
    const hasUserLocation = userLat !== null && userLon !== null;

    const filteredCandidates: Array<{
      profile: typeof candidates[number];
      age: number;
      distanceKm: number | null;
    }> = [];

    for (const profile of candidates) {
      const age = this.calculateAge(profile.birthDate);
      if (age < minAge || age > maxAge) continue;

      let distanceKm: number | null = null;
      if (hasUserLocation && profile.latitude !== null && profile.longitude !== null) {
        distanceKm = this.calculateDistanceKm(
          userLat!, userLon!, profile.latitude, profile.longitude,
        );
        if (distanceKm > maxDistanceKm) continue;
      }

      filteredCandidates.push({ profile, age, distanceKm });
    }

    // Batch-fetch ALL compatibility scores in ONE query (avoids N+1)
    const compatibilityPairs = filteredCandidates.map((c) =>
      this.orderIds(userId, c.profile.userId),
    );

    const compatScores = compatibilityPairs.length > 0
      ? await this.prisma.compatibilityScore.findMany({
          where: {
            OR: compatibilityPairs.map((pair) => ({
              userAId: pair.first,
              userBId: pair.second,
            })),
          },
          select: {
            userAId: true,
            userBId: true,
            finalScore: true,
            level: true,
            dimensionScores: true,
          },
        })
      : [];

    // Build O(1) lookup map: "userAId_userBId" -> score + dimensions
    const compatMap = new Map<
      string,
      { finalScore: number; level: string; dimensionScores: Record<string, number> | null }
    >();
    for (const score of compatScores) {
      compatMap.set(`${score.userAId}_${score.userBId}`, {
        finalScore: score.finalScore,
        level: score.level,
        dimensionScores: score.dimensionScores as Record<string, number> | null,
      });
    }

    // Build scored cards (fully synchronous — no more await per card)
    const cards = filteredCandidates.map(({ profile, age, distanceKm }) => {
      const { first, second } = this.orderIds(userId, profile.userId);
      const score = compatMap.get(`${first}_${second}`) ?? null;

      const feedScore = this.calculateFeedScore({
        compatibilityScore: score?.finalScore ?? 0,
        lastActiveAt: profile.lastActiveAt,
        isComplete: profile.isComplete,
        bioLength: profile.bio?.length ?? 0,
        userIntentionTag: user.profile!.intentionTag,
        candidateIntentionTag: profile.intentionTag,
        photoCount: profile.user.photos.length,
        accountCreatedAt: profile.user.createdAt,
        isVerified: profile.user.isSelfieVerified,
        distanceKm,
        candidatePackageTier: profile.user.packageTier,
      });

      // Derive strong categories and explanation from dimension scores
      const dimensions = score?.dimensionScores ?? null;
      const strongCategories = this.getStrongCategories(dimensions);
      const compatExplanation = this.buildCompatExplanation(dimensions);

      return {
        userId: profile.userId,
        firstName: profile.firstName,
        age,
        bio: profile.bio,
        city: profile.city,
        gender: profile.gender,
        intentionTag: profile.intentionTag,
        interestTags: profile.interestTags,
        distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
        photos: profile.user.photos.map((p) => ({
          id: p.id,
          url: p.url,
          thumbnailUrl: p.thumbnailUrl,
        })),
        isVerified: profile.user.isSelfieVerified,
        packageTier: profile.user.packageTier,
        compatibility: score
          ? {
              score: score.finalScore,
              level: score.level,
              isSuperCompatible: score.level === 'SUPER',
            }
          : null,
        compatExplanation,
        strongCategories,
        feedScore,
      };
    });

    // Sort by smart feed score (highest first), then verified users first as tiebreaker
    cards.sort((a, b) => {
      if (b.feedScore !== a.feedScore) return b.feedScore - a.feedScore;
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
      return 0;
    });

    // Premium visibility pool: Pro/Reserved users see other premium users boosted
    if (user.packageTier === 'PRO' || user.packageTier === 'RESERVED') {
      cards.sort((a, b) => {
        const aIsPremium = a.packageTier === 'PRO' || a.packageTier === 'RESERVED';
        const bIsPremium = b.packageTier === 'PRO' || b.packageTier === 'RESERVED';
        if (aIsPremium && !bIsPremium) return -1;
        if (!aIsPremium && bIsPremium) return 1;
        // Within same tier group, keep feedScore order
        if (b.feedScore !== a.feedScore) return b.feedScore - a.feedScore;
        if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
        return 0;
      });
    }

    // Page the results — client can call again for more
    const paginatedCards = cards.slice(0, FEED_PAGE_SIZE);

    // Check daily swipe remaining
    const dailyLimit = DAILY_SWIPE_LIMITS[user.packageTier] ?? DAILY_SWIPE_LIMITS.FREE;
    const remaining = dailyLimit - (todaySwipeCount?.count ?? 0);

    return {
      cards: paginatedCards,
      remaining: Math.max(0, remaining),
      dailyLimit,
      totalCandidates: cards.length,
    };
  }

  /**
   * Process a swipe action (like, pass, or super_like).
   * If mutual like, creates a match with the appropriate animation.
   * Super likes send a special notification to the recipient.
   */
  async swipe(userId: string, dto: SwipeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    if (!user) {
      throw new BadRequestException('Kullanıcı bulunamadı');
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
      select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException('Hedef kullanıcı bulunamadı');
    }

    // Check if either user has blocked the other (edge case: block after feed load)
    const blockExists = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: dto.targetUserId },
          { blockerId: dto.targetUserId, blockedId: userId },
        ],
      },
    });

    if (blockExists) {
      throw new BadRequestException('Bu kullanıcıyla etkileşim kurulamaz');
    }

    // Check if already swiped
    const existingSwipe = await this.prisma.swipe.findUnique({
      where: {
        swiperId_targetId: { swiperId: userId, targetId: dto.targetUserId },
      },
    });

    if (existingSwipe) {
      throw new BadRequestException('Bu kullanıcıya zaten karar verdiniz');
    }

    // Check daily swipe limit
    const dailyLimit = DAILY_SWIPE_LIMITS[user.packageTier] ?? DAILY_SWIPE_LIMITS.FREE;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyCount = await this.prisma.dailySwipeCount.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, count: 0 },
      update: {},
    });

    if (dailyCount.count >= dailyLimit) {
      throw new ForbiddenException(
        `Günlük beğeni limitinize ulaştınız (${dailyLimit}). Daha fazla beğeni için paketinizi yükseltin.`,
      );
    }

    // Check super like daily limit if applicable
    if (dto.direction === SwipeDirection.SUPER_LIKE) {
      const superLikeLimit = DAILY_SUPER_LIKE_LIMITS[user.packageTier] ?? DAILY_SUPER_LIKE_LIMITS.FREE;
      const todaySuperLikes = await this.prisma.swipe.count({
        where: {
          swiperId: userId,
          action: 'SUPER_LIKE',
          createdAt: { gte: today },
        },
      });

      if (todaySuperLikes >= superLikeLimit) {
        throw new ForbiddenException(
          `Günlük Süper Beğeni limitinize ulaştınız (${superLikeLimit}). Daha fazla Süper Beğeni için paketinizi yükseltin.`,
        );
      }
    }

    // Map DTO direction to Prisma enum
    const action = dto.direction === SwipeDirection.PASS
      ? 'PASS'
      : dto.direction === SwipeDirection.SUPER_LIKE
        ? 'SUPER_LIKE'
        : 'LIKE';

    // Record the swipe and increment daily count in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create swipe record
      const swipeRecord = await tx.swipe.create({
        data: {
          swiperId: userId,
          targetId: dto.targetUserId,
          action,
        },
      });

      // Increment daily swipe count
      await tx.dailySwipeCount.upsert({
        where: { userId_date: { userId, date: today } },
        create: { userId, date: today, count: 1 },
        update: { count: { increment: 1 } },
      });

      // If PASS, no match check needed
      if (action === 'PASS') {
        return { isMatch: false, matchId: null, animationType: null, swipeId: swipeRecord.id };
      }

      // Send special notification for super likes
      if (action === 'SUPER_LIKE') {
        await tx.notification.create({
          data: {
            userId: dto.targetUserId,
            type: 'SUPER_LIKE',
            title: 'Süper Beğeni!',
            body: 'Birisi sizi Süper Beğendi! Hemen görmek ister misiniz?',
            data: { swiperId: userId },
          },
        });
      }

      // Check for mutual like (both LIKE and SUPER_LIKE count)
      const reciprocalSwipe = await tx.swipe.findUnique({
        where: {
          swiperId_targetId: {
            swiperId: dto.targetUserId,
            targetId: userId,
          },
        },
      });

      if (!reciprocalSwipe || reciprocalSwipe.action === 'PASS') {
        return { isMatch: false, matchId: null, animationType: null, swipeId: swipeRecord.id };
      }

      // MUTUAL LIKE — Create match!
      // Get compatibility score for animation type
      const { first, second } = this.orderIds(userId, dto.targetUserId);
      const [compatScore, swiperProfile, targetProfile] = await Promise.all([
        tx.compatibilityScore.findUnique({
          where: { userAId_userBId: { userAId: first, userBId: second } },
        }),
        tx.userProfile.findUnique({
          where: { userId },
          select: { firstName: true },
        }),
        tx.userProfile.findUnique({
          where: { userId: dto.targetUserId },
          select: { firstName: true },
        }),
      ]);

      const finalScore = compatScore?.finalScore ?? 0;
      const compatLevel = compatScore?.level ?? 'NORMAL';

      // LOCKED: 2 animation types
      const animationType = compatLevel === 'SUPER'
        ? 'SUPER_COMPATIBILITY'
        : 'NORMAL';

      const match = await tx.match.create({
        data: {
          userAId: first,
          userBId: second,
          compatibilityScore: finalScore,
          compatibilityLevel: compatLevel as 'NORMAL' | 'SUPER',
          animationType: animationType as 'NORMAL' | 'SUPER_COMPATIBILITY',
        },
      });

      // Create personalized notifications for both users
      const swiperName = swiperProfile?.firstName ?? 'Biri';
      const targetName = targetProfile?.firstName ?? 'Biri';
      const scoreText = finalScore > 0 ? ` (%${Math.round(finalScore)} uyum)` : '';

      await tx.notification.createMany({
        data: [
          {
            userId,
            type: 'NEW_MATCH',
            title: compatLevel === 'SUPER'
              ? 'Super Uyumlu Eslesme!'
              : 'Yeni Eslesme!',
            body: compatLevel === 'SUPER'
              ? `${targetName} ile super uyumlu bir eslesmeniz var!${scoreText}`
              : `${targetName} ile eslestiniz!${scoreText}`,
            data: { matchId: match.id, animationType },
          },
          {
            userId: dto.targetUserId,
            type: 'NEW_MATCH',
            title: compatLevel === 'SUPER'
              ? 'Super Uyumlu Eslesme!'
              : 'Yeni Eslesme!',
            body: compatLevel === 'SUPER'
              ? `${swiperName} ile super uyumlu bir eslesmeniz var!${scoreText}`
              : `${swiperName} ile eslestiniz!${scoreText}`,
            data: { matchId: match.id, animationType },
          },
        ],
      });

      return {
        isMatch: true,
        matchId: match.id,
        animationType,
        swipeId: swipeRecord.id,
      };
    });

    // Award badge checks after swipe (non-blocking)
    this.badgesService.checkAndAwardBadges(userId, 'swipe').catch((err) => this.logger.warn('Badge check failed', err.message));

    // If match was created, check match-related badges for both users
    if (result.isMatch) {
      this.badgesService.checkAndAwardBadges(userId, 'match').catch((err) => this.logger.warn('Badge check failed', err.message));
      this.badgesService.checkAndAwardBadges(dto.targetUserId, 'match').catch((err) => this.logger.warn('Badge check failed', err.message));
    }

    return {
      direction: dto.direction,
      ...result,
    };
  }

  /**
   * Undo the last swipe within the allowed time window (5 seconds).
   * Deletes the swipe record and decrements the daily swipe count.
   */
  async undoSwipe(userId: string) {
    // Find the most recent swipe by this user
    const lastSwipe = await this.prisma.swipe.findFirst({
      where: { swiperId: userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastSwipe) {
      throw new BadRequestException('Geri alınacak bir işlem bulunamadı');
    }

    // Check if the swipe is within the undo time window
    const swipeAge = Date.now() - lastSwipe.createdAt.getTime();
    if (swipeAge > UNDO_WINDOW_MS) {
      throw new BadRequestException(
        'Geri alma süresi doldu. Sadece son 5 saniye içindeki işlemler geri alınabilir.',
      );
    }

    // Perform undo in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete the swipe record
      await tx.swipe.delete({
        where: { id: lastSwipe.id },
      });

      // Decrement daily swipe count
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyCount = await tx.dailySwipeCount.findUnique({
        where: { userId_date: { userId, date: today } },
      });

      if (dailyCount && dailyCount.count > 0) {
        await tx.dailySwipeCount.update({
          where: { userId_date: { userId, date: today } },
          data: { count: { decrement: 1 } },
        });
      }
    });

    return {
      undone: true,
      targetUserId: lastSwipe.targetId,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Smart Feed Scoring Algorithm.
   * Calculates a composite score (0-100) for ranking candidates in the feed.
   * Considers: compatibility, distance, activity, profile completeness,
   * intention matching, photo count, and new user boost.
   */
  private calculateFeedScore(params: {
    compatibilityScore: number;
    lastActiveAt: Date | null;
    isComplete: boolean;
    bioLength: number;
    userIntentionTag: string | null;
    candidateIntentionTag: string | null;
    photoCount: number;
    accountCreatedAt: Date;
    isVerified: boolean;
    distanceKm: number | null;
    candidatePackageTier: string;
  }): number {
    // 1. Compatibility score (0-100, direct mapping)
    const compatibilityComponent = params.compatibilityScore;

    // 2. Distance proximity score (0-100, closer = higher)
    // Uses Haversine distance when both users have geolocation.
    // If no distance data available, give a neutral score.
    let distanceComponent = 50; // Default neutral score when location unavailable
    if (params.distanceKm !== null) {
      // Exponential decay: 100 at 0km, ~50 at 25km, ~10 at 100km
      distanceComponent = Math.max(0, 100 * Math.exp(-params.distanceKm / 35));
    }

    // 3. Activity recency score (0-100, recently active = higher)
    let activityComponent = 0;
    if (params.lastActiveAt) {
      const hoursSinceActive = (Date.now() - params.lastActiveAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceActive <= 1) {
        activityComponent = 100; // Online now or very recently
      } else if (hoursSinceActive <= ACTIVITY_RECENCY_HOURS) {
        // Linear decay from 100 to 40 over 24 hours
        activityComponent = 100 - (hoursSinceActive / ACTIVITY_RECENCY_HOURS) * 60;
      } else if (hoursSinceActive <= 72) {
        // Slower decay for 1-3 days
        activityComponent = 40 - ((hoursSinceActive - ACTIVITY_RECENCY_HOURS) / 48) * 30;
      } else {
        activityComponent = Math.max(0, 10 - (hoursSinceActive / 168) * 10); // Week+ = near zero
      }
    }

    // 4. Profile completeness bonus (0-100)
    let completenessComponent = 0;
    if (params.isComplete) completenessComponent += 40;
    if (params.bioLength > 0) completenessComponent += 20;
    if (params.bioLength > 50) completenessComponent += 15;
    if (params.bioLength > 150) completenessComponent += 10;
    if (params.isVerified) completenessComponent += 15;

    // 5. Intention tag matching bonus (0 or 100)
    let intentionComponent = 0;
    if (
      params.userIntentionTag &&
      params.candidateIntentionTag &&
      params.userIntentionTag === params.candidateIntentionTag
    ) {
      intentionComponent = 100;
    } else if (params.candidateIntentionTag) {
      // Partial credit for having an intention tag set
      intentionComponent = 30;
    }

    // 6. Photo count factor (0-100)
    const photoComponent = Math.min(
      100,
      (params.photoCount / MAX_PHOTO_COUNT_FOR_SCORE) * 100,
    );

    // 7. New user boost (0-100)
    let newUserComponent = 0;
    const accountAgeDays = (Date.now() - params.accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays <= NEW_USER_BOOST_DAYS) {
      // Full boost on day 1, linearly decaying to 0 by day 7
      newUserComponent = 100 * (1 - accountAgeDays / NEW_USER_BOOST_DAYS);
    }

    // 8. Premium priority boost (Pro/Reserved get higher feed placement)
    let premiumPriorityComponent = 0;
    if (params.candidatePackageTier === 'PRO') {
      premiumPriorityComponent = 60;
    } else if (params.candidatePackageTier === 'RESERVED') {
      premiumPriorityComponent = 100;
    } else if (params.candidatePackageTier === 'GOLD') {
      premiumPriorityComponent = 20;
    }

    // Compute weighted composite score
    const totalScore =
      compatibilityComponent * SCORE_WEIGHTS.COMPATIBILITY +
      distanceComponent * SCORE_WEIGHTS.DISTANCE +
      activityComponent * SCORE_WEIGHTS.ACTIVITY +
      completenessComponent * SCORE_WEIGHTS.PROFILE_COMPLETENESS +
      intentionComponent * SCORE_WEIGHTS.INTENTION_MATCH +
      photoComponent * SCORE_WEIGHTS.PHOTO_COUNT +
      newUserComponent * SCORE_WEIGHTS.NEW_USER_BOOST +
      premiumPriorityComponent * SCORE_WEIGHTS.PREMIUM_PRIORITY;

    return Math.round(totalScore * 100) / 100;
  }

  /**
   * Build Prisma where clause for profile filtering based on discovery filters.
   */
  private buildProfileWhereClause(
    excludeIds: Set<string>,
    filters?: FeedFilterDto,
  ) {
    const baseWhere: Record<string, unknown> = {
      userId: { notIn: [...excludeIds] },
      isComplete: true,
      user: {
        isActive: true,
        deletedAt: null,
        isSmsVerified: true,
      },
    };

    // Gender preference filter
    if (filters?.genderPreference && filters.genderPreference !== GenderPreferenceParam.ALL) {
      baseWhere.gender = filters.genderPreference.toUpperCase();
    }

    // Intention tag filter
    if (filters?.intentionTags && filters.intentionTags.length > 0) {
      baseWhere.intentionTag = { in: filters.intentionTags };
    }

    // Note: Distance filtering is applied in-memory using Haversine formula.
    // In production at scale, use Elasticsearch/PostGIS for geo-queries.
    // Age filtering is also applied in-memory after the query (birthDate calculation).

    return baseWhere;
  }

  /**
   * Haversine formula: calculates the great-circle distance between
   * two points on Earth given their latitude and longitude in degrees.
   * Returns distance in kilometers.
   */
  private calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private orderIds(a: string, b: string): { first: string; second: string } {
    return a < b ? { first: a, second: b } : { first: b, second: a };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private getToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /**
   * Extract top 3 dimension names where score >= STRONG_DIMENSION_THRESHOLD.
   * Returns Turkish labels for display on feed cards.
   */
  private getStrongCategories(
    dimensionScores: Record<string, number> | null,
  ): string[] {
    if (!dimensionScores) return [];

    return Object.entries(dimensionScores)
      .filter(([, score]) => score >= STRONG_DIMENSION_THRESHOLD)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => DIMENSION_LABELS_TR[category] ?? category);
  }

  /**
   * Build a 1-line Turkish explanation from the top scoring dimension.
   * Returns null if no dimension data is available.
   */
  private buildCompatExplanation(
    dimensionScores: Record<string, number> | null,
  ): string | null {
    if (!dimensionScores) return null;

    const entries = Object.entries(dimensionScores);
    if (entries.length === 0) return null;

    // Find highest scoring dimension
    const [topCategory, topScore] = entries.reduce(
      (best, current) => (current[1] > best[1] ? current : best),
      entries[0],
    );

    const label = DIMENSION_LABELS_TR[topCategory] ?? topCategory;

    if (topScore >= 90) {
      return `${label} alaninda mukemmel uyum (%${Math.round(topScore)})`;
    }
    if (topScore >= 70) {
      return `${label} alaninda guclu uyum (%${Math.round(topScore)})`;
    }
    return `${label} alaninda uyum (%${Math.round(topScore)})`;
  }
}
