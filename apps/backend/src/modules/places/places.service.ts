import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckInDto, AddMemoryDto } from './dto';

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check in to a place (record a visit).
   * Creates the place record if it doesn't exist yet.
   */
  async checkIn(userId: string, dto: CheckInDto) {
    // Find or create place
    let place = await this.prisma.discoveredPlace.findFirst({
      where: {
        latitude: { gte: dto.latitude - 0.001, lte: dto.latitude + 0.001 },
        longitude: { gte: dto.longitude - 0.001, lte: dto.longitude + 0.001 },
        name: dto.placeName,
      },
    });

    if (!place) {
      place = await this.prisma.discoveredPlace.create({
        data: {
          name: dto.placeName,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });
    }

    // Check if user is in a relationship (for couple check-in)
    const relationship = await this.prisma.relationship.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'ACTIVE',
      },
    });

    // Create check-in
    const checkIn = await this.prisma.placeCheckIn.create({
      data: {
        placeId: place.id,
        userId,
        relationshipId: relationship?.id,
      },
    });

    // If there's a note, create a memory automatically
    if (dto.note) {
      await this.prisma.placeMemory.create({
        data: {
          placeId: place.id,
          userId,
          note: dto.note,
        },
      });
    }

    // Notify partner if in relationship
    if (relationship) {
      const partnerId = relationship.userAId === userId
        ? relationship.userBId
        : relationship.userAId;

      await this.prisma.notification.create({
        data: {
          userId: partnerId,
          type: 'SYSTEM',
          title: 'Yeni Check-in!',
          body: `Partneriniz "${dto.placeName}" mekanına check-in yaptı.`,
          data: { placeId: place.id, checkInId: checkIn.id },
        },
      });
    }

    return {
      checkInId: checkIn.id,
      placeId: place.id,
      placeName: place.name,
      checkedInAt: checkIn.checkedInAt,
    };
  }

  /**
   * Verify that two users have an active relationship or match.
   * Throws ForbiddenException if no connection exists.
   */
  private async verifyPartnerAccess(userId: string, partnerId: string): Promise<void> {
    const relationship = await this.prisma.relationship.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: partnerId },
          { userAId: partnerId, userBId: userId },
        ],
        status: 'ACTIVE',
      },
    });

    if (!relationship) {
      const match = await this.prisma.match.findFirst({
        where: {
          OR: [
            { userAId: userId, userBId: partnerId },
            { userAId: partnerId, userBId: userId },
          ],
          isActive: true,
        },
      });

      if (!match) {
        throw new ForbiddenException(
          'Bu kullanici ile mekan bilgilerinizi paylasma yetkiniz yok',
        );
      }
    }
  }

  /**
   * Get places shared with a matched user or relationship partner.
   */
  async getSharedPlaces(userId: string, partnerId: string) {
    await this.verifyPartnerAccess(userId, partnerId);

    // Get places where both users have checked in
    const myCheckIns = await this.prisma.placeCheckIn.findMany({
      where: { userId },
      select: { placeId: true },
    });

    const partnerCheckIns = await this.prisma.placeCheckIn.findMany({
      where: { userId: partnerId },
      select: { placeId: true },
    });

    const myPlaceIds = new Set(
      myCheckIns.map((c: { placeId: string }) => c.placeId),
    );
    const sharedPlaceIds = partnerCheckIns
      .filter((c: { placeId: string }) => myPlaceIds.has(c.placeId))
      .map((c: { placeId: string }) => c.placeId);

    const uniqueSharedIds = [...new Set(sharedPlaceIds)];

    if (uniqueSharedIds.length === 0) {
      return { sharedPlaces: [], total: 0 };
    }

    // Get place details with memories
    const places = await this.prisma.discoveredPlace.findMany({
      where: { id: { in: uniqueSharedIds } },
      include: {
        memories: {
          where: {
            userId: { in: [userId, partnerId] },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            note: true,
            photoUrl: true,
            userId: true,
            createdAt: true,
          },
        },
        checkIns: {
          where: {
            userId: { in: [userId, partnerId] },
          },
          select: { userId: true, checkedInAt: true },
        },
      },
    });

    interface CheckInRecord { userId: string; checkedInAt: Date }
    interface PlaceWithRelations {
      id: string;
      name: string;
      address: string | null;
      latitude: number;
      longitude: number;
      checkIns: CheckInRecord[];
      memories: Array<{ id: string; note: string | null; photoUrl: string | null; userId: string; createdAt: Date }>;
    }

    const sharedPlaces = (places as PlaceWithRelations[]).map((place) => ({
      placeId: place.id,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      myVisits: place.checkIns.filter((c: CheckInRecord) => c.userId === userId).length,
      partnerVisits: place.checkIns.filter((c: CheckInRecord) => c.userId === partnerId).length,
      lastVisited: place.checkIns
        .map((c: CheckInRecord) => c.checkedInAt)
        .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0],
      memories: place.memories,
    }));

    // Sort by most recently visited
    sharedPlaces.sort((a, b) => {
      const dateA = a.lastVisited?.getTime() ?? 0;
      const dateB = b.lastVisited?.getTime() ?? 0;
      return dateB - dateA;
    });

    return {
      sharedPlaces,
      total: sharedPlaces.length,
    };
  }

  /**
   * Add a memory (text + optional photo) to a place.
   */
  async addMemory(userId: string, dto: AddMemoryDto) {
    // Verify the place exists
    const place = await this.prisma.discoveredPlace.findUnique({
      where: { id: dto.placeId },
    });

    if (!place) {
      throw new NotFoundException('Mekan bulunamadı');
    }

    // Verify user has checked in to this place
    const hasCheckIn = await this.prisma.placeCheckIn.findFirst({
      where: { placeId: dto.placeId, userId },
    });

    if (!hasCheckIn) {
      throw new BadRequestException(
        'Anı eklemek için önce bu mekana check-in yapmalısınız',
      );
    }

    const memory = await this.prisma.placeMemory.create({
      data: {
        placeId: dto.placeId,
        userId,
        note: dto.text,
        photoUrl: dto.photoUrl,
      },
    });

    return {
      memoryId: memory.id,
      placeId: memory.placeId,
      text: memory.note,
      photoUrl: memory.photoUrl,
      createdAt: memory.createdAt,
    };
  }

  /**
   * Get a timeline of place memories for a relationship.
   * Combines both users' memories sorted by date descending.
   */
  async getMemoriesTimeline(userId: string, partnerId: string) {
    await this.verifyPartnerAccess(userId, partnerId);

    const memories = await this.prisma.placeMemory.findMany({
      where: {
        userId: { in: [userId, partnerId] },
      },
      include: {
        place: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            profile: {
              select: { firstName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      timeline: memories.map((m) => ({
        id: m.id,
        placeName: m.place.name,
        placeId: m.place.id,
        note: m.note,
        photoUrl: m.photoUrl,
        addedBy: m.user.profile?.firstName ?? 'Bilinmeyen',
        createdAt: m.createdAt,
      })),
      total: memories.length,
    };
  }

  /**
   * Get user's check-in history.
   */
  async getMyCheckIns(userId: string) {
    const checkIns = await this.prisma.placeCheckIn.findMany({
      where: { userId },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            category: true,
          },
        },
      },
      orderBy: { checkedInAt: 'desc' },
      take: 50,
    });

    return {
      checkIns: checkIns.map((ci) => ({
        id: ci.id,
        place: ci.place,
        checkedInAt: ci.checkedInAt,
      })),
      total: checkIns.length,
    };
  }
}
