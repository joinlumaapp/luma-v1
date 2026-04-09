import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotImplementedException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BadgesService } from "../badges/badges.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SearchService } from "../search/search.service";
import { LumaCacheService, CACHE_KEYS } from "../cache/cache.service";
import { TTL_DISCOVERY_FEED } from "../cache/cache-keys";
import { SwipeDto, SwipeDirection } from "./dto";
import { FeedFilterDto, GenderPreferenceParam } from "./dto/feed-filter.dto";
import { calculateAge } from "../../common/utils/date.utils";

// Turkish labels for compatibility dimension categories
const DIMENSION_LABELS_TR: Record<string, string> = {
  COMMUNICATION: "İletişim Tarzı",
  LIFE_GOALS: "Yaşam Hedefleri",
  VALUES: "Değerler",
  LIFESTYLE: "Yaşam Tarzı",
  EMOTIONAL_INTELLIGENCE: "Duygusal Zekâ",
  RELATIONSHIP_EXPECTATIONS: "İlişki Beklentileri",
  SOCIAL_COMPATIBILITY: "Sosyal Uyum",
  ATTACHMENT_STYLE: "Bağlanma Tarzı",
  LOVE_LANGUAGE: "Sevgi Dili",
  CONFLICT_STYLE: "Çatışma Yaklaşımı",
  FUTURE_VISION: "Gelecek Vizyonu",
  INTELLECTUAL: "Entelektüel Uyum",
  INTIMACY: "Yakınlık",
  GROWTH_MINDSET: "Gelişim Odaklılık",
  CORE_FEARS: "Temel Kaygılar",
};

// Threshold for a dimension to be considered "strong"
const STRONG_DIMENSION_THRESHOLD = 70;

// Daily swipe limits per package tier (LOCKED: 3 packages)
// All tiers have unlimited swipes — consistent with payments.service.ts
// and MembershipPlansScreen which shows "Sinirsiz" for all tiers.
const DAILY_SWIPE_LIMITS: Record<string, number> = {
  FREE: 999999, // Unlimited
  PREMIUM: 999999, // Unlimited
  SUPREME: 999999, // Unlimited
};

// Daily super like limits per package tier (LOCKED: 3 packages)
const DAILY_SUPER_LIKE_LIMITS: Record<string, number> = {
  FREE: 1,
  PREMIUM: 10,
  SUPREME: 999999, // Unlimited
};

// Daily feed view limits per package tier (LOCKED: 3 packages)
const DAILY_FEED_VIEW_LIMITS: Record<string, number> = {
  FREE: 20,
  PREMIUM: 50,
  SUPREME: 999999, // Unlimited
};

// Undo swipe time window in milliseconds (5 seconds)
const UNDO_WINDOW_MS = 5000;

// Fetch more candidates than needed so post-filter (age/distance) still yields enough cards
const FEED_CANDIDATE_BATCH_SIZE = 120;
// Maximum cards returned to the client per page (cursor-based pagination)
const FEED_PAGE_SIZE = 20;

// Default filter values
const DEFAULT_MIN_AGE = 18;
const DEFAULT_MAX_AGE = 65;
const DEFAULT_MAX_DISTANCE_KM = 100;

// Anti-pattern: don't show same profile twice in 24 hours even after refresh
const ANTI_REPEAT_WINDOW_HOURS = 24;

// Boost configuration: boosted users get 3x visibility for 30 minutes
const _BOOST_DURATION_MINUTES = 30;
const BOOST_SCORE_MULTIPLIER = 3;

// Package tier priority boost: paid users appear higher in the feed.
// Additive bonus points applied on top of the weighted feed score (0-100 scale).
const PACKAGE_TIER_PRIORITY_BOOST: Record<string, number> = {
  FREE: 0,
  PREMIUM: 5,
  SUPREME: 15,
};

// ─── Smart Feed Scoring Weights (per spec) ─────────────────────
// Distance proximity contributes 15% — closer users rank higher.
// Other weights reduced proportionally to accommodate distance.
const SCORE_WEIGHTS = {
  COMPATIBILITY: 0.35, // Compatibility score contribution
  DISTANCE: 0.15, // Geographic proximity bonus (closer = higher)
  PROFILE_COMPLETENESS: 0.12, // Profile completeness bonus
  ACTIVITY: 0.13, // Recent activity score
  PHOTO_COUNT: 0.08, // Photo count factor
  MUTUAL_INTERESTS: 0.1, // Mutual interest tag overlap
  VERIFICATION: 0.07, // Verified selfie users boosted
};

// Maximum distance in km used as reference for distance scoring (50 km)
const DISTANCE_SCORING_MAX_KM = 50;

// New user boost: accounts created within this many days get a boost (aggressive, Tinder-level)
const NEW_USER_BOOST_DAYS = 3;
// Activity recency: users active within this many hours get highest score
const ACTIVITY_RECENCY_HOURS = 24;
// Maximum photo count for scoring (diminishing returns above this)
const MAX_PHOTO_COUNT_FOR_SCORE = 6;

// ES relevance score weight (10% of total feed score)
const ES_RELEVANCE_WEIGHT = 0.1;

// Cache TTLs (seconds) — discovery-specific durations
// TTL_DISCOVERY_FEED imported from cache-keys.ts (single source of truth: 300s / 5 min)
const PROFILE_VIEW_TTL = 600; // 10 minutes
const DAILY_PICKS_TTL = 3600; // 1 hour

/** Shape of a scored feed card for internal sorting */
interface ScoredFeedCard {
  userId: string;
  firstName: string;
  age: number;
  bio: string | null;
  city: string | null;
  gender: string;
  intentionTag: string;
  interestTags: string[];
  distanceKm: number | null;
  photos: Array<{ id: string; url: string; thumbnailUrl: string | null }>;
  isVerified: boolean;
  packageTier: string;
  compatibility: {
    score: number;
    level: string;
    isSuperCompatible: boolean;
  } | null;
  compatExplanation: string | null;
  strongCategories: string[];
  feedScore: number;
  isBoosted: boolean;
  isSuperLiker: boolean;
  currentMood: string | null;
  moodSetAt: string | null;
}

