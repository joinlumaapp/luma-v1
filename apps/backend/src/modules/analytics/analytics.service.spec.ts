import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  analyticsEvent: {
    createMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  match: { count: jest.fn() },
  harmonySession: { count: jest.fn() },
  userProfile: { count: jest.fn() },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===============================================================
  // trackEventBatch()
  // ===============================================================

  describe('trackEventBatch()', () => {
    it('should ingest events and return received count', async () => {
      mockPrisma.analyticsEvent.createMany.mockResolvedValue({ count: 2 });

      const batch = {
        events: [
          { event: 'screen_view', properties: { screen: 'home' } as Record<string, string | number | boolean | null>, timestamp: Date.now() },
          { event: 'button_tap', properties: { button: 'like' } as Record<string, string | number | boolean | null>, timestamp: Date.now() },
        ],
        sessionId: 'session-1',
        platform: 'ios' as const,
        appVersion: '1.0.0',
      };

      const result = await service.trackEventBatch('user-1', batch);

      expect(result.received).toBe(2);
      expect(mockPrisma.analyticsEvent.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-1',
            event: 'screen_view',
            sessionId: 'session-1',
            platform: 'ios',
          }),
        ]),
      });
    });

    it('should handle empty events array', async () => {
      mockPrisma.analyticsEvent.createMany.mockResolvedValue({ count: 0 });

      const batch = {
        events: [] as Array<{ event: string; properties: Record<string, string | number | boolean | null>; timestamp: number }>,
        sessionId: 'session-1',
        platform: 'android' as const,
        appVersion: '1.0.0',
      };

      const result = await service.trackEventBatch('user-1', batch);

      expect(result.received).toBe(0);
    });

    it('should gracefully handle createMany failure', async () => {
      mockPrisma.analyticsEvent.createMany.mockRejectedValue(
        new Error('Table does not exist'),
      );

      const batch = {
        events: [
          { event: 'test', properties: {} as Record<string, string | number | boolean | null>, timestamp: Date.now() },
        ],
        sessionId: 'session-1',
        platform: 'ios' as const,
        appVersion: '1.0.0',
      };

      // Should not throw — gracefully handles error
      const result = await service.trackEventBatch('user-1', batch);

      expect(result.received).toBe(1);
    });
  });

  // ===============================================================
  // trackEvent()
  // ===============================================================

  describe('trackEvent()', () => {
    it('should create a server-side event', async () => {
      mockPrisma.analyticsEvent.create.mockResolvedValue({});

      await service.trackEvent('user-1', 'match_created', { matchId: 'm1' });

      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          event: 'match_created',
          sessionId: 'server',
          platform: 'server',
          appVersion: 'backend',
        }),
      });
    });

    it('should handle missing properties', async () => {
      mockPrisma.analyticsEvent.create.mockResolvedValue({});

      await service.trackEvent('user-1', 'signup_completed');

      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: 'signup_completed',
          properties: {},
        }),
      });
    });

    it('should gracefully handle create failure', async () => {
      mockPrisma.analyticsEvent.create.mockRejectedValue(
        new Error('DB error'),
      );

      // Should not throw
      await expect(
        service.trackEvent('user-1', 'test_event'),
      ).resolves.toBeUndefined();
    });
  });

  // ===============================================================
  // getDashboard()
  // ===============================================================

  describe('getDashboard()', () => {
    beforeEach(() => {
      // Default mocks for all parallel queries
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);
      mockPrisma.analyticsEvent.count.mockResolvedValue(0);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.match.count.mockResolvedValue(0);
      mockPrisma.harmonySession.count.mockResolvedValue(0);
    });

    it('should return dashboard metrics with day period', async () => {
      const result = await service.getDashboard('day');

      expect(result.period).toBe('day');
      expect(result.generatedAt).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.packageDistribution).toBeDefined();
    });

    it('should default to day period', async () => {
      const result = await service.getDashboard();

      expect(result.period).toBe('day');
    });

    it('should return correct package distribution', async () => {
      mockPrisma.user.count
        .mockImplementation((args: Record<string, unknown>) => {
          const where = args?.where as Record<string, string> | undefined;
          if (where?.packageTier === 'FREE') return Promise.resolve(100);
          if (where?.packageTier === 'GOLD') return Promise.resolve(50);
          if (where?.packageTier === 'PRO') return Promise.resolve(20);
          if (where?.packageTier === 'RESERVED') return Promise.resolve(5);
          if (where?.isSelfieVerified) return Promise.resolve(30);
          return Promise.resolve(175);
        });

      const result = await service.getDashboard('day');

      expect(result.packageDistribution).toBeDefined();
    });

    it('should handle week period', async () => {
      const result = await service.getDashboard('week');

      expect(result.period).toBe('week');
    });

    it('should handle month period', async () => {
      const result = await service.getDashboard('month');

      expect(result.period).toBe('month');
    });
  });

  // ===============================================================
  // getRetentionCohorts()
  // ===============================================================

  describe('getRetentionCohorts()', () => {
    it('should return empty cohorts when no users exist', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getRetentionCohorts(2);

      expect(result).toHaveLength(2);
      expect(result[0].cohortSize).toBe(0);
      expect(result[0].day1).toBe(0);
    });

    it('should calculate retention for cohorts with users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1' },
        { id: 'u2' },
      ]);
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([{ userId: 'u1' }]);

      const result = await service.getRetentionCohorts(1);

      expect(result).toHaveLength(1);
      expect(result[0].cohortSize).toBe(2);
    });

    it('should default to 12 cohorts', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getRetentionCohorts();

      expect(result).toHaveLength(12);
    });

    it('should handle user.findMany failure gracefully', async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.getRetentionCohorts(1);

      expect(result).toHaveLength(1);
      expect(result[0].cohortSize).toBe(0);
    });
  });

  // ===============================================================
  // getUserFunnel()
  // ===============================================================

  describe('getUserFunnel()', () => {
    it('should return registration funnel with completed steps', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        { event: 'auth_otp_requested', clientTimestamp: new Date('2025-06-01T00:00:00Z') },
        { event: 'auth_otp_verified', clientTimestamp: new Date('2025-06-01T00:01:00Z') },
      ]);

      const result = await service.getUserFunnel('user-1', 'registration');

      expect(result.funnelName).toBe('registration');
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].completedAt).not.toBeNull();
      expect(result.steps[1].completedAt).not.toBeNull();
      expect(result.steps[2].completedAt).toBeNull();
      expect(result.completionRate).toBe(66.67);
    });

    it('should return 0% completion when no events exist', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getUserFunnel('user-1', 'registration');

      expect(result.completionRate).toBe(0);
      expect(result.steps.every((s) => s.completedAt === null)).toBe(true);
    });

    it('should return 100% completion when all steps completed', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        { event: 'auth_otp_requested', clientTimestamp: new Date() },
        { event: 'auth_otp_verified', clientTimestamp: new Date() },
        { event: 'auth_selfie_completed', clientTimestamp: new Date() },
      ]);

      const result = await service.getUserFunnel('user-1', 'registration');

      expect(result.completionRate).toBe(100);
    });

    it('should handle unknown funnel name by defaulting to registration', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getUserFunnel('user-1', 'unknown_funnel');

      expect(result.funnelName).toBe('unknown_funnel');
      expect(result.steps).toHaveLength(3); // registration steps
    });

    it('should return conversion funnel steps', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getUserFunnel('user-1', 'conversion');

      expect(result.funnelName).toBe('conversion');
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].name).toBe('Payment Viewed');
    });

    it('should return onboarding funnel steps', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getUserFunnel('user-1', 'onboarding');

      expect(result.funnelName).toBe('onboarding');
      expect(result.steps).toHaveLength(2);
    });

    it('should handle analytics event findMany failure gracefully', async () => {
      mockPrisma.analyticsEvent.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.getUserFunnel('user-1', 'registration');

      expect(result.completionRate).toBe(0);
      expect(result.steps).toHaveLength(3);
    });
  });

  // ===============================================================
  // getDAU()
  // ===============================================================

  describe('getDAU()', () => {
    it('should return distinct user count for today', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
      ]);

      const result = await service.getDAU();

      expect(result).toBe(2);
    });

    it('should return distinct user count for a specific date', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        { userId: 'u1' },
      ]);

      const result = await service.getDAU(new Date('2025-06-01'));

      expect(result).toBe(1);
    });

    it('should return 0 when no events exist', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getDAU();

      expect(result).toBe(0);
    });
  });
});
