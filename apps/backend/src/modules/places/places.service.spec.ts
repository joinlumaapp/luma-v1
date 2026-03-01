import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PlacesService } from './places.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  discoveredPlace: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  relationship: { findFirst: jest.fn() },
  match: { findFirst: jest.fn() },
  placeCheckIn: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
  placeMemory: { create: jest.fn(), findMany: jest.fn() },
  notification: { create: jest.fn() },
};

describe('PlacesService', () => {
  let service: PlacesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlacesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<PlacesService>(PlacesService);
  });

  // ─────────────────────────────────────────────
  // checkIn()
  // ─────────────────────────────────────────────
  describe('checkIn()', () => {
    const baseDto = {
      placeId: 'gp-cafe',
      placeName: 'Cafe Istanbul',
      latitude: 41.0082,
      longitude: 28.9784,
    };

    it('should create a new place and check-in when place does not exist', async () => {
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue(null);
      mockPrisma.discoveredPlace.create.mockResolvedValue({
        id: 'pl1',
        name: 'Cafe Istanbul',
      });
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci1',
        placeId: 'pl1',
        checkedInAt: new Date('2026-01-15T10:00:00Z'),
      });

      const result = await service.checkIn('u1', baseDto);

      expect(result.checkInId).toBe('ci1');
      expect(result.placeId).toBe('pl1');
      expect(result.placeName).toBe('Cafe Istanbul');
      expect(mockPrisma.discoveredPlace.create).toHaveBeenCalledWith({
        data: {
          name: 'Cafe Istanbul',
          latitude: 41.0082,
          longitude: 28.9784,
        },
      });
    });

    it('should reuse existing place when coordinates match within threshold', async () => {
      const existingPlace = { id: 'pl-existing', name: 'Cafe Istanbul' };
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue(existingPlace);
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci2',
        placeId: 'pl-existing',
        checkedInAt: new Date(),
      });

      const result = await service.checkIn('u1', baseDto);

      expect(result.placeId).toBe('pl-existing');
      expect(mockPrisma.discoveredPlace.create).not.toHaveBeenCalled();
    });

    it('should search for places using lat/lng tolerance of 0.001', async () => {
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue(null);
      mockPrisma.discoveredPlace.create.mockResolvedValue({ id: 'pl1', name: 'Cafe Istanbul' });
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci1',
        placeId: 'pl1',
        checkedInAt: new Date(),
      });

      await service.checkIn('u1', baseDto);

      expect(mockPrisma.discoveredPlace.findFirst).toHaveBeenCalledWith({
        where: {
          latitude: { gte: 41.0082 - 0.001, lte: 41.0082 + 0.001 },
          longitude: { gte: 28.9784 - 0.001, lte: 28.9784 + 0.001 },
          name: 'Cafe Istanbul',
        },
      });
    });

    it('should link check-in to active relationship when user is userA', async () => {
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue({ id: 'pl1', name: 'Cafe' });
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'rel1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci1',
        placeId: 'pl1',
        checkedInAt: new Date(),
      });
      mockPrisma.notification.create.mockResolvedValue({});

      await service.checkIn('u1', baseDto);

      expect(mockPrisma.placeCheckIn.create).toHaveBeenCalledWith({
        data: {
          placeId: 'pl1',
          userId: 'u1',
          relationshipId: 'rel1',
        },
      });
    });

    it('should set relationshipId to undefined when user has no active relationship', async () => {
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue({ id: 'pl1', name: 'Cafe' });
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci1',
        placeId: 'pl1',
        checkedInAt: new Date(),
      });

      await service.checkIn('u1', baseDto);

      expect(mockPrisma.placeCheckIn.create).toHaveBeenCalledWith({
        data: {
          placeId: 'pl1',
          userId: 'u1',
          relationshipId: undefined,
        },
      });
    });

    it('should notify the partner (userB) when user is userA in a relationship', async () => {
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue({ id: 'pl1', name: 'Cafe' });
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'rel1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci1',
        placeId: 'pl1',
        checkedInAt: new Date(),
      });
      mockPrisma.notification.create.mockResolvedValue({});

      await service.checkIn('u1', { ...baseDto, placeName: 'Cafe' });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'u2',
          type: 'SYSTEM',
          title: 'Yeni Check-in!',
          body: 'Partneriniz "Cafe" mekanına check-in yaptı.',
          data: { placeId: 'pl1', checkInId: 'ci1' },
        },
      });
    });

    it('should notify the partner (userA) when user is userB in a relationship', async () => {
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue({ id: 'pl1', name: 'Cafe' });
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'rel1',
        userAId: 'u1',
        userBId: 'u2',
        status: 'ACTIVE',
      });
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci1',
        placeId: 'pl1',
        checkedInAt: new Date(),
      });
      mockPrisma.notification.create.mockResolvedValue({});

      // u2 is userB, so partner should be u1 (userA)
      await service.checkIn('u2', { ...baseDto, placeName: 'Cafe' });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1' }),
        }),
      );
    });

    it('should NOT send a notification when user has no relationship', async () => {
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue({ id: 'pl1', name: 'Cafe' });
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci1',
        placeId: 'pl1',
        checkedInAt: new Date(),
      });

      await service.checkIn('u1', baseDto);

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should create a memory automatically when dto.note is provided', async () => {
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue({ id: 'pl1', name: 'Cafe' });
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci1',
        placeId: 'pl1',
        checkedInAt: new Date(),
      });
      mockPrisma.placeMemory.create.mockResolvedValue({});

      await service.checkIn('u1', { ...baseDto, note: 'Amazing latte!' });

      expect(mockPrisma.placeMemory.create).toHaveBeenCalledWith({
        data: {
          placeId: 'pl1',
          userId: 'u1',
          note: 'Amazing latte!',
        },
      });
    });

    it('should NOT create a memory when dto.note is absent', async () => {
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue({ id: 'pl1', name: 'Cafe' });
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci1',
        placeId: 'pl1',
        checkedInAt: new Date(),
      });

      await service.checkIn('u1', baseDto);

      expect(mockPrisma.placeMemory.create).not.toHaveBeenCalled();
    });

    it('should return correct shape with checkInId, placeId, placeName, and checkedInAt', async () => {
      const now = new Date('2026-02-20T14:30:00Z');
      mockPrisma.discoveredPlace.findFirst.mockResolvedValue({ id: 'pl5', name: 'Park' });
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.placeCheckIn.create.mockResolvedValue({
        id: 'ci5',
        placeId: 'pl5',
        checkedInAt: now,
      });

      const result = await service.checkIn('u1', { ...baseDto, placeName: 'Park' });

      expect(result).toEqual({
        checkInId: 'ci5',
        placeId: 'pl5',
        placeName: 'Park',
        checkedInAt: now,
      });
    });
  });

  // ─────────────────────────────────────────────
  // getSharedPlaces()
  // ─────────────────────────────────────────────
  describe('getSharedPlaces()', () => {
    // All getSharedPlaces tests need a valid relationship or match
    beforeEach(() => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'rel1', userAId: 'u1', userBId: 'u2', status: 'ACTIVE',
      });
    });

    it('should throw ForbiddenException when users have no relationship or match', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.match.findFirst.mockResolvedValue(null);

      await expect(
        service.getSharedPlaces('u1', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when users have an active match but no relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.match.findFirst.mockResolvedValue({
        id: 'match1', userAId: 'u1', userBId: 'u2', isActive: true,
      });
      mockPrisma.placeCheckIn.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getSharedPlaces('u1', 'u2');
      expect(result.total).toBe(0);
    });

    it('should return empty array when no shared places exist', async () => {
      mockPrisma.placeCheckIn.findMany
        .mockResolvedValueOnce([{ placeId: 'pl1' }])  // user's check-ins
        .mockResolvedValueOnce([{ placeId: 'pl2' }]); // partner's check-ins (different)

      const result = await service.getSharedPlaces('u1', 'u2');

      expect(result.total).toBe(0);
      expect(result.sharedPlaces).toEqual([]);
      // Should NOT query discoveredPlace since there are no shared IDs
      expect(mockPrisma.discoveredPlace.findMany).not.toHaveBeenCalled();
    });

    it('should return empty when user has no check-ins at all', async () => {
      mockPrisma.placeCheckIn.findMany
        .mockResolvedValueOnce([])                      // user has no check-ins
        .mockResolvedValueOnce([{ placeId: 'pl1' }]);   // partner has check-ins

      const result = await service.getSharedPlaces('u1', 'u2');

      expect(result.total).toBe(0);
      expect(result.sharedPlaces).toEqual([]);
    });

    it('should return empty when partner has no check-ins at all', async () => {
      mockPrisma.placeCheckIn.findMany
        .mockResolvedValueOnce([{ placeId: 'pl1' }])  // user has check-ins
        .mockResolvedValueOnce([]);                     // partner has none

      const result = await service.getSharedPlaces('u1', 'u2');

      expect(result.total).toBe(0);
      expect(result.sharedPlaces).toEqual([]);
    });

    it('should return places visited by both users with visit counts', async () => {
      const now = new Date('2026-02-20T12:00:00Z');
      mockPrisma.placeCheckIn.findMany
        .mockResolvedValueOnce([{ placeId: 'pl1' }, { placeId: 'pl2' }]) // user
        .mockResolvedValueOnce([{ placeId: 'pl1' }]);                     // partner (shared: pl1)

      mockPrisma.discoveredPlace.findMany.mockResolvedValue([
        {
          id: 'pl1',
          name: 'Sultanahmet',
          address: 'Fatih, Istanbul',
          latitude: 41.0054,
          longitude: 28.9768,
          memories: [],
          checkIns: [
            { userId: 'u1', checkedInAt: now },
            { userId: 'u1', checkedInAt: new Date('2026-02-18T09:00:00Z') },
            { userId: 'u2', checkedInAt: new Date('2026-02-19T15:00:00Z') },
          ],
        },
      ]);

      const result = await service.getSharedPlaces('u1', 'u2');

      expect(result.total).toBe(1);
      expect(result.sharedPlaces[0].name).toBe('Sultanahmet');
      expect(result.sharedPlaces[0].myVisits).toBe(2);
      expect(result.sharedPlaces[0].partnerVisits).toBe(1);
    });

    it('should sort shared places by most recently visited (descending)', async () => {
      const older = new Date('2026-01-01T10:00:00Z');
      const newer = new Date('2026-02-15T10:00:00Z');

      mockPrisma.placeCheckIn.findMany
        .mockResolvedValueOnce([{ placeId: 'pl1' }, { placeId: 'pl2' }])
        .mockResolvedValueOnce([{ placeId: 'pl1' }, { placeId: 'pl2' }]);

      mockPrisma.discoveredPlace.findMany.mockResolvedValue([
        {
          id: 'pl1',
          name: 'Old Cafe',
          address: null,
          latitude: 41.0,
          longitude: 29.0,
          memories: [],
          checkIns: [{ userId: 'u1', checkedInAt: older }],
        },
        {
          id: 'pl2',
          name: 'New Cafe',
          address: null,
          latitude: 41.1,
          longitude: 29.1,
          memories: [],
          checkIns: [{ userId: 'u2', checkedInAt: newer }],
        },
      ]);

      const result = await service.getSharedPlaces('u1', 'u2');

      expect(result.sharedPlaces[0].name).toBe('New Cafe');
      expect(result.sharedPlaces[1].name).toBe('Old Cafe');
    });

    it('should deduplicate shared place IDs when partner checked in multiple times', async () => {
      mockPrisma.placeCheckIn.findMany
        .mockResolvedValueOnce([{ placeId: 'pl1' }])
        .mockResolvedValueOnce([{ placeId: 'pl1' }, { placeId: 'pl1' }]); // partner checked in twice

      mockPrisma.discoveredPlace.findMany.mockResolvedValue([
        {
          id: 'pl1',
          name: 'Park',
          address: null,
          latitude: 41.0,
          longitude: 29.0,
          memories: [],
          checkIns: [
            { userId: 'u1', checkedInAt: new Date() },
            { userId: 'u2', checkedInAt: new Date() },
          ],
        },
      ]);

      const result = await service.getSharedPlaces('u1', 'u2');

      // Should still be 1 place, not duplicated
      expect(result.total).toBe(1);
    });

    it('should include memories from both users in shared place results', async () => {
      const memoryDate = new Date('2026-02-10T12:00:00Z');
      mockPrisma.placeCheckIn.findMany
        .mockResolvedValueOnce([{ placeId: 'pl1' }])
        .mockResolvedValueOnce([{ placeId: 'pl1' }]);

      mockPrisma.discoveredPlace.findMany.mockResolvedValue([
        {
          id: 'pl1',
          name: 'Beach',
          address: 'Antalya',
          latitude: 36.8,
          longitude: 30.6,
          memories: [
            { id: 'mem1', note: 'Sunset was beautiful', photoUrl: null, userId: 'u1', createdAt: memoryDate },
            { id: 'mem2', note: 'Great swim', photoUrl: 'https://cdn.luma.app/swim.jpg', userId: 'u2', createdAt: memoryDate },
          ],
          checkIns: [
            { userId: 'u1', checkedInAt: new Date() },
            { userId: 'u2', checkedInAt: new Date() },
          ],
        },
      ]);

      const result = await service.getSharedPlaces('u1', 'u2');

      expect(result.sharedPlaces[0].memories).toHaveLength(2);
      expect(result.sharedPlaces[0].memories[0].note).toBe('Sunset was beautiful');
      expect(result.sharedPlaces[0].memories[1].note).toBe('Great swim');
    });

    it('should set lastVisited to the most recent check-in date across both users', async () => {
      const earlier = new Date('2026-02-01T10:00:00Z');
      const latest = new Date('2026-02-20T18:00:00Z');

      mockPrisma.placeCheckIn.findMany
        .mockResolvedValueOnce([{ placeId: 'pl1' }])
        .mockResolvedValueOnce([{ placeId: 'pl1' }]);

      mockPrisma.discoveredPlace.findMany.mockResolvedValue([
        {
          id: 'pl1',
          name: 'Museum',
          address: null,
          latitude: 41.0,
          longitude: 29.0,
          memories: [],
          checkIns: [
            { userId: 'u1', checkedInAt: earlier },
            { userId: 'u2', checkedInAt: latest },
          ],
        },
      ]);

      const result = await service.getSharedPlaces('u1', 'u2');

      expect(result.sharedPlaces[0].lastVisited).toEqual(latest);
    });
  });

  // ─────────────────────────────────────────────
  // addMemory()
  // ─────────────────────────────────────────────
  describe('addMemory()', () => {
    it('should throw NotFoundException when place does not exist', async () => {
      mockPrisma.discoveredPlace.findUnique.mockResolvedValue(null);

      await expect(
        service.addMemory('u1', { placeId: 'nonexistent', text: 'Hello' }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.addMemory('u1', { placeId: 'nonexistent', text: 'Hello' }),
      ).rejects.toThrow('Mekan bulunamadı');
    });

    it('should throw BadRequestException when user has no check-in at the place', async () => {
      mockPrisma.discoveredPlace.findUnique.mockResolvedValue({ id: 'pl1' });
      mockPrisma.placeCheckIn.findFirst.mockResolvedValue(null);

      await expect(
        service.addMemory('u1', { placeId: 'pl1', text: 'Memory text' }),
      ).rejects.toThrow(BadRequestException);

      // Reset mocks for the second assertion
      mockPrisma.discoveredPlace.findUnique.mockResolvedValue({ id: 'pl1' });
      mockPrisma.placeCheckIn.findFirst.mockResolvedValue(null);

      await expect(
        service.addMemory('u1', { placeId: 'pl1', text: 'Memory text' }),
      ).rejects.toThrow('Anı eklemek için önce bu mekana check-in yapmalısınız');
    });

    it('should create a memory with text only (no photo)', async () => {
      const createdAt = new Date('2026-02-20T16:00:00Z');
      mockPrisma.discoveredPlace.findUnique.mockResolvedValue({ id: 'pl1' });
      mockPrisma.placeCheckIn.findFirst.mockResolvedValue({ id: 'ci1' });
      mockPrisma.placeMemory.create.mockResolvedValue({
        id: 'mem1',
        placeId: 'pl1',
        note: 'What a day!',
        photoUrl: null,
        createdAt,
      });

      const result = await service.addMemory('u1', {
        placeId: 'pl1',
        text: 'What a day!',
      });

      expect(result.memoryId).toBe('mem1');
      expect(result.text).toBe('What a day!');
      expect(result.photoUrl).toBeNull();
      expect(result.placeId).toBe('pl1');
      expect(result.createdAt).toEqual(createdAt);
    });

    it('should create a memory with text and photo URL', async () => {
      const createdAt = new Date('2026-02-20T17:00:00Z');
      mockPrisma.discoveredPlace.findUnique.mockResolvedValue({ id: 'pl1' });
      mockPrisma.placeCheckIn.findFirst.mockResolvedValue({ id: 'ci1' });
      mockPrisma.placeMemory.create.mockResolvedValue({
        id: 'mem2',
        placeId: 'pl1',
        note: 'Dinner view',
        photoUrl: 'https://cdn.luma.app/dinner.jpg',
        createdAt,
      });

      const result = await service.addMemory('u1', {
        placeId: 'pl1',
        text: 'Dinner view',
        photoUrl: 'https://cdn.luma.app/dinner.jpg',
      });

      expect(result.memoryId).toBe('mem2');
      expect(result.text).toBe('Dinner view');
      expect(result.photoUrl).toBe('https://cdn.luma.app/dinner.jpg');

      expect(mockPrisma.placeMemory.create).toHaveBeenCalledWith({
        data: {
          placeId: 'pl1',
          userId: 'u1',
          note: 'Dinner view',
          photoUrl: 'https://cdn.luma.app/dinner.jpg',
        },
      });
    });

    it('should pass undefined photoUrl when not provided in dto', async () => {
      mockPrisma.discoveredPlace.findUnique.mockResolvedValue({ id: 'pl1' });
      mockPrisma.placeCheckIn.findFirst.mockResolvedValue({ id: 'ci1' });
      mockPrisma.placeMemory.create.mockResolvedValue({
        id: 'mem3',
        placeId: 'pl1',
        note: 'Nice place',
        photoUrl: undefined,
        createdAt: new Date(),
      });

      await service.addMemory('u1', { placeId: 'pl1', text: 'Nice place' });

      expect(mockPrisma.placeMemory.create).toHaveBeenCalledWith({
        data: {
          placeId: 'pl1',
          userId: 'u1',
          note: 'Nice place',
          photoUrl: undefined,
        },
      });
    });
  });

  // ─────────────────────────────────────────────
  // getMyCheckIns()
  // ─────────────────────────────────────────────
  describe('getMyCheckIns()', () => {
    it('should return user check-in history with place details', async () => {
      const checkedInAt = new Date('2026-02-20T10:00:00Z');
      mockPrisma.placeCheckIn.findMany.mockResolvedValue([
        {
          id: 'ci1',
          checkedInAt,
          place: {
            id: 'pl1',
            name: 'Cafe Istanbul',
            address: 'Beyoglu, Istanbul',
            latitude: 41.03,
            longitude: 28.97,
            category: 'CAFE',
          },
        },
        {
          id: 'ci2',
          checkedInAt: new Date('2026-02-19T14:00:00Z'),
          place: {
            id: 'pl2',
            name: 'Bosphorus Park',
            address: 'Besiktas, Istanbul',
            latitude: 41.04,
            longitude: 29.0,
            category: 'PARK',
          },
        },
      ]);

      const result = await service.getMyCheckIns('u1');

      expect(result.total).toBe(2);
      expect(result.checkIns).toHaveLength(2);
      expect(result.checkIns[0].id).toBe('ci1');
      expect(result.checkIns[0].place.name).toBe('Cafe Istanbul');
      expect(result.checkIns[1].place.category).toBe('PARK');
    });

    it('should return empty list when user has no check-ins', async () => {
      mockPrisma.placeCheckIn.findMany.mockResolvedValue([]);

      const result = await service.getMyCheckIns('u-no-checkins');

      expect(result.total).toBe(0);
      expect(result.checkIns).toEqual([]);
    });

    it('should query with descending order and limit of 50', async () => {
      mockPrisma.placeCheckIn.findMany.mockResolvedValue([]);

      await service.getMyCheckIns('u1');

      expect(mockPrisma.placeCheckIn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1' },
          orderBy: { checkedInAt: 'desc' },
          take: 50,
        }),
      );
    });

    it('should map check-in results to include only id, place, and checkedInAt', async () => {
      const checkedInAt = new Date('2026-02-20T10:00:00Z');
      const placeData = {
        id: 'pl1',
        name: 'Museum',
        address: null,
        latitude: 41.0,
        longitude: 29.0,
        category: null,
      };
      mockPrisma.placeCheckIn.findMany.mockResolvedValue([
        {
          id: 'ci1',
          checkedInAt,
          place: placeData,
          userId: 'u1',           // extra field from DB
          placeId: 'pl1',         // extra field from DB
          relationshipId: 'rel1', // extra field from DB
        },
      ]);

      const result = await service.getMyCheckIns('u1');

      // Should only contain the mapped fields, not raw DB fields
      expect(result.checkIns[0]).toEqual({
        id: 'ci1',
        place: placeData,
        checkedInAt,
      });
      expect((result.checkIns[0] as any).userId).toBeUndefined();
      expect((result.checkIns[0] as any).relationshipId).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────
  // getPopularPlaces()
  // ─────────────────────────────────────────────
  describe('getPopularPlaces()', () => {
    it('should return empty when no places exist', async () => {
      mockPrisma.discoveredPlace.findMany.mockResolvedValue([]);

      const result = await service.getPopularPlaces(41.0082, 28.9784, 25);

      expect(result.places).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.radiusKm).toBe(25);
    });

    it('should filter places within the given radius', async () => {
      mockPrisma.discoveredPlace.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Close Cafe',
          category: 'cafe',
          latitude: 41.01,
          longitude: 28.98,
          checkIns: [{ checkedInAt: new Date() }],
        },
        {
          id: 'p2',
          name: 'Far Away Park',
          category: 'park',
          latitude: 45.0, // very far from Istanbul
          longitude: 35.0,
          checkIns: [{ checkedInAt: new Date() }],
        },
      ]);

      const result = await service.getPopularPlaces(41.0082, 28.9784, 25);

      expect(result.places).toHaveLength(1);
      expect(result.places[0].name).toBe('Close Cafe');
    });

    it('should sort places by total visits descending', async () => {
      mockPrisma.discoveredPlace.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Less Popular',
          category: 'cafe',
          latitude: 41.009,
          longitude: 28.978,
          checkIns: [{ checkedInAt: new Date() }],
        },
        {
          id: 'p2',
          name: 'More Popular',
          category: 'restaurant',
          latitude: 41.008,
          longitude: 28.979,
          checkIns: [
            { checkedInAt: new Date() },
            { checkedInAt: new Date() },
            { checkedInAt: new Date() },
          ],
        },
      ]);

      const result = await service.getPopularPlaces(41.0082, 28.9784, 25);

      expect(result.places[0].name).toBe('More Popular');
      expect(result.places[0].totalVisits).toBe(3);
      expect(result.places[1].name).toBe('Less Popular');
      expect(result.places[1].totalVisits).toBe(1);
    });

    it('should correctly count recent visits within last 30 days', async () => {
      const recentDate = new Date();
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

      mockPrisma.discoveredPlace.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Mixed Cafe',
          category: 'cafe',
          latitude: 41.009,
          longitude: 28.978,
          checkIns: [
            { checkedInAt: recentDate },
            { checkedInAt: recentDate },
            { checkedInAt: oldDate },
          ],
        },
      ]);

      const result = await service.getPopularPlaces(41.0082, 28.9784, 25);

      expect(result.places[0].totalVisits).toBe(3);
      expect(result.places[0].recentVisits).toBe(2);
    });

    it('should not expose personal data, only aggregate counts', async () => {
      mockPrisma.discoveredPlace.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Cafe',
          category: 'cafe',
          latitude: 41.009,
          longitude: 28.978,
          checkIns: [{ checkedInAt: new Date() }],
        },
      ]);

      const result = await service.getPopularPlaces(41.0082, 28.9784, 25);

      const place = result.places[0];
      expect(place).toHaveProperty('id');
      expect(place).toHaveProperty('name');
      expect(place).toHaveProperty('category');
      expect(place).toHaveProperty('latitude');
      expect(place).toHaveProperty('longitude');
      expect(place).toHaveProperty('totalVisits');
      expect(place).toHaveProperty('recentVisits');
      // Should NOT have any user-identifiable data
      expect(place).not.toHaveProperty('checkIns');
      expect(place).not.toHaveProperty('userId');
    });
  });

  // ─────────────────────────────────────────────
  // getMemoriesTimeline()
  // ─────────────────────────────────────────────
  describe('getMemoriesTimeline()', () => {
    beforeEach(() => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'rel1', userAId: 'u1', userBId: 'u2', status: 'ACTIVE',
      });
    });

    it('should throw ForbiddenException when users have no relationship or match', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.match.findFirst.mockResolvedValue(null);

      await expect(
        service.getMemoriesTimeline('u1', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return timeline of memories for both users sorted by date', async () => {
      const date1 = new Date('2026-02-20T12:00:00Z');
      const date2 = new Date('2026-02-18T10:00:00Z');

      mockPrisma.placeMemory.findMany.mockResolvedValue([
        {
          id: 'mem1',
          note: 'Great coffee',
          photoUrl: null,
          createdAt: date1,
          place: { id: 'pl1', name: 'Cafe Istanbul' },
          user: { profile: { firstName: 'Ayse' } },
        },
        {
          id: 'mem2',
          note: 'Beautiful sunset',
          photoUrl: 'https://cdn.luma.app/sunset.jpg',
          createdAt: date2,
          place: { id: 'pl2', name: 'Bebek Sahili' },
          user: { profile: { firstName: 'Mehmet' } },
        },
      ]);

      const result = await service.getMemoriesTimeline('u1', 'u2');

      expect(result.total).toBe(2);
      expect(result.timeline[0].placeName).toBe('Cafe Istanbul');
      expect(result.timeline[0].addedBy).toBe('Ayse');
      expect(result.timeline[1].placeName).toBe('Bebek Sahili');
      expect(result.timeline[1].photoUrl).toBe('https://cdn.luma.app/sunset.jpg');
    });

    it('should return empty timeline when no memories exist', async () => {
      mockPrisma.placeMemory.findMany.mockResolvedValue([]);

      const result = await service.getMemoriesTimeline('u1', 'u2');

      expect(result.total).toBe(0);
      expect(result.timeline).toEqual([]);
    });

    it('should use "Bilinmeyen" when user has no profile firstName', async () => {
      mockPrisma.placeMemory.findMany.mockResolvedValue([
        {
          id: 'mem1',
          note: 'Anonymous note',
          photoUrl: null,
          createdAt: new Date(),
          place: { id: 'pl1', name: 'Park' },
          user: { profile: null },
        },
      ]);

      const result = await service.getMemoriesTimeline('u1', 'u2');

      expect(result.timeline[0].addedBy).toBe('Bilinmeyen');
    });
  });
});
