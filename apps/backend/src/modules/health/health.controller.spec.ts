import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { LumaCacheService } from '../cache/cache.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LumaCacheService, useValue: { get: jest.fn(), set: jest.fn(), isHealthy: jest.fn().mockResolvedValue(true), isRedisConnected: jest.fn().mockReturnValue(true) } },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HealthController>(HealthController);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /health
  // ═══════════════════════════════════════════════════════════════

  describe('check()', () => {
    it('should return healthy status when database is reachable', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.check();

      expect(result.status).toBe('healthy');
      expect(result.services.api).toBe('ok');
      expect(result.services.database).toBe('ok');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded status when database is unreachable', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(
        new Error('Connection refused'),
      );

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.services.api).toBe('ok');
      expect(result.services.database).toBe('error');
    });

    it('should include a valid ISO timestamp', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.check();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should always include version 1.0.0', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.check();

      expect(result.version).toBe('1.0.0');
    });

    it('should execute SELECT 1 query to check database', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      await controller.check();

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /health/ping
  // ═══════════════════════════════════════════════════════════════

  describe('ping()', () => {
    it('should return pong status', () => {
      const result = controller.ping();

      expect(result.status).toBe('pong');
    });

    it('should include a valid ISO timestamp', () => {
      const result = controller.ping();

      const timestamp = new Date(result.timestamp);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should not call database', () => {
      controller.ping();

      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
