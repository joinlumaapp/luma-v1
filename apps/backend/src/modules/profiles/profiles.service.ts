import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { ContentScannerService } from "../moderation/content-scanner.service";
import { LumaCacheService } from "../cache/cache.service";
import { StorageService } from "../storage/storage.service";
import { UpdateProfileDto, SetIntentionTagDto, ReorderPhotosDto } from "./dto";
import { calculateAge } from "../../common/utils/date.utils";

const MAX_PHOTOS = 6;
const MIN_PHOTOS = 2;
const MAX_PHOTO_SIZE_MB = 10;
const MIN_AGE = 18;
const MAX_AGE = 99;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentScanner: ContentScannerService,
    private readonly cache: LumaCacheService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Get a user's profile. When `isOwner` is true (default, for /profiles/me),
   * all photos are returned including pending moderation. When false (public view),
   * only approved photos are returned.
   */
  async getProfile(userId: string, isOwner = true) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        photos: {
          // Owner sees all their photos (including pending moderation);
          // public viewers only see approved photos.
          ...(isOwner ? {} : { where: { isApproved: true } }),
          orderBy: { order: "asc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    // Calculate profile completion (only approved photos count)
    const approvedPhotos = user.photos.filter((p) => p.isApproved);
    const completion = this.calculateCompletion({
      ...user,
      photos: approvedPhotos,
    });

    return {
      userId: user.id,
      profile: user.profile,
      photos: user.photos.map((p) => ({
        ...p,
        // Indicate moderation status to the owner
        ...(isOwner && !p.isApproved
          ? { moderationStatus: "pending" as const }
          : {}),
      })),
      profileCompletion: completion,
    };
  }

  /**
   * Update profile fields (bio, job, education, etc.).
   * Creates profile record if it doesn't exist yet (first-time setup).
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    // Validate age if birthDate is provided
    if (dto.birthDate) {
      const age = calculateAge(new Date(dto.birthDate));
      if (age < MIN_AGE) {
        throw new BadRequestException(
          "Uygulamayı kullanmak için en az 18 yaşında olmalısınız",
        );
      }
      if (age > MAX_AGE) {
        throw new BadRequestException(
          "Geçerli bir doğum tarihi girin (maksimum 99 yaş)",
        );
      }
    }

    // Validate bio min-length when provided
    if (dto.bio !== undefined && dto.bio.length > 0 && dto.bio.length < 10) {
      throw new BadRequestException("Hakkinda yazisi en az 10 karakter olmali");
    }

    // Validate interestTags max count
    if (dto.interestTags && dto.interestTags.length > 10) {
      throw new BadRequestException(
        "En fazla 10 ilgi alani etiketi eklenebilir",
      );
    }

    // Upsert profile (create if not exists, update if exists)
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        firstName: dto.firstName?.trim() || "Kullanici",
        lastName: dto.lastName?.trim() || null,
        birthDate: dto.birthDate
          ? new Date(dto.birthDate)
          : new Date("2000-01-01"),
        gender: dto.gender ?? "OTHER",
        bio: dto.bio,
        city: dto.city,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        intentionTag: dto.intentionTag ?? "NOT_SURE",
        interestTags: dto.interestTags ?? [],
        height: dto.height,
        education: dto.education,
        smoking: dto.smoking,
        drinking: dto.drinking,
        exercise: dto.exercise,
        zodiacSign: dto.zodiacSign,
        religion: dto.religion,
        jobTitle: dto.jobTitle,
        children: dto.children,
        weight: dto.weight,
        sexualOrientation: dto.sexualOrientation,
        educationLevel: dto.educationLevel,
        maritalStatus: dto.maritalStatus,
        pets: dto.pets,
        lifeValues: dto.lifeValues,
        isComplete: false,
      },
      update: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName.trim() || undefined }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName?.trim() || null }),
        ...(dto.birthDate !== undefined && {
          birthDate: new Date(dto.birthDate),
        }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.intentionTag !== undefined && {
          intentionTag: dto.intentionTag,
        }),
        ...(dto.interestTags !== undefined && {
          interestTags: dto.interestTags,
        }),
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.education !== undefined && { education: dto.education }),
        ...(dto.smoking !== undefined && { smoking: dto.smoking }),
        ...(dto.drinking !== undefined && { drinking: dto.drinking }),
        ...(dto.exercise !== undefined && { exercise: dto.exercise }),
        ...(dto.zodiacSign !== undefined && { zodiacSign: dto.zodiacSign }),
        ...(dto.religion !== undefined && { religion: dto.religion }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.children !== undefined && { children: dto.children }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.sexualOrientation !== undefined && { sexualOrientation: dto.sexualOrientation }),
        ...(dto.educationLevel !== undefined && { educationLevel: dto.educationLevel }),
        ...(dto.maritalStatus !== undefined && { maritalStatus: dto.maritalStatus }),
        ...(dto.pets !== undefined && { pets: dto.pets }),
        ...(dto.lifeValues !== undefined && { lifeValues: dto.lifeValues }),
        lastActiveAt: new Date(),
      },
    });

    // Recalculate completion
    const photos = await this.prisma.userPhoto.findMany({
      where: { userId },
    });

    const isComplete = this.isProfileComplete(
      profile,
      photos.length,
      user.isSmsVerified,
    );
    if (isComplete !== profile.isComplete) {
      await this.prisma.userProfile.update({
        where: { id: profile.id },
        data: { isComplete },
      });
    }

    return { ...profile, isComplete };
  }

  /**
   * Upload a profile photo (max 6 photos per profile).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Multer file type; install @types/multer for proper typing
  async uploadPhoto(userId: string, file: any) {
    if (!file) {
      throw new BadRequestException("Fotoğraf dosyası gerekli");
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        "Desteklenmeyen dosya formatı. JPG, PNG veya WebP kullanın.",
      );
    }

    // Validate file size
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      throw new BadRequestException(
        `Dosya boyutu en fazla ${MAX_PHOTO_SIZE_MB}MB olabilir`,
      );
    }

    // Check photo count limit
    const photoCount = await this.prisma.userPhoto.count({
      where: { userId },
    });

    if (photoCount >= MAX_PHOTOS) {
      throw new BadRequestException(
        `En fazla ${MAX_PHOTOS} fotoğraf yükleyebilirsiniz`,
      );
    }

    // Upload to S3 and generate thumbnails
    const photoResult = await this.storageService.uploadProfilePhoto(
      userId,
      file.buffer,
      photoCount,
    );
    const url = photoResult.url;
    const thumbnailUrl = photoResult.thumbnailUrl;

    const photo = await this.prisma.userPhoto.create({
      data: {
        userId,
        url,
        thumbnailUrl,
        order: photoCount, // Next position
        isPrimary: photoCount === 0, // First photo is primary
        isApproved: false, // Photos start as pending; require moderation
      },
    });

    // Run photo moderation (auto-approves in dev, flags for review in prod)
    const moderationResult = await this.moderatePhoto(photo.id, userId);

    return {
      id: photo.id,
      photoId: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      order: photo.order,
      isPrimary: photo.isPrimary,
      isApproved: moderationResult.approved,
      moderationStatus: moderationResult.approved ? "approved" : "pending",
    };
  }

  /**
   * Perform photo moderation checks.
   *
   * In development: auto-approves after a simulated delay with a warning log.
   * In production: leaves photo as pending (isApproved=false) for manual/AI review.
   *
   * TODO: Integrate AWS Rekognition for automated NSFW detection:
   *   - Call rekognition.detectModerationLabels({ Image: { S3Object: { Bucket, Name } } })
   *   - Reject if any label confidence > 80% for categories:
   *     Explicit Nudity, Violence, Drugs, Hate Symbols
   *   - Auto-approve if all labels below threshold
   *   - Flag for manual review if confidence is between 50-80%
   */
  private async moderatePhoto(
    photoId: string,
    userId: string,
  ): Promise<{ approved: boolean; reason: string }> {
    // Retrieve the photo URL for content scanning
    const photo = await this.prisma.userPhoto.findUnique({
      where: { id: photoId },
      select: { url: true },
    });

    if (!photo) {
      return { approved: false, reason: "photo_not_found" };
    }

    // Run content scanner (auto-approves in dev, scans via AWS Rekognition in prod)
    const scanResult = await this.contentScanner.scanPhoto(photo.url);

    if (!scanResult.safe) {
      // Content scanner flagged the photo — reject and delete it
      this.logger.warn(
        `Photo ${photoId} for user ${userId} rejected by content scanner. ` +
          `Labels: ${scanResult.labels.join(", ")}. Confidence: ${scanResult.confidence}`,
      );

      await this.prisma.userPhoto.delete({
        where: { id: photoId },
      });

      return { approved: false, reason: "content_policy_violation" };
    }

    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      // DEV MODE: Auto-approve with warning
      this.logger.warn(
        `[DEV] Auto-approving photo ${photoId} for user ${userId}. ` +
          `In production, this would require manual/AI moderation review.`,
      );

      await this.prisma.userPhoto.update({
        where: { id: photoId },
        data: { isApproved: true },
      });

      return { approved: true, reason: "dev_auto_approved" };
    }

    // PRODUCTION: Photo stays as isApproved=false, awaiting review
    this.logger.log(
      `Photo ${photoId} for user ${userId} queued for moderation review. ` +
        `Content scanner passed (confidence: ${scanResult.confidence}). ` +
        `Manual approval or additional AI review required.`,
    );

    return { approved: false, reason: "pending_moderation_review" };
  }

  /**
   * Delete a specific photo by ID.
   */
  async deletePhoto(userId: string, photoId: string) {
    // Check minimum photo count before deletion
    const photoCount = await this.prisma.userPhoto.count({
      where: { userId },
    });

    if (photoCount <= MIN_PHOTOS) {
      throw new BadRequestException("Minimum fotoğraf sayısına ulaşıldı");
    }

    // Verify photo belongs to user
    const photo = await this.prisma.userPhoto.findFirst({
      where: { id: photoId, userId },
    });

    if (!photo) {
      throw new NotFoundException("Fotoğraf bulunamadı");
    }

    // Delete photo record
    await this.prisma.userPhoto.delete({
      where: { id: photoId },
    });

    // Delete from S3 (best-effort)
    try {
      const urlParts = photo.url.split("/");
      const keyStart = urlParts.indexOf("photos");
      if (keyStart >= 0) {
        const key = urlParts.slice(keyStart).join("/");
        await this.storageService.deleteFile(key);
      }
    } catch {
      // S3 deletion failure is non-blocking
    }

    // Reorder remaining photos
    const remainingPhotos = await this.prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });

    for (let i = 0; i < remainingPhotos.length; i++) {
      await this.prisma.userPhoto.update({
        where: { id: remainingPhotos[i].id },
        data: {
          order: i,
          isPrimary: i === 0, // First remaining becomes primary
        },
      });
    }

    return { deleted: true, remainingCount: remainingPhotos.length };
  }

  /**
   * Reorder profile photos.
   */
  async reorderPhotos(userId: string, dto: ReorderPhotosDto) {
    // Verify all photo IDs belong to user
    const userPhotos = await this.prisma.userPhoto.findMany({
      where: { userId },
      select: { id: true },
    });

    const userPhotoIds = new Set(userPhotos.map((p) => p.id));
    const dtoPhotoIds = new Set(dto.photoIds);

    // Ensure no duplicates in request
    if (dtoPhotoIds.size !== dto.photoIds.length) {
      throw new BadRequestException("Tekrar eden fotograf ID'leri var");
    }

    // Ensure all provided IDs belong to user
    for (const photoId of dto.photoIds) {
      if (!userPhotoIds.has(photoId)) {
        throw new BadRequestException(`Fotoğraf ${photoId} size ait değil`);
      }
    }

    // Ensure all user photos are included in the reorder array
    if (dtoPhotoIds.size !== userPhotoIds.size) {
      throw new BadRequestException(
        `Tum fotograflarinizi siralama listesine eklemelisiniz (${userPhotoIds.size} fotograf)`,
      );
    }

    // Update order for each photo
    for (let i = 0; i < dto.photoIds.length; i++) {
      await this.prisma.userPhoto.update({
        where: { id: dto.photoIds[i] },
        data: {
          order: i,
          isPrimary: i === 0, // First photo is always the main profile photo
        },
      });
    }

    return { reordered: true };
  }

  /**
   * Set the user's intention tag (1 of 3 LOCKED options).
   */
  async setIntentionTag(userId: string, dto: SetIntentionTagDto) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("Profil bulunamadı. Önce profil oluşturun.");
    }

    await this.prisma.userProfile.update({
      where: { userId },
      data: { intentionTag: dto.intentionTag },
    });

    return {
      intentionTag: dto.intentionTag,
      message: "Niyet etiketi güncellendi",
    };
  }

  /**
   * Get detailed profile strength/completeness breakdown.
   * Weighted categories:
   *   - Has name (10%), Has bio (15%), Has 4+ photos (20%),
   *   - Has intention tag (10%), Answered 20+ questions (20%),
   *   - Has voice intro (10%), Verified selfie (15%)
   */
  async getProfileStrength(userId: string): Promise<{
    percentage: number;
    level: "low" | "medium" | "high";
    message: string;
    breakdown: Array<{
      key: string;
      label: string;
      weight: number;
      completed: boolean;
      tip: string;
    }>;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        photos: {
          where: { isApproved: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    // Count answered questions
    const answeredCount = await this.prisma.userAnswer.count({
      where: { userId },
    });

    // Build weighted breakdown
    const breakdown: Array<{
      key: string;
      label: string;
      weight: number;
      completed: boolean;
      tip: string;
    }> = [
      {
        key: "name",
        label: "Isim",
        weight: 10,
        completed:
          !!user.profile?.firstName && user.profile.firstName.length > 0,
        tip: "Isim ekle",
      },
      {
        key: "bio",
        label: "Hakkinda",
        weight: 15,
        completed: !!user.profile?.bio && user.profile.bio.length > 0,
        tip: "Hakkinda bolumu yaz",
      },
      {
        key: "photos",
        label: "Fotograflar",
        weight: 20,
        completed: user.photos.length >= 4,
        tip:
          user.photos.length < 4
            ? `Daha fazla foto yukle (${user.photos.length}/4)`
            : "",
      },
      {
        key: "intention",
        label: "Niyet Etiketi",
        weight: 10,
        completed: !!user.profile?.intentionTag,
        tip: "Niyet etiketi sec",
      },
      {
        key: "questions",
        label: "Uyumluluk Sorulari",
        weight: 20,
        completed: answeredCount >= 20,
        tip:
          answeredCount < 20
            ? `Daha fazla soru yanitla (${answeredCount}/20)`
            : "",
      },
      {
        key: "voice_intro",
        label: "Sesli Tanitim",
        weight: 10,
        completed: !!user.profile?.voiceIntroUrl,
        tip: "Sesli tanitim ekle",
      },
      {
        key: "selfie_verified",
        label: "Selfie Dogrulama",
        weight: 15,
        completed: user.isSelfieVerified,
        tip: "Selfie dogrulama yap",
      },
    ];

    // Calculate weighted percentage
    let totalWeight = 0;
    let earnedWeight = 0;
    for (const item of breakdown) {
      totalWeight += item.weight;
      if (item.completed) {
        earnedWeight += item.weight;
      }
    }

    const percentage =
      totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    // Determine level and message
    let level: "low" | "medium" | "high";
    let message: string;

    if (percentage < 50) {
      level = "low";
      message = "Profilini tamamla!";
    } else if (percentage < 80) {
      level = "medium";
      message = "Iyi gidiyorsun!";
    } else {
      level = "high";
      message = "Harika profil!";
    }

    return {
      percentage,
      level,
      message,
      breakdown,
    };
  }

  /**
   * Track a profile view — called when a user views another user's profile card.
   */
  async trackProfileView(
    viewerId: string,
    viewedUserId: string,
  ): Promise<void> {
    if (viewerId === viewedUserId) return;

    const dedupKey = `profile:view:dedup:${viewerId}:${viewedUserId}`;

    // Prevent duplicate views within 1 hour using Redis
    const existing = await this.cache.get<string>(dedupKey);
    if (existing) {
      return;
    }

    // Set dedup key with 1-hour TTL
    await this.cache.set(dedupKey, "1", 3600);

    // Append view record to the viewed user's visitor list in Redis.
    // The list is stored as a JSON array with a 7-day TTL.
    const now = Date.now();
    const visitorsKey = `profile:visitors:${viewedUserId}`;
    const visitors =
      (await this.cache.get<
        Array<{ viewerId: string; viewedAt: number }>
      >(visitorsKey)) ?? [];

    // Prune entries older than 7 days
    const sevenDaysAgoMs = now - 7 * 24 * 3600 * 1000;
    const pruned = visitors.filter((v) => v.viewedAt >= sevenDaysAgoMs);

    pruned.push({ viewerId, viewedAt: now });

    await this.cache.set(visitorsKey, pruned, 7 * 24 * 3600);
  }

  /**
   * Get recent profile visitors for the current user (last 7 days).
   * Free users see blurred names; Gold+ see full details.
   */
  async getProfileVisitors(userId: string): Promise<{
    visitors: Array<{
      visitorId: string;
      firstName: string | null;
      photoUrl: string | null;
      viewedAt: string;
      isBlurred: boolean;
    }>;
    totalCount: number;
    canSeeDetails: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    const canSeeDetails = user.packageTier !== "FREE";
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Collect visitor IDs from Redis store
    const visitorsKey = `profile:visitors:${userId}`;
    const rawVisitors =
      (await this.cache.get<
        Array<{ viewerId: string; viewedAt: number }>
      >(visitorsKey)) ?? [];

    const visitorEntries: Array<{ viewerId: string; viewedAt: Date }> =
      rawVisitors
        .filter((v) => v.viewedAt >= sevenDaysAgo.getTime())
        .map((v) => ({
          viewerId: v.viewerId,
          viewedAt: new Date(v.viewedAt),
        }));

    // Sort by most recent first
    visitorEntries.sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime());

    // Deduplicate by viewerId (keep most recent)
    const seenViewers = new Set<string>();
    const uniqueVisitors: Array<{ viewerId: string; viewedAt: Date }> = [];
    for (const entry of visitorEntries) {
      if (!seenViewers.has(entry.viewerId)) {
        seenViewers.add(entry.viewerId);
        uniqueVisitors.push(entry);
      }
    }

    // Fetch visitor profiles
    const visitorIds = uniqueVisitors.map((v) => v.viewerId);
    const visitorProfiles = await this.prisma.user.findMany({
      where: { id: { in: visitorIds } },
      include: {
        profile: {
          select: { firstName: true },
        },
        photos: {
          where: { isPrimary: true, isApproved: true },
          select: { thumbnailUrl: true },
          take: 1,
        },
      },
    });

    const profileMap = new Map(visitorProfiles.map((vp) => [vp.id, vp]));

    const visitors = uniqueVisitors.slice(0, 50).map((entry) => {
      const visitorProfile = profileMap.get(entry.viewerId);
      return {
        visitorId: entry.viewerId,
        firstName: canSeeDetails
          ? (visitorProfile?.profile?.firstName ?? null)
          : null,
        photoUrl: canSeeDetails
          ? (visitorProfile?.photos[0]?.thumbnailUrl ?? null)
          : null,
        viewedAt: entry.viewedAt.toISOString(),
        isBlurred: !canSeeDetails,
      };
    });

    return {
      visitors,
      totalCount: uniqueVisitors.length,
      canSeeDetails,
    };
  }

  /** Maximum physically possible travel speed in km/h before flagging */
  private static readonly IMPOSSIBLE_TRAVEL_SPEED_KMH = 500;

  /**
   * Update the user's geolocation coordinates.
   * Called periodically from the mobile client.
   * Validates latitude (-90 to 90) and longitude (-180 to 180).
   * Includes impossible travel detection (>500 km/h).
   */
  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<{ updated: true; impossibleTravelDetected?: boolean }> {
    // Validate coordinate bounds
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException(
        "Gecersiz enlem degeri. Enlem -90 ile 90 arasinda olmalidir.",
      );
    }
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException(
        "Gecersiz boylam degeri. Boylam -180 ile 180 arasinda olmalidir.",
      );
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("Profil bulunamadi. Once profil olusturun.");
    }

    // Impossible travel detection
    let impossibleTravelDetected = false;
    if (
      profile.latitude != null &&
      profile.longitude != null &&
      profile.locationUpdatedAt != null
    ) {
      const distanceKm = this.haversineDistance(
        profile.latitude,
        profile.longitude,
        latitude,
        longitude,
      );

      const timeDiffHours =
        (Date.now() - profile.locationUpdatedAt.getTime()) / (1000 * 60 * 60);

      // Avoid division by zero — require at least 1 second elapsed
      if (timeDiffHours > 0.0003 && distanceKm > 0) {
        const speedKmh = distanceKm / timeDiffHours;

        if (speedKmh > ProfilesService.IMPOSSIBLE_TRAVEL_SPEED_KMH) {
          impossibleTravelDetected = true;
          this.logger.warn(
            `[IMPOSSIBLE_TRAVEL] User ${userId}: ${distanceKm.toFixed(1)}km in ${(timeDiffHours * 60).toFixed(1)}min = ${speedKmh.toFixed(0)}km/h. ` +
              `From (${profile.latitude}, ${profile.longitude}) to (${latitude}, ${longitude}). Flagged for admin review.`,
          );
        }
      }
    }

    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        latitude,
        longitude,
        locationUpdatedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    return { updated: true, ...(impossibleTravelDetected ? { impossibleTravelDetected } : {}) };
  }

  /**
   * Calculate the great-circle distance between two coordinates using the Haversine formula.
   * @returns Distance in kilometers
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Profile view data is now stored in Redis via LumaCacheService.
  // Keys: profile:view:dedup:{viewerId}:{viewedUserId} (1h TTL, dedup)
  //        profile:visitors:{viewedUserId} (7d TTL, visitor list)

  // ─── Private Helpers ───────────────────────────────────────────

  private calculateCompletion(user: {
    isSmsVerified: boolean;
    isSelfieVerified: boolean;
    profile: {
      bio: string | null;
      city: string | null;
      intentionTag: string;
    } | null;
    photos: { id: string }[];
  }): number {
    let score = 0;
    const total = 7;

    if (user.isSmsVerified) score++;
    if (user.isSelfieVerified) score++;
    if (user.profile) score++;
    if (user.profile?.bio && user.profile.bio.length >= 10) score++;
    if (user.profile?.city) score++;
    if (user.profile?.intentionTag) score++;
    if (user.photos.length >= MIN_PHOTOS) score++;

    return Math.round((score / total) * 100);
  }

  /**
   * Calculate a weighted profile strength percentage.
   * Used by the coach tips method to determine overall completeness.
   */
  private calculateProfileStrength(
    profile: {
      firstName?: string;
      bio?: string | null;
      intentionTag?: string;
      voiceIntroUrl?: string | null;
    } | null,
    photoCount: number,
    answeredQuestions: number,
    isSelfieVerified: boolean,
  ): number {
    let earned = 0;
    const total = 100;

    // Name (10%)
    if (profile?.firstName && profile.firstName.length > 0) earned += 10;
    // Bio (15%)
    if (profile?.bio && profile.bio.length > 0) earned += 15;
    // Photos — 4+ (20%)
    if (photoCount >= 4) earned += 20;
    // Intention tag (10%)
    if (profile?.intentionTag) earned += 10;
    // Questions — 20+ answered (20%)
    if (answeredQuestions >= 20) earned += 20;
    // Voice intro (10%)
    if (profile?.voiceIntroUrl) earned += 10;
    // Selfie verified (15%)
    if (isSelfieVerified) earned += 15;

    return Math.round((earned / total) * 100);
  }

  private isProfileComplete(
    profile: { firstName: string; bio: string | null; intentionTag: string },
    photoCount: number,
    isSmsVerified: boolean,
  ): boolean {
    return (
      isSmsVerified &&
      !!profile.firstName &&
      !!profile.bio &&
      profile.bio.length >= 10 &&
      !!profile.intentionTag &&
      photoCount >= MIN_PHOTOS
    );
  }

  // ─── Profile Video ──────────────────────────────────────────

  /** Get the video profile for the current user */
  async getVideo(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: {
        videoUrl: true,
        videoThumbnailUrl: true,
        videoDuration: true,
      },
    });
    if (!profile) {
      throw new NotFoundException("Profil bulunamadi");
    }
    return {
      videoUrl: profile.videoUrl,
      videoThumbnailUrl: profile.videoThumbnailUrl,
      videoDuration: profile.videoDuration,
    };
  }

  /** Save video metadata after upload */
  async saveVideo(
    userId: string,
    data: {
      videoUrl: string;
      videoKey: string;
      videoThumbnailUrl?: string;
      videoDuration?: number;
    },
  ) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: {
        videoUrl: data.videoUrl,
        videoKey: data.videoKey,
        videoThumbnailUrl: data.videoThumbnailUrl ?? null,
        videoDuration: data.videoDuration ?? 0,
      },
      select: {
        videoUrl: true,
        videoKey: true,
        videoThumbnailUrl: true,
        videoDuration: true,
      },
    });
  }

  /** Delete video from profile */
  async deleteVideo(userId: string) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: {
        videoUrl: null,
        videoKey: null,
        videoThumbnailUrl: null,
        videoDuration: 0,
      },
    });
  }

  // ─── Profile Prompts ─────────────────────────────────────────

  /** Get profile prompts for a user (public) */
  async getPrompts(userId: string) {
    return this.prisma.profilePrompt.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        question: true,
        answer: true,
        order: true,
      },
    });
  }

  /** Save profile prompts (max 3). Replaces existing prompts. */
  async savePrompts(
    userId: string,
    prompts: Array<{ question: string; answer: string; order: number }>,
  ) {
    if (prompts.length > 3) {
      throw new BadRequestException("En fazla 3 profil sorusu eklenebilir");
    }

    // Validate each prompt
    for (const prompt of prompts) {
      if (!prompt.question || prompt.question.length > 200) {
        throw new BadRequestException("Soru 1-200 karakter arasi olmali");
      }
      if (!prompt.answer || prompt.answer.length > 300) {
        throw new BadRequestException("Cevap 1-300 karakter arasi olmali");
      }
      if (prompt.order < 0 || prompt.order > 2) {
        throw new BadRequestException("Sira 0-2 arasi olmali");
      }
    }

    // Delete existing and create new in a transaction
    return this.prisma.$transaction(async (tx) => {
      await tx.profilePrompt.deleteMany({ where: { userId } });

      const created = await Promise.all(
        prompts.map((p) =>
          tx.profilePrompt.create({
            data: {
              userId,
              question: p.question,
              answer: p.answer,
              order: p.order,
            },
            select: { id: true, question: true, answer: true, order: true },
          }),
        ),
      );

      return created;
    });
  }

  // ─── Profile Boost ───────────────────────────────────────────

  private static readonly BOOST_DURATION_MINUTES = 30;
  private static readonly BOOST_GOLD_COST = 100;

  /** Check if user has an active boost */
  async getBoostStatus(userId: string) {
    const activeBoost = await this.prisma.profileBoost.findFirst({
      where: {
        userId,
        isActive: true,
        endsAt: { gt: new Date() },
      },
      orderBy: { endsAt: "desc" },
    });

    if (!activeBoost) {
      return { isActive: false };
    }

    const remainingSeconds = Math.max(
      0,
      Math.floor((activeBoost.endsAt.getTime() - Date.now()) / 1000),
    );

    return {
      isActive: true,
      endsAt: activeBoost.endsAt.toISOString(),
      remainingSeconds,
    };
  }

  /** Activate a 30-minute profile boost (costs Gold) */
  async activateBoost(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { goldBalance: true },
    });

    if (!user) throw new NotFoundException("Kullanici bulunamadi");

    if (user.goldBalance < ProfilesService.BOOST_GOLD_COST) {
      throw new BadRequestException(
        `Yetersiz Gold. Boost icin ${ProfilesService.BOOST_GOLD_COST} Gold gerekli.`,
      );
    }

    // Check if already has active boost
    const existingBoost = await this.prisma.profileBoost.findFirst({
      where: {
        userId,
        isActive: true,
        endsAt: { gt: new Date() },
      },
    });

    if (existingBoost) {
      throw new BadRequestException("Zaten aktif bir Boost mevcut");
    }

    const now = new Date();
    const endsAt = new Date(
      now.getTime() + ProfilesService.BOOST_DURATION_MINUTES * 60 * 1000,
    );

    // Deduct Gold and create boost in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct Gold
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { goldBalance: { decrement: ProfilesService.BOOST_GOLD_COST } },
        select: { goldBalance: true },
      });

      // Record transaction
      await tx.goldTransaction.create({
        data: {
          userId,
          type: "PROFILE_BOOST",
          amount: -ProfilesService.BOOST_GOLD_COST,
          balance: updatedUser.goldBalance,
          description: `Profil Boost - ${ProfilesService.BOOST_DURATION_MINUTES} dakika (${ProfilesService.BOOST_GOLD_COST} Gold)`,
        },
      });

      // Create boost record
      const boost = await tx.profileBoost.create({
        data: {
          userId,
          endsAt,
          goldSpent: ProfilesService.BOOST_GOLD_COST,
        },
      });

      return { boost, goldBalance: updatedUser.goldBalance };
    });

    return {
      success: true,
      endsAt: result.boost.endsAt.toISOString(),
      goldDeducted: ProfilesService.BOOST_GOLD_COST,
      goldBalance: result.goldBalance,
    };
  }

  // ─── Login Streak ────────────────────────────────────────────

  /** Streak milestone thresholds and Gold rewards */
  private static readonly STREAK_REWARDS: Array<{
    days: number;
    gold: number;
    name: string;
  }> = [
    { days: 3, gold: 5, name: "3 Gün" },
    { days: 7, gold: 10, name: "1 Hafta" },
    { days: 14, gold: 20, name: "2 Hafta" },
    { days: 30, gold: 50, name: "1 Ay" },
    { days: 60, gold: 100, name: "2 Ay" },
    { days: 100, gold: 200, name: "100 Gün" },
  ];

  /** Toggle incognito mode (hide from discovery, Gold+ only) */
  async toggleIncognito(userId: string, enabled: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    if (!user) throw new BadRequestException("Kullanıcı bulunamadı");

    // Incognito requires Gold+ package
    if (enabled && user.packageTier === "FREE") {
      throw new BadRequestException(
        "Gizli mod için Gold veya üzeri paket gereklidir",
      );
    }

    await this.prisma.userProfile.update({
      where: { userId },
      data: { isIncognito: enabled },
    });

    return { isIncognito: enabled };
  }

  // ─── AI Profile Coach (Rule-Based Tips) ────────────────────

  private static readonly VALID_MBTI_TYPES: ReadonlyArray<string> = [
    "INTJ",
    "INTP",
    "ENTJ",
    "ENTP",
    "INFJ",
    "INFP",
    "ENFJ",
    "ENFP",
    "ISTJ",
    "ISFJ",
    "ESTJ",
    "ESFJ",
    "ISTP",
    "ISFP",
    "ESTP",
    "ESFP",
  ];

  private static readonly VALID_ENNEAGRAM_TYPES: ReadonlyArray<string> = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
  ];

  /**
   * Generate rule-based profile improvement tips.
   * Analyzes the user's profile for missing or weak sections
   * and returns prioritized, actionable advice.
   */
  async getProfileCoachTips(userId: string): Promise<{
    tips: Array<{
      category: string;
      tip: string;
      priority: "high" | "medium" | "low";
    }>;
    profileStrength: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        photos: {
          where: { isApproved: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Kullanici bulunamadi");
    }

    // Count prompts and answered questions
    const promptCount = await this.prisma.profilePrompt.count({
      where: { userId },
    });

    const answeredCount = await this.prisma.userAnswer.count({
      where: { userId },
    });

    const profile = user.profile;
    const photoCount = user.photos.length;

    const tips: Array<{
      category: string;
      tip: string;
      priority: "high" | "medium" | "low";
    }> = [];

    // High priority tips (core profile elements)
    if (!profile?.bio) {
      tips.push({
        category: "bio",
        tip: "Bio ekle \u2014 kendini 2-3 c\u00fcmleyle tan\u0131t",
        priority: "high",
      });
    } else if (profile.bio.length < 50) {
      tips.push({
        category: "bio",
        tip: "Bio'nu zenginle\u015ftir \u2014 ilgi \u00e7ekici detaylar ekle",
        priority: "medium",
      });
    }

    if (photoCount < 3) {
      tips.push({
        category: "photos",
        tip: "En az 3 foto\u011fraf ekle \u2014 farkl\u0131 ortamlarda \u00e7ekilmi\u015f",
        priority: "high",
      });
    }

    if (!profile?.voiceIntroUrl) {
      tips.push({
        category: "voice",
        tip: "Sesli tan\u0131t\u0131m ekle \u2014 sesin ki\u015fili\u011fini yans\u0131t\u0131r",
        priority: "medium",
      });
    }

    if (!profile?.interestTags || profile.interestTags.length === 0) {
      tips.push({
        category: "interests",
        tip: "\u0130lgi alanlar\u0131n\u0131 se\u00e7 \u2014 ortak noktalar bulmay\u0131 kolayla\u015ft\u0131r\u0131r",
        priority: "high",
      });
    }

    // Medium priority tips (enrichment)
    if (!profile?.height) {
      tips.push({
        category: "height",
        tip: "Boy bilgini ekle \u2014 aramalarda \u00f6ne \u00e7\u0131kmana yard\u0131mc\u0131 olur",
        priority: "medium",
      });
    }

    if (!profile?.education) {
      tips.push({
        category: "education",
        tip: "E\u011fitim bilgini ekle",
        priority: "medium",
      });
    }

    if (promptCount === 0) {
      tips.push({
        category: "prompts",
        tip: "Profil sorular\u0131 ekle \u2014 ki\u015fili\u011fini g\u00f6ster",
        priority: "medium",
      });
    }

    // Low priority tips (extras)
    if (!profile?.zodiacSign) {
      tips.push({
        category: "zodiac",
        tip: "Bur\u00e7 bilgini ekle \u2014 e\u011flenceli bir ba\u011f kurma yolu",
        priority: "low",
      });
    }

    if (!profile?.mbtiType) {
      tips.push({
        category: "mbti",
        tip: "Ki\u015filik tipini se\u00e7 \u2014 uyum analizini g\u00fc\u00e7lendirir",
        priority: "low",
      });
    }

    // Calculate profile strength using the same weighted system
    const strengthData = this.calculateProfileStrength(
      profile,
      photoCount,
      answeredCount,
      user.isSelfieVerified,
    );

    // Add strength tip if below 70%
    if (strengthData < 70) {
      tips.push({
        category: "strength",
        tip: "Profilini %70'in \u00fczerine \u00e7\u0131kar \u2014 daha fazla e\u015fle\u015fme al",
        priority: "high",
      });
    }

    return {
      tips,
      profileStrength: strengthData,
    };
  }

  // ─── Personality Type (MBTI + Enneagram) ──────────────────

  /**
   * Update the user's personality type information (MBTI and/or Enneagram).
   * Validates against the 16 MBTI types and 9 Enneagram types.
   */
  async updatePersonality(
    userId: string,
    mbtiType?: string,
    enneagramType?: string,
  ): Promise<{
    mbtiType: string | null;
    enneagramType: string | null;
    message: string;
  }> {
    // Validate MBTI if provided
    if (mbtiType !== undefined) {
      const upperMbti = mbtiType.toUpperCase();
      if (!ProfilesService.VALID_MBTI_TYPES.includes(upperMbti)) {
        throw new BadRequestException(
          `Gecersiz MBTI tipi: ${mbtiType}. Gecerli tipler: ${ProfilesService.VALID_MBTI_TYPES.join(", ")}`,
        );
      }
      mbtiType = upperMbti;
    }

    // Validate Enneagram if provided
    if (enneagramType !== undefined) {
      if (!ProfilesService.VALID_ENNEAGRAM_TYPES.includes(enneagramType)) {
        throw new BadRequestException(
          `Gecersiz Enneagram tipi: ${enneagramType}. Gecerli tipler: 1-9`,
        );
      }
    }

    // At least one must be provided
    if (mbtiType === undefined && enneagramType === undefined) {
      throw new BadRequestException(
        "En az bir kisilik tipi belirtilmeli (mbtiType veya enneagramType)",
      );
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("Profil bulunamadi. Once profil olusturun.");
    }

    const updatedProfile = await this.prisma.userProfile.update({
      where: { userId },
      data: {
        ...(mbtiType !== undefined && { mbtiType }),
        ...(enneagramType !== undefined && { enneagramType }),
        lastActiveAt: new Date(),
      },
      select: {
        mbtiType: true,
        enneagramType: true,
      },
    });

    return {
      mbtiType: updatedProfile.mbtiType,
      enneagramType: updatedProfile.enneagramType,
      message: "Kisilik tipi guncellendi",
    };
  }

  /** Record daily login and calculate streak + rewards */
  async recordLoginStreak(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get or create streak record
    let streak = await this.prisma.loginStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      // First login ever
      streak = await this.prisma.loginStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastLoginDate: today,
          totalGoldEarned: 0,
        },
      });

      return {
        currentStreak: 1,
        longestStreak: 1,
        goldAwarded: 0,
        milestoneReached: false,
      };
    }

    // Already logged in today
    const lastLogin = new Date(streak.lastLoginDate);
    lastLogin.setHours(0, 0, 0, 0);

    if (lastLogin.getTime() === today.getTime()) {
      return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        goldAwarded: 0,
        milestoneReached: false,
      };
    }

    // Calculate new streak
    let newStreak: number;
    if (lastLogin.getTime() === yesterday.getTime()) {
      // Consecutive day — increment streak
      newStreak = streak.currentStreak + 1;
    } else {
      // Streak broken — reset to 1
      newStreak = 1;
    }

    const newLongest = Math.max(streak.longestStreak, newStreak);

    // Check for milestone rewards
    let goldAwarded = 0;
    let milestoneReached = false;
    let milestoneName: string | undefined;

    for (const reward of ProfilesService.STREAK_REWARDS) {
      if (newStreak === reward.days) {
        goldAwarded = reward.gold;
        milestoneReached = true;
        milestoneName = reward.name;
        break;
      }
    }

    // Update streak and award Gold in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.loginStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastLoginDate: today,
          totalGoldEarned: { increment: goldAwarded },
        },
      });

      if (goldAwarded > 0) {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { goldBalance: { increment: goldAwarded } },
          select: { goldBalance: true },
        });

        await tx.goldTransaction.create({
          data: {
            userId,
            type: "STREAK_REWARD",
            amount: goldAwarded,
            balance: updatedUser.goldBalance,
            description: `Giris serisi odulu - ${milestoneName}`,
          },
        });
      }
    });

    return {
      currentStreak: newStreak,
      longestStreak: newLongest,
      goldAwarded,
      milestoneReached,
      ...(milestoneName ? { milestoneName } : {}),
    };
  }
}
