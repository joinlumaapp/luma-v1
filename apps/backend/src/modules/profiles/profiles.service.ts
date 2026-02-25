import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, SetIntentionTagDto, ReorderPhotosDto } from './dto';

const MAX_PHOTOS = 6;
const MIN_PHOTOS = 2;
const MAX_PHOTO_SIZE_MB = 10;
const MIN_AGE = 18;
const MAX_AGE = 99;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get a user's full profile including photos and intention tag.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        photos: {
          where: { isApproved: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Calculate profile completion
    const completion = this.calculateCompletion(user);

    return {
      userId: user.id,
      profile: user.profile,
      photos: user.photos,
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
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Validate age if birthDate is provided
    if (dto.birthDate) {
      const age = this.calculateAge(new Date(dto.birthDate));
      if (age < MIN_AGE) {
        throw new BadRequestException('Uygulamayı kullanmak için en az 18 yaşında olmalısınız');
      }
      if (age > MAX_AGE) {
        throw new BadRequestException('Geçerli bir doğum tarihi girin (maksimum 99 yaş)');
      }
    }

    // Validate bio min-length when provided
    if (dto.bio !== undefined && dto.bio.length > 0 && dto.bio.length < 10) {
      throw new BadRequestException('Hakkinda yazisi en az 10 karakter olmali');
    }

    // Upsert profile (create if not exists, update if exists)
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        firstName: dto.firstName ?? '',
        birthDate: dto.birthDate ? new Date(dto.birthDate) : new Date('2000-01-01'),
        gender: dto.gender ?? 'OTHER',
        bio: dto.bio,
        city: dto.city,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        intentionTag: dto.intentionTag ?? 'NOT_SURE',
        isComplete: false,
      },
      update: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.intentionTag !== undefined && { intentionTag: dto.intentionTag }),
        lastActiveAt: new Date(),
      },
    });

    // Recalculate completion
    const photos = await this.prisma.userPhoto.findMany({
      where: { userId },
    });

    const isComplete = this.isProfileComplete(profile, photos.length, user.isSmsVerified);
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
      throw new BadRequestException('Fotoğraf dosyası gerekli');
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Desteklenmeyen dosya formatı. JPG, PNG veya WebP kullanın.',
      );
    }

    // Validate file size
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      throw new BadRequestException(`Dosya boyutu en fazla ${MAX_PHOTO_SIZE_MB}MB olabilir`);
    }

    // Check photo count limit
    const photoCount = await this.prisma.userPhoto.count({
      where: { userId },
    });

    if (photoCount >= MAX_PHOTOS) {
      throw new BadRequestException(`En fazla ${MAX_PHOTOS} fotoğraf yükleyebilirsiniz`);
    }

    // In production: Upload to S3 and generate thumbnails
    // For now: Mock URL generation
    const photoId = crypto.randomUUID();
    const url = `https://cdn.luma.app/photos/${userId}/${photoId}.jpg`;
    const thumbnailUrl = `https://cdn.luma.app/photos/${userId}/${photoId}_thumb.jpg`;

    const photo = await this.prisma.userPhoto.create({
      data: {
        userId,
        url,
        thumbnailUrl,
        order: photoCount, // Next position
        isPrimary: photoCount === 0, // First photo is primary
        isApproved: true, // Auto-approve for now; add moderation later
      },
    });

    return {
      photoId: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      order: photo.order,
      isPrimary: photo.isPrimary,
    };
  }

  /**
   * Delete a specific photo by ID.
   */
  async deletePhoto(userId: string, photoId: string) {
    // Verify photo belongs to user
    const photo = await this.prisma.userPhoto.findFirst({
      where: { id: photoId, userId },
    });

    if (!photo) {
      throw new NotFoundException('Fotoğraf bulunamadı');
    }

    // Delete photo record
    await this.prisma.userPhoto.delete({
      where: { id: photoId },
    });

    // In production: Delete from S3 bucket
    // await this.s3Service.deleteObject(photo.url);

    // Reorder remaining photos
    const remainingPhotos = await this.prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
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
      throw new BadRequestException('Tekrar eden fotograf ID\'leri var');
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
      throw new NotFoundException('Profil bulunamadı. Önce profil oluşturun.');
    }

    await this.prisma.userProfile.update({
      where: { userId },
      data: { intentionTag: dto.intentionTag },
    });

    return {
      intentionTag: dto.intentionTag,
      message: 'Niyet etiketi güncellendi',
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
    level: 'low' | 'medium' | 'high';
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
      throw new NotFoundException('Kullanıcı bulunamadı');
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
        key: 'name',
        label: 'Isim',
        weight: 10,
        completed: !!user.profile?.firstName && user.profile.firstName.length > 0,
        tip: 'Isim ekle',
      },
      {
        key: 'bio',
        label: 'Hakkinda',
        weight: 15,
        completed: !!user.profile?.bio && user.profile.bio.length > 0,
        tip: 'Hakkinda bolumu yaz',
      },
      {
        key: 'photos',
        label: 'Fotograflar',
        weight: 20,
        completed: user.photos.length >= 4,
        tip: user.photos.length < 4
          ? `Daha fazla foto yukle (${user.photos.length}/4)`
          : '',
      },
      {
        key: 'intention',
        label: 'Niyet Etiketi',
        weight: 10,
        completed: !!user.profile?.intentionTag,
        tip: 'Niyet etiketi sec',
      },
      {
        key: 'questions',
        label: 'Uyumluluk Sorulari',
        weight: 20,
        completed: answeredCount >= 20,
        tip: answeredCount < 20
          ? `Daha fazla soru yanitla (${answeredCount}/20)`
          : '',
      },
      {
        key: 'voice_intro',
        label: 'Sesli Tanitim',
        weight: 10,
        completed: !!user.profile?.voiceIntroUrl,
        tip: 'Sesli tanitim ekle',
      },
      {
        key: 'selfie_verified',
        label: 'Selfie Dogrulama',
        weight: 15,
        completed: user.isSelfieVerified,
        tip: 'Selfie dogrulama yap',
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

    const percentage = totalWeight > 0
      ? Math.round((earnedWeight / totalWeight) * 100)
      : 0;

    // Determine level and message
    let level: 'low' | 'medium' | 'high';
    let message: string;

    if (percentage < 50) {
      level = 'low';
      message = 'Profilini tamamla!';
    } else if (percentage < 80) {
      level = 'medium';
      message = 'Iyi gidiyorsun!';
    } else {
      level = 'high';
      message = 'Harika profil!';
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
  async trackProfileView(viewerId: string, viewedUserId: string): Promise<void> {
    if (viewerId === viewedUserId) return;

    // Store in memory cache (keyed by viewed user)
    const now = new Date();
    const viewKey = `${viewerId}:${viewedUserId}`;

    // Prevent duplicate views within 1 hour
    const existingView = ProfilesService.profileViews.get(viewKey);
    if (existingView && now.getTime() - existingView.viewedAt.getTime() < 60 * 60 * 1000) {
      return;
    }

    ProfilesService.profileViews.set(viewKey, {
      viewerId,
      viewedUserId,
      viewedAt: now,
    });
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
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const canSeeDetails = user.packageTier !== 'FREE';
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Collect visitor IDs from in-memory store
    const visitorEntries: Array<{ viewerId: string; viewedAt: Date }> = [];
    for (const [, view] of ProfilesService.profileViews) {
      if (view.viewedUserId === userId && view.viewedAt >= sevenDaysAgo) {
        visitorEntries.push({
          viewerId: view.viewerId,
          viewedAt: view.viewedAt,
        });
      }
    }

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

    const profileMap = new Map(
      visitorProfiles.map((vp) => [vp.id, vp]),
    );

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

  /**
   * Update the user's geolocation coordinates.
   * Called periodically from the mobile client.
   */
  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<{ updated: true }> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profil bulunamadi. Once profil olusturun.');
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

    return { updated: true };
  }

  // ─── In-Memory Profile View Store ──────────────────────────────

  private static profileViews: Map<
    string,
    { viewerId: string; viewedUserId: string; viewedAt: Date }
  > = new Map();

  // ─── Private Helpers ───────────────────────────────────────────

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private calculateCompletion(user: {
    isSmsVerified: boolean;
    isSelfieVerified: boolean;
    profile: { bio: string | null; city: string | null; intentionTag: string } | null;
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
}
