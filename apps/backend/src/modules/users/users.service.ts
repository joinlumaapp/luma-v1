import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
          orderBy: { order: 'asc' },
        },
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: 'desc' },
        },
        subscriptions: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Exclude sensitive fields
    const { deletedAt, ...safeUser } = user;

    // Compute age from birthDate
    const age = user.profile?.birthDate
      ? this.calculateAge(user.profile.birthDate)
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
      throw new NotFoundException('Kullanıcı bulunamadı');
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

  private calculateProfileCompletion(user: {
    isSmsVerified: boolean;
    isSelfieVerified: boolean;
    profile: { bio: string | null; city: string | null; intentionTag: string } | null;
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
