import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateUserDto } from "./dto";
import { calculateAge } from "../../common/utils/date.utils";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get the current authenticated user's full profile data.
   * Includes profile, photos, badges, subscription, and computed fields.
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        photos: {
          where: { isApproved: true },
          orderBy: { order: "asc" },
        },
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
        },
        subscriptions: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    // Exclude sensitive fields
    const { deletedAt: _deletedAt, ...safeUser } = user;

    // Compute age from birthDate
    const age = user.profile?.birthDate
      ? calculateAge(user.profile.birthDate)
      : null;

    // Compute profile completion percentage
    const profileCompletion = this.calculateProfileCompletion(user);

    return {
      ...safeUser,
      age,
      profileCompletion,
      activeSubscription: user.subscriptions[0] ?? null,
    };
  }

  /**
   * Update the current user's basic information.
   */
  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
    });

    return updatedUser;
  }

  /**
   * Find a user by ID (internal use by other services).
   */
  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Find a user by phone number (internal use by auth service).
   */
  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * Toggle follow/unfollow a user. Returns the new follow state.
   */
  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException("Kendinizi takip edemezsiniz");
    }

    const existing = await this.prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      await this.prisma.userFollow.delete({ where: { id: existing.id } });
      return { isFollowing: false };
    }

    await this.prisma.userFollow.create({
      data: { followerId, followingId },
    });

    // Notify the followed user (fire-and-forget)
    const followerProfile = await this.prisma.userProfile.findUnique({
      where: { userId: followerId },
      select: { firstName: true },
    });
    this.notificationsService
      .notifyNewFollower(followingId, followerProfile?.firstName ?? "Birisi", followerId)
      .catch(() => {});

    return { isFollowing: true };
  }

  /**
   * Get a user's followers list.
   */
  async getFollowers(userId: string) {
    const follows = await this.prisma.userFollow.findMany({
      where: { followingId: userId },
      select: {
        follower: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
            photos: {
              where: { order: 0 },
              select: { url: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return follows.map((f) => ({
      userId: f.follower.id,
      name: f.follower.profile?.firstName ?? "Kullanici",
      avatarUrl: f.follower.photos[0]?.url ?? null,
    }));
  }

  /**
   * Get the list of users a user is following.
   */
  async getFollowing(userId: string) {
    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: {
        following: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
            photos: {
              where: { order: 0 },
              select: { url: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return follows.map((f) => ({
      userId: f.following.id,
      name: f.following.profile?.firstName ?? "Kullanici",
      avatarUrl: f.following.photos[0]?.url ?? null,
    }));
  }

  // ─── Private Helpers ───────────────────────────────────────────


  private calculateProfileCompletion(user: {
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

    // Phone verified
    if (user.isSmsVerified) score++;
    // Selfie verified
    if (user.isSelfieVerified) score++;
    // Has profile
    if (user.profile) score++;
    // Has bio
    if (user.profile?.bio) score++;
    // Has location
    if (user.profile?.city) score++;
    // Has intention tag
    if (user.profile?.intentionTag) score++;
    // Has at least 1 photo
    if (user.photos.length > 0) score++;

    return Math.round((score / total) * 100);
  }
}