/** Paginated feed response */
export interface PaginatedFeed {
  cards: ScoredFeedCard[];
  remaining: number;
  dailyLimit: number;
  totalCandidates: number;
  cursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
    private readonly notificationsService: NotificationsService,
    private readonly searchService: SearchService,
    private readonly cache: LumaCacheService,
  ) {}

  // ─── Public: Discovery Feed ─────────────────────────────────────

  /**
   * Get the discovery card feed for the current user.
   * Returns profiles sorted by smart scoring algorithm, filtered by preferences.
   * Supports cursor-based pagination (20 profiles per page).
   *
   * Priorities (in order):
   *  1. Super-like queue — users who super-liked the current user appear first
   *  2. Boosted users — active boost gets 3x score multiplier (30 min window)
   *  3. Smart feed score — weighted composite of compatibility, completeness,
   *     activity, photos, mutual interests, and verification
   *
   * Anti-patterns:
   *  - Never show same profile twice in 24 hours (even after refresh)
   *  - Exclude already swiped, blocked, and users in active relationships
   */
  async getDiscoveryFeed(
    userId: string,
    filters?: FeedFilterDto,
    cursor?: string,
  ): Promise<PaginatedFeed> {
    // Check cache first (skip if cursor pagination — only cache first page)
    if (!cursor) {
      const cacheKey = CACHE_KEYS.discoveryFeed(userId);
      const cached = await this.cache.get<PaginatedFeed>(cacheKey);
      if (cached) return cached;
    }

    // Get current user with profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new BadRequestException(
        "Kesfet icin profil olusturmaniz gerekiyor",
      );
    }

    const today = this.getToday();
    const antiRepeatCutoff = new Date(
      Date.now() - ANTI_REPEAT_WINDOW_HOURS * 60 * 60 * 1000,
    );

    // Parallel: exclusion IDs + daily swipe count + super likers + recent feed views
    const [
      swipedIds,
      blockedIds,
      reportedIds,
      todaySwipeCount,
      superLikers,
      recentFeedViews,
    ] = await Promise.all([
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
      // Exclude users reported by the current user
      this.prisma.report
        .findMany({
          where: { reporterId: userId },
          select: { reportedId: true },
        })
        .then((reports) => reports.map((r) => r.reportedId)),
      this.prisma.dailySwipeCount.findUnique({
        where: { userId_date: { userId, date: today } },
      }),
      // Users who super-liked the current user (and current user has not swiped them yet)
      this.prisma.swipe.findMany({
        where: {
          targetId: userId,
          action: "SUPER_LIKE",
          createdAt: { gte: antiRepeatCutoff },
        },
        select: { swiperId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      // Recent feed views for anti-repeat (profiles shown in last 24h)
      this.getRecentFeedViews(userId, antiRepeatCutoff),
    ]);

    // Build anti-repeat set (profiles shown in last 24h)
    const recentlyShownIds = new Set(
      recentFeedViews.map((v: { viewedUserId: string }) => v.viewedUserId),
    );

    // Super likers who haven't been swiped yet
    const superLikerIds = new Set(
      superLikers
        .map((s: { swiperId: string }) => s.swiperId)
        .filter((id: string) => !swipedIds.includes(id)),
    );

    const excludeIds = new Set([
      userId,
      ...swipedIds,
      ...blockedIds,
      ...reportedIds,
    ]);

    // Apply cursor-based pagination: if cursor provided, exclude IDs before cursor
    const cursorExcludeIds = cursor
      ? this.decodeCursor(cursor)
      : new Set<string>();

    const allExcludeIds = new Set([...excludeIds, ...cursorExcludeIds]);

    // For anti-repeat: also exclude recently shown (but not super-likers)
    for (const shownId of recentlyShownIds) {
      if (!superLikerIds.has(shownId)) {
        allExcludeIds.add(shownId);
      }
    }

    // Prefer real-time coordinates from the request over stored profile location.
    // This ensures fresh GPS data is used when the mobile client sends it.
    const userLat = filters?.latitude ?? user.profile.latitude;
    const userLon = filters?.longitude ?? user.profile.longitude;
    const hasUserLocation =
      userLat !== null &&
      userLat !== undefined &&
      userLon !== null &&
      userLon !== undefined;

    const minAge = filters?.minAge ?? DEFAULT_MIN_AGE;
    const maxAge = filters?.maxAge ?? DEFAULT_MAX_AGE;
    const maxDistanceKm = filters?.maxDistance ?? DEFAULT_MAX_DISTANCE_KM;

    // ── Stage 1: Try Elasticsearch for candidate pre-filtering ──
    // ES handles geo_distance + age + gender + intention filters efficiently.
    // Falls back to Prisma if ES is unavailable.
    let esRelevanceMap = new Map<string, number>();
    let esCandidateIds: string[] | null = null;

    if (this.searchService.isElasticsearchConnected()) {
      try {
        const esResult = await this.searchService.searchUsers({
          excludeUserIds: [...allExcludeIds],
          location:
            hasUserLocation
              ? { lat: userLat!, lon: userLon! }
              : undefined,
          maxDistanceKm: hasUserLocation ? maxDistanceKm : undefined,
          minAge,
          maxAge,
          gender:
            filters?.genderPreference &&
            filters.genderPreference !== GenderPreferenceParam.ALL
              ? filters.genderPreference.toUpperCase()
              : undefined,
          intentionTag:
            filters?.intentionTags && filters.intentionTags.length === 1
              ? filters.intentionTags[0]
              : undefined,
          limit: FEED_CANDIDATE_BATCH_SIZE,
        });

        if (esResult.hits.length > 0) {
          esCandidateIds = esResult.hits.map((h) => h.userId);
          // Store ES relevance scores (normalized 0-100) for feed scoring
          const maxEsScore = esResult.hits.length;
          esResult.hits.forEach((hit, index) => {
            // Higher-ranked ES results get higher relevance score
            const relevance = ((maxEsScore - index) / maxEsScore) * 100;
            esRelevanceMap.set(hit.userId, relevance);
          });
          this.logger.debug(
            `ES returned ${esResult.hits.length} candidates for user ${userId}`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`ES search failed, falling back to Prisma: ${message}`);
      }
    }

    // ── Stage 2: Fetch detailed profiles from Prisma ──
    // If ES provided candidate IDs, only fetch those; otherwise do full Prisma query.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let candidates: any[];

    if (esCandidateIds && esCandidateIds.length > 0) {
      // ES pre-filtered: fetch only the ES candidates from Prisma for full profile data
      candidates = await this.prisma.userProfile.findMany({
        where: {
          userId: { in: esCandidateIds },
          isComplete: true,
          isIncognito: false,
          user: {
            isActive: true,
            deletedAt: null,
            isSmsVerified: true,
          },
        },
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
                orderBy: { order: "asc" },
                take: 6,
              },
            },
          },
        },
        take: FEED_CANDIDATE_BATCH_SIZE,
      });
    } else {
      // Prisma-only fallback: use existing filter logic
      const profileWhere = this.buildProfileWhereClause(allExcludeIds, filters);
      candidates = await this.prisma.userProfile.findMany({
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
                orderBy: { order: "asc" },
                take: 6,
              },
            },
          },
        },
        take: FEED_CANDIDATE_BATCH_SIZE,
        orderBy: { lastActiveAt: "desc" },
      });
    }

    // Apply age + distance filter in a single pass, pre-compute distances
    const filteredCandidates: Array<{
      profile: (typeof candidates)[number];
      age: number;
      distanceKm: number | null;
    }> = [];

    for (const profile of candidates) {
      const age = calculateAge(profile.birthDate);
      if (age < minAge || age > maxAge) continue;

      let distanceKm: number | null = null;
      if (
        hasUserLocation &&
        profile.latitude !== null &&
        profile.longitude !== null
      ) {
        distanceKm = this.calculateDistanceKm(
          userLat!,
          userLon!,
          profile.latitude,
          profile.longitude,
        );
        if (distanceKm > maxDistanceKm) continue;
      }

      filteredCandidates.push({ profile, age, distanceKm });
    }

    // Batch-fetch ALL compatibility scores in ONE query (avoids N+1)
    const compatibilityPairs = filteredCandidates.map((c) =>
      this.orderIds(userId, c.profile.userId),
    );

    // Batch-fetch active boosts for candidate users
    const candidateUserIds = filteredCandidates.map((c) => c.profile.userId);

    const [compatScores, activeBoosts] = await Promise.all([
      compatibilityPairs.length > 0
        ? this.prisma.compatibilityScore.findMany({
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
        : [],
      candidateUserIds.length > 0
        ? this.prisma.profileBoost.findMany({
            where: {
              userId: { in: candidateUserIds },
              isActive: true,
              endsAt: { gt: new Date() },
            },
            select: { userId: true, endsAt: true },
          })
        : [],
    ]);

    // Build O(1) lookup maps
    const compatMap = new Map<
      string,
      {
        finalScore: number;
        level: string;
        dimensionScores: Record<string, number> | null;
      }
    >();
    for (const score of compatScores) {
      compatMap.set(`${score.userAId}_${score.userBId}`, {
        finalScore: score.finalScore,
        level: score.level,
        dimensionScores: score.dimensionScores as Record<string, number> | null,
      });
    }

    const boostedUserIds = new Set(activeBoosts.map((b) => b.userId));

    // User's interest tags for mutual overlap scoring
    const userInterestTags = new Set(user.profile.interestTags ?? []);

    // Build scored cards
    const cards: ScoredFeedCard[] = filteredCandidates.map(
      ({ profile, age, distanceKm }) => {
        const { first, second } = this.orderIds(userId, profile.userId);
        const score = compatMap.get(`${first}_${second}`) ?? null;
        const isBoosted = boostedUserIds.has(profile.userId);
        const isSuperLiker = superLikerIds.has(profile.userId);

        // Calculate mutual interest overlap
        const candidateInterestTags = profile.interestTags ?? [];
        const mutualInterestCount = candidateInterestTags.filter(
          (tag: string) => userInterestTags.has(tag),
        ).length;
        const totalUniqueInterests = new Set([
          ...userInterestTags,
          ...candidateInterestTags,
        ]).size;
        const mutualInterestRatio =
          totalUniqueInterests > 0
            ? mutualInterestCount / totalUniqueInterests
            : 0;

        // Base feed score from internal algorithm
        let feedScore = this.calculateFeedScore({
          compatibilityScore: score?.finalScore ?? 0,
          distanceKm,
          lastActiveAt: profile.lastActiveAt,
          isComplete: profile.isComplete,
          bioLength: profile.bio?.length ?? 0,
          photoCount: profile.user.photos.length,
          accountCreatedAt: profile.user.createdAt,
          isVerified: profile.user.isSelfieVerified,
          mutualInterestRatio,
        });

        // Blend in ES relevance score at 10% weight (if available)
        const esRelevance = esRelevanceMap.get(profile.userId) ?? 0;
        if (esRelevance > 0) {
          feedScore =
            feedScore * (1 - ES_RELEVANCE_WEIGHT) +
            esRelevance * ES_RELEVANCE_WEIGHT;
        }

        // Package tier priority boost: paid users (PREMIUM, SUPREME) get
        // higher visibility in the feed to incentivize premium subscriptions.
        // Applied as additive points before the boost multiplier so boosted
        // paid users benefit from both effects.
        const tierBoost =
          PACKAGE_TIER_PRIORITY_BOOST[profile.user.packageTier] ??
          PACKAGE_TIER_PRIORITY_BOOST.FREE;
        feedScore += tierBoost;

        // Apply boost multiplier (3x visibility for 30 minutes)
        if (isBoosted) {
          feedScore = Math.min(100, feedScore * BOOST_SCORE_MULTIPLIER);
        }

        // Derive strong categories and explanation from dimension scores
        const dimensions = score?.dimensionScores ?? null;
        const strongCategories = this.getStrongCategories(dimensions);
        const compatExplanation = this.buildCompatExplanation(dimensions);

        // Check mood expiry (4 hours)
        const MOOD_EXPIRY_MS = 4 * 60 * 60 * 1000;
        const moodSetAt = profile.moodSetAt as Date | null;
        const isMoodActive =
          profile.currentMood &&
          moodSetAt &&
          new Date().getTime() - moodSetAt.getTime() < MOOD_EXPIRY_MS;

        return {
          userId: profile.userId,
          firstName: profile.firstName,
          age,
          bio: profile.bio,
          city: profile.city,
          gender: profile.gender,
          intentionTag: profile.intentionTag,
          interestTags: profile.interestTags ?? [],
          distanceKm:
            distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
          photos: profile.user.photos.map((p: { id: string; url: string; thumbnailUrl: string | null }) => ({
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
                isSuperCompatible: score.level === "SUPER",
              }
            : null,
          compatExplanation,
          strongCategories,
          feedScore,
          isBoosted,
          isSuperLiker,
          currentMood: isMoodActive ? (profile.currentMood as string) : null,
          moodSetAt: isMoodActive && moodSetAt ? moodSetAt.toISOString() : null,
        };
      },
    );

    // Sort: super-likers first, then by smart feed score (highest first)
    cards.sort((a, b) => {
      // Super-likers always appear first
      if (a.isSuperLiker && !b.isSuperLiker) return -1;
      if (!a.isSuperLiker && b.isSuperLiker) return 1;

      // Then by feed score
      if (b.feedScore !== a.feedScore) return b.feedScore - a.feedScore;

      // Tiebreaker: verified users first
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
      return 0;
    });

    // Apply diversity algorithm to avoid monotonous feeds
    const diverseCards = this.applyFeedDiversity(cards);

    // Page the results with cursor-based pagination
    const paginatedCards = diverseCards.slice(0, FEED_PAGE_SIZE);

    // Build cursor for next page (set of all IDs seen so far)
    const seenIds = new Set([
      ...cursorExcludeIds,
      ...paginatedCards.map((c) => c.userId),
    ]);
    const nextCursor =
      paginatedCards.length === FEED_PAGE_SIZE
        ? this.encodeCursor(seenIds)
        : null;

    // Record feed views for anti-repeat pattern (fire-and-forget)
    if (paginatedCards.length > 0) {
      this.recordFeedViews(
        userId,
        paginatedCards.map((c) => c.userId),
      ).catch((err) =>
        this.logger.warn("Feed view recording failed", err.message),
      );
    }

    // Check daily feed view / swipe remaining
    const dailyLimit =
      DAILY_FEED_VIEW_LIMITS[user.packageTier] ?? DAILY_FEED_VIEW_LIMITS.FREE;
    const remaining = dailyLimit - (todaySwipeCount?.count ?? 0);

    const result: PaginatedFeed = {
      cards: paginatedCards,
      remaining: Math.max(0, remaining),
      dailyLimit,
      totalCandidates: diverseCards.length,
      cursor: nextCursor,
      hasMore: nextCursor !== null,
    };

    // Cache the first page result (5 minutes)
    if (!cursor) {
      const cacheKey = CACHE_KEYS.discoveryFeed(userId);
      this.cache
        .set(cacheKey, result, TTL_DISCOVERY_FEED)
        .catch((err) =>
          this.logger.warn("Feed cache write failed", String(err)),
        );
    }

    return result;
  }

  /**
   * Backwards-compatible alias for getDiscoveryFeed.
   * Called by the controller's GET /discovery/feed endpoint.
   */
  async getFeed(
    userId: string,
    filters?: FeedFilterDto,
    cursor?: string,
  ): Promise<PaginatedFeed> {
    return this.getDiscoveryFeed(userId, filters, cursor);
  }

  // ─── Public: Swipe ──────────────────────────────────────────────

  /**
   * Process a swipe action (like, pass, or super_like).
   * If mutual like, creates a match with the appropriate animation.
   * Super likes send a special notification to the recipient.
   */
  async swipe(userId: string, dto: SwipeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true, profile: { select: { firstName: true } } },
    });

    if (!user) {
      throw new BadRequestException("Kullanici bulunamadi");
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
      select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException("Hedef kullanici bulunamadi");
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
      throw new BadRequestException("Bu kullaniciyla etkilesim kurulamaz");
    }

    // Check if already swiped
    const existingSwipe = await this.prisma.swipe.findUnique({
      where: {
        swiperId_targetId: { swiperId: userId, targetId: dto.targetUserId },
      },
    });

    if (existingSwipe) {
      throw new BadRequestException("Bu kullaniciya zaten karar verdiniz");
    }

    // Check daily swipe limit
    const dailyLimit =
      DAILY_SWIPE_LIMITS[user.packageTier] ?? DAILY_SWIPE_LIMITS.FREE;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyCount = await this.prisma.dailySwipeCount.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, count: 0 },
      update: {},
    });

    if (dailyCount.count >= dailyLimit) {
      throw new ForbiddenException(
        `Gunluk begeni limitinize ulastiniz (${dailyLimit}). Daha fazla begeni icin paketinizi yukseltin.`,
      );
    }

    // Check super like daily limit if applicable
    if (dto.direction === SwipeDirection.SUPER_LIKE) {
      const superLikeLimit =
        DAILY_SUPER_LIKE_LIMITS[user.packageTier] ??
        DAILY_SUPER_LIKE_LIMITS.FREE;
      const todaySuperLikes = await this.prisma.swipe.count({
        where: {
          swiperId: userId,
          action: "SUPER_LIKE",
          createdAt: { gte: today },
        },
      });

      if (todaySuperLikes >= superLikeLimit) {
        throw new ForbiddenException(
          `Gunluk Super Begeni limitinize ulastiniz (${superLikeLimit}). Daha fazla Super Begeni icin paketinizi yukseltin.`,
        );
      }
    }

    // Map DTO direction to Prisma enum
    const action =
      dto.direction === SwipeDirection.PASS
        ? "PASS"
        : dto.direction === SwipeDirection.SUPER_LIKE
          ? "SUPER_LIKE"
          : "LIKE";

    // Record the swipe and increment daily count in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create swipe record
      const swipeRecord = await tx.swipe.create({
        data: {
          swiperId: userId,
          targetId: dto.targetUserId,
          action,
          ...(dto.comment && action === "LIKE" ? { comment: dto.comment } : {}),
        },
      });

      // Increment daily swipe count
      await tx.dailySwipeCount.upsert({
        where: { userId_date: { userId, date: today } },
        create: { userId, date: today, count: 1 },
        update: { count: { increment: 1 } },
      });

      // If PASS, no match check needed
      if (action === "PASS") {
        return {
          isMatch: false,
          matchId: null,
          animationType: null,
          swipeId: swipeRecord.id,
        };
      }

      // Send special notification for super likes
      if (action === "SUPER_LIKE") {
        await tx.notification.create({
          data: {
            userId: dto.targetUserId,
            type: "SUPER_LIKE",
            title: "Super Begeni!",
            body: "Birisi sizi Super Begendi! Hemen gormek ister misiniz?",
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

      if (!reciprocalSwipe || reciprocalSwipe.action === "PASS") {
        return {
          isMatch: false,
          matchId: null,
          animationType: null,
          swipeId: swipeRecord.id,
        };
      }

      // MUTUAL LIKE — Create match!
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
      const compatLevel = compatScore?.level ?? "NORMAL";

      // LOCKED: 2 animation types
      const animationType =
        compatLevel === "SUPER" ? "SUPER_COMPATIBILITY" : "NORMAL";

      const match = await tx.match.create({
        data: {
          userAId: first,
          userBId: second,
          compatibilityScore: finalScore,
          compatibilityLevel: compatLevel as "NORMAL" | "SUPER",
          animationType: animationType as "NORMAL" | "SUPER_COMPATIBILITY",
        },
      });

      // Create personalized notifications for both users
      const swiperName = swiperProfile?.firstName ?? "Biri";
      const targetName = targetProfile?.firstName ?? "Biri";
      const scoreText =
        finalScore > 0 ? ` (%${Math.round(finalScore)} uyum)` : "";

      await tx.notification.createMany({
        data: [
          {
            userId,
            type: "NEW_MATCH",
            title:
              compatLevel === "SUPER"
                ? "Super Uyumlu Eslesme!"
                : "Yeni Eslesme!",
            body:
              compatLevel === "SUPER"
                ? `${targetName} ile super uyumlu bir eslesmeniz var!${scoreText}`
                : `${targetName} ile eslestiniz!${scoreText}`,
            data: { matchId: match.id, animationType },
          },
          {
            userId: dto.targetUserId,
            type: "NEW_MATCH",
            title:
              compatLevel === "SUPER"
                ? "Super Uyumlu Eslesme!"
                : "Yeni Eslesme!",
            body:
              compatLevel === "SUPER"
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
        swiperName,
        targetName,
      };
    });

    // Send push notifications + real-time WS events for matches (outside transaction, fire-and-forget)
    if (result.isMatch && result.swiperName && result.targetName) {
      this.notificationsService
        .notifyNewMatch(dto.targetUserId, result.swiperName)
        .catch(() => {});
      this.notificationsService
        .notifyNewMatch(userId, result.targetName)
        .catch(() => {});

    }

    // Send push notification for super likes (outside transaction, fire-and-forget)
    if (action === "SUPER_LIKE") {
      const swiperName = user.profile?.firstName ?? "Biri";
      this.notificationsService
        .notifySuperLike(dto.targetUserId, swiperName)
        .catch(() => {});
    }

    // Invalidate discovery feed cache after swipe (non-blocking)
    this.cache
      .del(CACHE_KEYS.discoveryFeed(userId))
      .catch((err) =>
        this.logger.warn("Feed cache invalidation failed", String(err)),
      );

    // Award badge checks after swipe (non-blocking)
    this.badgesService
      .checkAndAwardBadges(userId, "swipe")
      .catch((err) => this.logger.warn("Badge check failed", err.message));

    // If match was created, check match-related badges for both users
    if (result.isMatch) {
      this.badgesService
        .checkAndAwardBadges(userId, "match")
        .catch((err) => this.logger.warn("Badge check failed", err.message));
      this.badgesService
        .checkAndAwardBadges(dto.targetUserId, "match")
        .catch((err) => this.logger.warn("Badge check failed", err.message));
    }

    return {
      direction: dto.direction,
      ...result,
    };
  }

  /**
   * Record a swipe interaction. Convenience wrapper for external callers
   * who want to record like/pass/superlike without full swipe processing.
   */
  async recordInteraction(
    userId: string,
    targetId: string,
    type: "like" | "pass" | "superlike",
  ): Promise<{ recorded: boolean }> {
    const directionMap: Record<string, SwipeDirection> = {
      like: SwipeDirection.LIKE,
      pass: SwipeDirection.PASS,
      superlike: SwipeDirection.SUPER_LIKE,
    };

    await this.swipe(userId, {
      targetUserId: targetId,
      direction: directionMap[type],
    });

    return { recorded: true };
  }

  /**
   * Undo the last swipe within the allowed time window (5 seconds).
   * Deletes the swipe record and decrements the daily swipe count.
   */
  async undoSwipe(userId: string) {
    // Find the most recent swipe by this user
    const lastSwipe = await this.prisma.swipe.findFirst({
      where: { swiperId: userId },
      orderBy: { createdAt: "desc" },
    });

    if (!lastSwipe) {
      throw new BadRequestException("Geri alinacak bir islem bulunamadi");
    }

    // Check if the swipe is within the undo time window
    const swipeAge = Date.now() - lastSwipe.createdAt.getTime();
    if (swipeAge > UNDO_WINDOW_MS) {
      throw new BadRequestException(
        "Geri alma suresi doldu. Sadece son 5 saniye icindeki islemler geri alinabilir.",
      );
    }

    // Perform undo in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete the swipe record
      await tx.swipe.delete({
        where: { id: lastSwipe.id },
      });

      // If the swipe was a LIKE or SUPER_LIKE, check if a match was created
      // and reverse it (delete match + match notifications)
      if (lastSwipe.action === "LIKE" || lastSwipe.action === "SUPER_LIKE") {
        const { first, second } = this.orderIds(userId, lastSwipe.targetId);
        const existingMatch = await tx.match.findFirst({
          where: {
            userAId: first,
            userBId: second,
          },
        });

        if (existingMatch) {
          // Delete match notifications for both users
          await tx.notification.deleteMany({
            where: {
              type: "NEW_MATCH",
              data: {
                path: ["matchId"],
                equals: existingMatch.id,
              },
            },
          });

          // Delete the match itself
          await tx.match.delete({
            where: { id: existingMatch.id },
          });
        }
      }

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

  // ─── Public: Likes You (Seni Begeneler) ─────────────────────────

  /**
   * Returns users who liked the current user but have not been matched yet.
   * Free users see blurred results; Gold+ see clear profiles.
   */
  async getLikesYou(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    if (!user) throw new BadRequestException("Kullanici bulunamadi");

    const isBlurred = user.packageTier === "FREE";

    // Get swipes where someone liked this user AND no match exists yet
    const incomingLikes = await this.prisma.swipe.findMany({
      where: {
        targetId: userId,
        action: { in: ["LIKE", "SUPER_LIKE"] },
        swiper: {
          isActive: true,
          deletedAt: null,
          blocksReceived: { none: { blockerId: userId } },
          blocksGiven: { none: { blockedId: userId } },
        },
        swiperId: {
          notIn: await this.getSwipedUserIds(userId),
        },
      },
      include: {
        swiper: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                birthDate: true,
              },
            },
            photos: {
              where: { isPrimary: true, isApproved: true },
              select: { url: true, thumbnailUrl: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Batch-fetch compatibility scores
    const likerIds = incomingLikes.map((s) => s.swiperId);
    const compatScores =
      likerIds.length > 0
        ? await this.prisma.compatibilityScore.findMany({
            where: {
              OR: likerIds.map((likerId) => {
                const { first, second } = this.orderIds(userId, likerId);
                return { userAId: first, userBId: second };
              }),
            },
            select: { userAId: true, userBId: true, finalScore: true },
          })
        : [];

    const compatMap = new Map<string, number>();
    for (const s of compatScores) {
      compatMap.set(`${s.userAId}_${s.userBId}`, s.finalScore);
    }

    const likes = incomingLikes.map((swipe) => {
      const photo = swipe.swiper.photos[0];
      const { first, second } = this.orderIds(userId, swipe.swiperId);
      const score = compatMap.get(`${first}_${second}`) ?? 0;

      return {
        userId: swipe.swiperId,
        firstName: swipe.swiper.profile?.firstName ?? "",
        age: swipe.swiper.profile?.birthDate
          ? calculateAge(swipe.swiper.profile.birthDate)
          : 0,
        photoUrl: photo?.thumbnailUrl ?? photo?.url ?? "",
        compatibilityPercent: Math.round(score),
        likedAt: swipe.createdAt.toISOString(),
        comment: swipe.comment ?? null,
      };
    });

    return {
      likes,
      total: likes.length,
      isBlurred,
    };
  }

  // ─── Public: Daily Picks (Gunun Seckileri) ─────────────────────

  /** Number of daily picks per package tier */
  private static readonly DAILY_PICK_COUNTS: Record<string, number> = {
    FREE: 3,
    PREMIUM: 10,
    SUPREME: 999999,
  };

  /**
   * Returns daily curated high-compatibility profiles (top 10).
   * Generates new picks at midnight, returns cached picks during the day.
   * Picks are the highest-compatibility matches refreshed daily.
   */
  async getDailyPicks(userId: string) {
    // Check cache first (1 hour TTL)
    const dailyPicksCacheKey = `daily-picks:${userId}`;
    const cachedPicks = await this.cache.get<{
      picks: unknown[];
      refreshesAt: string;
      totalAvailable: number;
    }>(dailyPicksCacheKey);
    if (cachedPicks) return cachedPicks;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    if (!user) throw new BadRequestException("Kullanici bulunamadi");

    const today = this.getToday();
    const totalAvailable =
      DiscoveryService.DAILY_PICK_COUNTS[user.packageTier] ?? 3;

    // Check if picks already generated for today
    const existingPicks = await this.prisma.dailyPick.findMany({
      where: { userId, date: today },
      orderBy: { createdAt: "asc" },
    });

    let pickUserIds: string[];

    if (existingPicks.length > 0) {
      pickUserIds = existingPicks.map((p) => p.pickedUserId);
    } else {
      // Generate new picks: top 10 highest compatibility matches
      pickUserIds = await this.generateDailyPicks(userId, 10);

      // Store picks
      if (pickUserIds.length > 0) {
        await this.prisma.dailyPick.createMany({
          data: pickUserIds.map((pickedUserId) => ({
            userId,
            pickedUserId,
            date: today,
          })),
        });
      }
    }

    // Fetch profile data for picked users
    const pickedUsers =
      pickUserIds.length > 0
        ? await this.prisma.userProfile.findMany({
            where: { userId: { in: pickUserIds } },
            select: {
              userId: true,
              firstName: true,
              birthDate: true,
              city: true,
              bio: true,
              intentionTag: true,
              interestTags: true,
              user: {
                select: {
                  isSelfieVerified: true,
                  photos: {
                    where: { isPrimary: true, isApproved: true },
                    select: { url: true, thumbnailUrl: true },
                    take: 1,
                  },
                },
              },
            },
          })
        : [];

    // Batch compatibility scores
    const compatScores =
      pickUserIds.length > 0
        ? await this.prisma.compatibilityScore.findMany({
            where: {
              OR: pickUserIds.map((pid) => {
                const { first, second } = this.orderIds(userId, pid);
                return { userAId: first, userBId: second };
              }),
            },
            select: {
              userAId: true,
              userBId: true,
              finalScore: true,
              dimensionScores: true,
            },
          })
        : [];

    const compatMap = new Map<
      string,
      { finalScore: number; dimensionScores: Record<string, number> | null }
    >();
    for (const s of compatScores) {
      compatMap.set(`${s.userAId}_${s.userBId}`, {
        finalScore: s.finalScore,
        dimensionScores: s.dimensionScores as Record<string, number> | null,
      });
    }

    // Map viewed status from existing picks
    const viewedSet = new Set(
      existingPicks.filter((p) => p.isViewed).map((p) => p.pickedUserId),
    );

    const profileMap = new Map(pickedUsers.map((p) => [p.userId, p]));

    const picks = pickUserIds
      .slice(0, totalAvailable)
      .map((pickedUserId) => {
        const profile = profileMap.get(pickedUserId);
        if (!profile) return null;

        const photo = profile.user.photos[0];
        const { first, second } = this.orderIds(userId, pickedUserId);
        const compat = compatMap.get(`${first}_${second}`);
        const explanation = this.buildCompatExplanation(
          compat?.dimensionScores ?? null,
        );

        return {
          userId: pickedUserId,
          firstName: profile.firstName,
          age: calculateAge(profile.birthDate),
          city: profile.city ?? "",
          bio: profile.bio ?? "",
          photoUrl: photo?.thumbnailUrl ?? photo?.url ?? "",
          compatibilityPercent: Math.round(compat?.finalScore ?? 0),
          compatExplanation: explanation,
          intentionTag: profile.intentionTag,
          isVerified: profile.user.isSelfieVerified,
          isViewed: viewedSet.has(pickedUserId),
        };
      })
      .filter(Boolean);

    // Calculate next refresh time (midnight)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyPicksResult = {
      picks,
      refreshesAt: tomorrow.toISOString(),
      totalAvailable,
    };

    // Cache daily picks for 1 hour
    this.cache
      .set(dailyPicksCacheKey, dailyPicksResult, DAILY_PICKS_TTL)
      .catch((err) =>
        this.logger.warn("Daily picks cache write failed", String(err)),
      );

    return dailyPicksResult;
  }

  /** Mark a daily pick as viewed */
  async markDailyPickViewed(userId: string, pickedUserId: string) {
    const today = this.getToday();

    await this.prisma.dailyPick.updateMany({
      where: { userId, pickedUserId, date: today },
      data: { isViewed: true },
    });

    return { success: true };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Smart Feed Scoring Algorithm.
   * Calculates a composite score (0-100) for ranking candidates in the feed.
   *
   * Weights (per spec):
   *  - Compatibility score: 40%
   *  - Profile completeness: 15%
   *  - Activity recency: 15%
   *  - Photo count: 10%
   *  - Mutual interests overlap: 10%
   *  - Verification bonus: 10%
   */
  private calculateFeedScore(params: {
    compatibilityScore: number;
    distanceKm: number | null;
    lastActiveAt: Date | null;
    isComplete: boolean;
    bioLength: number;
    photoCount: number;
    accountCreatedAt: Date;
    isVerified: boolean;
    mutualInterestRatio: number;
  }): number {
    // 1. Compatibility score (0-100, direct mapping) — weight 35%
    const compatibilityComponent = params.compatibilityScore;

    // 1b. Distance proximity (0-100, closer = higher) — weight 15%
    // If no distance data, use neutral score of 50
    let distanceComponent = 50;
    if (params.distanceKm !== null) {
      distanceComponent = Math.max(
        0,
        (1 -
          Math.min(params.distanceKm, DISTANCE_SCORING_MAX_KM) /
            DISTANCE_SCORING_MAX_KM) *
          100,
      );
    }

    // 2. Profile completeness (0-100) — weight 12%
    // NOTE: Verification is scored separately via SCORE_WEIGHTS.VERIFICATION (7%).
    // Do NOT add verification bonus here to avoid double-counting.
    let completenessComponent = 0;
    if (params.isComplete) completenessComponent += 40;
    if (params.bioLength > 0) completenessComponent += 25;
    if (params.bioLength > 50) completenessComponent += 20;
    if (params.bioLength > 150) completenessComponent += 15;

    // 3. Activity recency score (0-100) — weight 15%
    let activityComponent = 0;
    if (params.lastActiveAt) {
      const hoursSinceActive =
        (Date.now() - params.lastActiveAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceActive <= 1) {
        activityComponent = 100; // Online now or very recently
      } else if (hoursSinceActive <= ACTIVITY_RECENCY_HOURS) {
        activityComponent =
          100 - (hoursSinceActive / ACTIVITY_RECENCY_HOURS) * 60;
      } else if (hoursSinceActive <= 72) {
        activityComponent =
          40 - ((hoursSinceActive - ACTIVITY_RECENCY_HOURS) / 48) * 30;
      } else {
        activityComponent = Math.max(0, 10 - (hoursSinceActive / 168) * 10);
      }
    }

    // 4. Photo count factor (0-100) — weight 10%
    const photoComponent = Math.min(
      100,
      (params.photoCount / MAX_PHOTO_COUNT_FOR_SCORE) * 100,
    );

    // 5. Mutual interests overlap (0-100) — weight 10%
    // Jaccard-like ratio scaled to 100
    const mutualInterestComponent = params.mutualInterestRatio * 100;

    // 6. Verification bonus (0 or 100) — weight 10%
    const verificationComponent = params.isVerified ? 100 : 0;

    // New user boost: additive bonus on top (not part of weights)
    let newUserBonus = 0;
    const accountAgeDays =
      (Date.now() - params.accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays <= NEW_USER_BOOST_DAYS) {
      newUserBonus = 15 * (1 - accountAgeDays / NEW_USER_BOOST_DAYS);
    }

    // Compute weighted composite score
    const totalScore =
      compatibilityComponent * SCORE_WEIGHTS.COMPATIBILITY +
      distanceComponent * SCORE_WEIGHTS.DISTANCE +
      completenessComponent * SCORE_WEIGHTS.PROFILE_COMPLETENESS +
      activityComponent * SCORE_WEIGHTS.ACTIVITY +
      photoComponent * SCORE_WEIGHTS.PHOTO_COUNT +
      mutualInterestComponent * SCORE_WEIGHTS.MUTUAL_INTERESTS +
      verificationComponent * SCORE_WEIGHTS.VERIFICATION +
      newUserBonus;

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
      isIncognito: false, // hide incognito users from discovery
      user: {
        isActive: true,
        deletedAt: null,
        isSmsVerified: true,
      },
    };

    // Gender preference filter
    if (
      filters?.genderPreference &&
      filters.genderPreference !== GenderPreferenceParam.ALL
    ) {
      baseWhere.gender = filters.genderPreference.toUpperCase();
    }

    // Intention tag filter
    if (filters?.intentionTags && filters.intentionTags.length > 0) {
      baseWhere.intentionTag = { in: filters.intentionTags };
    }

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

    const [topCategory, topScore] = entries.reduce(
      (best, current) => (current[1] > best[1] ? current : best),
      entries[0],
    );

    const label = DIMENSION_LABELS_TR[topCategory] ?? topCategory;

    if (topScore >= 90) {
      return `${label} alanında mükemmel uyum (%${Math.round(topScore)})`;
    }
    if (topScore >= 70) {
      return `${label} alanında güçlü uyum (%${Math.round(topScore)})`;
    }
    return `${label} alanında uyum (%${Math.round(topScore)})`;
  }

  /** Get IDs of users the current user has already swiped on */
  private async getSwipedUserIds(userId: string): Promise<string[]> {
    const swipes = await this.prisma.swipe.findMany({
      where: { swiperId: userId },
      select: { targetId: true },
    });
    return swipes.map((s) => s.targetId);
  }

  /** Generate top compatibility picks for a user (top 10 highest-compatibility matches) */
  private async generateDailyPicks(
    userId: string,
    count: number,
  ): Promise<string[]> {
    const swipedIds = await this.getSwipedUserIds(userId);
    const excludeIds = new Set([userId, ...swipedIds]);

    // Get top compatibility scores where user hasn't swiped yet
    const topScores = await this.prisma.compatibilityScore.findMany({
      where: {
        OR: [
          { userAId: userId, userBId: { notIn: [...excludeIds] } },
          { userBId: userId, userAId: { notIn: [...excludeIds] } },
        ],
      },
      orderBy: { finalScore: "desc" },
      take: count * 2, // fetch extra to filter inactive
      select: { userAId: true, userBId: true, finalScore: true },
    });

    // Extract partner IDs, verify they are active
    const partnerIds = topScores.map((s) =>
      s.userAId === userId ? s.userBId : s.userAId,
    );

    if (partnerIds.length === 0) return [];

    const activeUsers = await this.prisma.user.findMany({
      where: {
        id: { in: partnerIds },
        isActive: true,
        deletedAt: null,
        profile: { isComplete: true },
      },
      select: { id: true },
    });

    const activeSet = new Set(activeUsers.map((u) => u.id));

    return partnerIds.filter((id) => activeSet.has(id)).slice(0, count);
  }

  /**
   * Get recent feed views for the anti-repeat pattern.
   * Returns profile IDs shown to the user since the cutoff time.
   * Falls back gracefully if the feed_views table does not exist yet.
   */
  private async getRecentFeedViews(
    userId: string,
    since: Date,
  ): Promise<Array<{ viewedUserId: string }>> {
    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ viewed_user_id: string }>
      >`
        SELECT viewed_user_id FROM feed_views
        WHERE user_id = ${userId}::uuid
          AND viewed_at >= ${since}
      `;
      return rows.map((r) => ({ viewedUserId: r.viewed_user_id }));
    } catch {
      // Table may not exist yet — gracefully return empty
      return [];
    }
  }

  /**
   * Record feed views for anti-repeat pattern.
   * Stores which profiles were shown to the user in the last 24h.
   * Uses raw SQL to avoid compile-time dependency on the FeedView model.
   */
  private async recordFeedViews(
    userId: string,
    viewedUserIds: string[],
  ): Promise<void> {
    if (viewedUserIds.length === 0) return;

    try {
      const now = new Date();
      // Use parameterized queries to prevent SQL injection.
      // Insert each view individually using Prisma's safe tagged template literals.
      await Promise.all(
        viewedUserIds.map((vid) =>
          this.prisma.$executeRaw`
            INSERT INTO feed_views (id, user_id, viewed_user_id, viewed_at)
            VALUES (gen_random_uuid(), ${userId}::uuid, ${vid}::uuid, ${now}::timestamptz)
            ON CONFLICT DO NOTHING
          `,
        ),
      );
    } catch {
      // Non-critical: silently fail if feed_views table doesn't exist yet
      this.logger.debug("Feed view recording skipped — table may not exist");
    }
  }

  // ─── Feed Diversity ─────────────────────────────────────────────

  /**
   * Apply diversity constraints to avoid monotonous feeds.
   *
   * Rules (applied greedily):
   *  - Max 2 consecutive profiles from the same city
   *  - Max 2 consecutive profiles from the same age bracket (within +/- 2 years)
   *  - Max 2 consecutive profiles with the same intention tag
   *
   * The algorithm iterates over the score-sorted list and picks the
   * next card that satisfies the diversity constraints. Skipped cards
   * are placed back later to ensure no one is dropped entirely.
   */
  applyFeedDiversity(cards: ScoredFeedCard[]): ScoredFeedCard[] {
    if (cards.length <= 2) return cards;

    const result: ScoredFeedCard[] = [];
    const remaining = [...cards];

    while (remaining.length > 0) {
      let placed = false;

      for (let i = 0; i < remaining.length; i++) {
        const card = remaining[i];
        if (this.passesDiversityCheck(result, card)) {
          result.push(card);
          remaining.splice(i, 1);
          placed = true;
          break;
        }
      }

      // If no card passes diversity check, force the best-scored remaining card
      if (!placed) {
        result.push(remaining.shift()!);
      }
    }

    return result;
  }

  /**
   * Check if adding a card to the end of the result list would
   * violate any diversity constraint (max 2 consecutive same-trait).
   */
  private passesDiversityCheck(
    result: ScoredFeedCard[],
    card: ScoredFeedCard,
  ): boolean {
    if (result.length < 2) return true;

    const prev1 = result[result.length - 1];
    const prev2 = result[result.length - 2];

    // Max 2 consecutive from same city
    if (
      card.city !== null &&
      prev1.city === card.city &&
      prev2.city === card.city
    ) {
      return false;
    }

    // Max 2 consecutive from same age bracket (within +/- 2 years)
    if (
      Math.abs(card.age - prev1.age) <= 2 &&
      Math.abs(card.age - prev2.age) <= 2
    ) {
      return false;
    }

    // Max 2 consecutive with same intention tag
    if (
      card.intentionTag === prev1.intentionTag &&
      card.intentionTag === prev2.intentionTag
    ) {
      return false;
    }

    return true;
  }

  // ─── Cursor Encoding/Decoding ─────────────────────────────────

  /**
   * Encode a set of seen user IDs into a cursor string.
   * Uses base64 encoding of comma-separated IDs for simplicity.
   */
  private encodeCursor(seenIds: Set<string>): string {
    const idsArray = [...seenIds];
    return Buffer.from(idsArray.join(","), "utf-8").toString("base64");
  }

  /**
   * Decode a cursor string back into a set of seen user IDs.
   * Returns empty set if cursor is invalid.
   */
  private decodeCursor(cursor: string): Set<string> {
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf-8");
      const ids = decoded.split(",").filter((id) => id.length > 0);
      return new Set(ids);
    } catch {
      return new Set();
    }
  }

  // ─── Selam Gonder (Send Greeting) ─────────────────────────────

  /** Daily greeting limits per package tier (LOCKED: 3 packages) */
  private static readonly DAILY_GREETING_LIMITS: Record<string, number> = {
    FREE: 3,
    PREMIUM: 10,
    SUPREME: 999999,
  };

  /** Jeton cost per greeting */
  private static readonly GREETING_JETON_COST = 10;

  /**
   * Send a greeting to another user. Costs jeton and respects daily limits.
   *
   * Flow:
   *  1. Validate sender exists and is active
   *  2. Check daily greeting limit based on package tier
   *  3. Prevent duplicate greeting to same user within 24 hours
   *  4. Deduct jeton cost from sender's gold balance
   *  5. Create notification for the recipient
   *  6. Return success result
   */
  async sendGreeting(
    senderId: string,
    recipientId: string,
  ): Promise<{
    success: boolean;
    newGoldBalance: number;
    greetingsSentToday: number;
    dailyLimit: number;
  }> {
    // 1. Validate sender
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: {
        id: true,
        goldBalance: true,
        packageTier: true,
        isActive: true,
        profile: { select: { firstName: true } },
      },
    });

    if (!sender || !sender.isActive) {
      throw new BadRequestException("Kullanici bulunamadi.");
    }

    // 2. Check if sender has enough jeton
    if (sender.goldBalance < DiscoveryService.GREETING_JETON_COST) {
      throw new BadRequestException("Yetersiz jeton bakiyesi.");
    }

    // 3. Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const greetingsSentToday = await this.prisma.notification.count({
      where: {
        userId: recipientId,
        type: "SYSTEM",
        createdAt: { gte: todayStart },
        data: {
          path: ["greetingSenderId"],
          equals: senderId,
        },
      },
    });

    // Count total greetings sent today (to any user)
    const totalGreetingsToday = await this.prisma.notification.count({
      where: {
        type: "SYSTEM",
        createdAt: { gte: todayStart },
        data: {
          path: ["greetingSenderId"],
          equals: senderId,
        },
      },
    });

    const tier = sender.packageTier ?? "FREE";
    const dailyLimit =
      DiscoveryService.DAILY_GREETING_LIMITS[tier] ??
      DiscoveryService.DAILY_GREETING_LIMITS.FREE;

    if (totalGreetingsToday >= dailyLimit) {
      throw new ForbiddenException(
        `Gunluk selam limiti doldu (${dailyLimit}/${dailyLimit}).`,
      );
    }

    // 4. Prevent duplicate greeting to the same user within 24 hours
    if (greetingsSentToday > 0) {
      throw new BadRequestException(
        "Bu kisiye bugun zaten selam gonderdin.",
      );
    }

    // 5. Validate recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, isActive: true },
    });

    if (!recipient || !recipient.isActive) {
      throw new BadRequestException("Hedef kullanici bulunamadi.");
    }

    // 6. Deduct jeton (atomic decrement)
    const updatedSender = await this.prisma.user.update({
      where: { id: senderId },
      data: {
        goldBalance: { decrement: DiscoveryService.GREETING_JETON_COST },
      },
      select: { goldBalance: true },
    });

    // 7. Send notification to recipient
    const senderName = sender.profile?.firstName || "Birisi";
    await this.notificationsService.sendPushNotification(
      recipientId,
      "Selam!",
      `${senderName} sana selam gonderdi!`,
      { greetingSenderId: senderId, senderName },
      "SYSTEM",
    );

    this.logger.log(
      `Selam gonderildi — gonderici: ${senderId}, alici: ${recipientId}, kalan jeton: ${updatedSender.goldBalance}`,
    );

    return {
      success: true,
      newGoldBalance: updatedSender.goldBalance,
      greetingsSentToday: totalGreetingsToday + 1,
      dailyLimit,
    };
  }

  /** Activate priority visibility boost — costs Gold */
  async activatePriorityBoost(userId: string) {
    throw new NotImplementedException(
      "Priority boost will be available in a future update",
    );
  }

  /** Send nearby notification — costs 35 Gold */
  async sendNearbyNotify(userId: string) {
    throw new NotImplementedException(
      "Nearby notify will be available in a future update",
    );
  }
}
