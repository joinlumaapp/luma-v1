/**
 * LUMA V1 — End-to-End API Tests
 *
 * Tests the full HTTP-level behavior of the NestJS backend:
 * - Auth flow: register -> verify-sms -> authenticated requests -> logout
 * - Public endpoints accessible without auth
 * - Protected endpoints return 401 without valid token
 * - Response shapes match expected API contract
 *
 * Uses a mock PrismaService with in-memory data stores so no real
 * database connection is needed.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// ─── In-Memory Data Stores ───────────────────────────────────────
// Simulates the Prisma database with Maps keyed by ID

interface MockUser {
  id: string;
  phone: string;
  phoneCountryCode: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  isSmsVerified: boolean;
  isSelfieVerified: boolean;
  isFullyVerified: boolean;
  packageTier: string;
  goldBalance: number;
  profile: MockUserProfile | null;
  photos: MockUserPhoto[];
  badges: MockUserBadge[];
  subscriptions: MockSubscription[];
}

interface MockUserProfile {
  id: string;
  userId: string;
  firstName: string;
  birthDate: Date;
  gender: string;
  bio: string | null;
  intentionTag: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  isComplete: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface MockUserPhoto {
  id: string;
  userId: string;
  url: string;
  thumbnailUrl: string | null;
  order: number;
  isPrimary: boolean;
  isApproved: boolean;
}

interface MockVerification {
  id: string;
  userId: string;
  type: string;
  status: string;
  otpCode: string | null;
  otpExpiresAt: Date | null;
  otpAttempts: number;
  selfieUrl: string | null;
  livenessScore: number | null;
  faceMatchScore: number | null;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

interface MockSession {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  deviceId: string | null;
  deviceType: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
}

interface MockBadgeDefinition {
  id: string;
  key: string;
  nameEn: string;
  nameTr: string;
  descriptionEn: string;
  descriptionTr: string;
  iconUrl: string | null;
  criteria: unknown;
  goldReward: number;
  isActive: boolean;
  createdAt: Date;
}

interface MockUserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  badge: MockBadgeDefinition;
}

interface MockSubscription {
  id: string;
  userId: string;
  packageTier: string;
  platform: string;
  productId: string;
  purchaseToken: string | null;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  autoRenew: boolean;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── UUID generator ──────────────────────────────────────────────

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── In-Memory Stores ────────────────────────────────────────────

const users = new Map<string, MockUser>();
const verifications = new Map<string, MockVerification>();
const sessions = new Map<string, MockSession>();
const badgeDefinitions = new Map<string, MockBadgeDefinition>();
const userBadges = new Map<string, MockUserBadge>();

// Indexes for quick lookup
const usersByPhone = new Map<string, MockUser>();
const sessionsByRefreshToken = new Map<string, MockSession>();

function resetStores(): void {
  users.clear();
  verifications.clear();
  sessions.clear();
  badgeDefinitions.clear();
  userBadges.clear();
  usersByPhone.clear();
  sessionsByRefreshToken.clear();

  // Seed badge definitions (8 badges per project spec)
  const badges: Omit<MockBadgeDefinition, 'id' | 'createdAt'>[] = [
    {
      key: 'verified_identity',
      nameEn: 'Verified',
      nameTr: 'Dogrulanmis',
      descriptionEn: 'Identity verified via selfie',
      descriptionTr: 'Selfie ile kimlik dogrulandi',
      iconUrl: null,
      criteria: { type: 'selfie_verification', count: 1 },
      goldReward: 10,
      isActive: true,
    },
    {
      key: 'first_spark',
      nameEn: 'First Spark',
      nameTr: 'Ilk Kivilcim',
      descriptionEn: 'Got your first match',
      descriptionTr: 'Ilk eslesmenizi yaptin',
      iconUrl: null,
      criteria: { type: 'match_count', count: 1 },
      goldReward: 5,
      isActive: true,
    },
    {
      key: 'social_butterfly',
      nameEn: 'Social Butterfly',
      nameTr: 'Sosyal Kelebek',
      descriptionEn: 'Got 10 matches',
      descriptionTr: '10 eslesme yaptin',
      iconUrl: null,
      criteria: { type: 'match_count', count: 10 },
      goldReward: 25,
      isActive: true,
    },
    {
      key: 'question_guru',
      nameEn: 'Question Guru',
      nameTr: 'Soru Gurusu',
      descriptionEn: 'Answered all 20 core questions',
      descriptionTr: '20 temel soruyu cevapladin',
      iconUrl: null,
      criteria: { type: 'answer_count', count: 20 },
      goldReward: 15,
      isActive: true,
    },
    {
      key: 'deep_diver',
      nameEn: 'Deep Diver',
      nameTr: 'Derin Dalici',
      descriptionEn: 'Answered all 45 questions',
      descriptionTr: '45 sorunun hepsini cevapladin',
      iconUrl: null,
      criteria: { type: 'answer_count', count: 45 },
      goldReward: 50,
      isActive: true,
    },
    {
      key: 'super_compatible',
      nameEn: 'Super Compatible',
      nameTr: 'Super Uyumlu',
      descriptionEn: 'Found a Super Compatible match',
      descriptionTr: 'Super Uyumlu bir esleme buldun',
      iconUrl: null,
      criteria: { type: 'match_count', count: 1 },
      goldReward: 30,
      isActive: true,
    },
  ];

  for (const badge of badges) {
    const id = uuid();
    const def: MockBadgeDefinition = { id, createdAt: new Date(), ...badge };
    badgeDefinitions.set(id, def);
  }
}

// ─── Build Mock PrismaService ────────────────────────────────────
// This mock replaces the real PrismaService (which extends PrismaClient)
// with an object that implements only the Prisma methods actually called
// by the services under test.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockPrismaService(): Record<string, any> {
  return {
    // lifecycle methods (no-op in tests)
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),

    // $transaction: execute the callback with `this` as the transactional client
    $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      // Pass the same mock as the transaction client
      return fn(createMockPrismaService());
    }),

    // ── User model ──────────────────────────────────────────────
    user: {
      findUnique: jest.fn().mockImplementation(async (args: {
        where: { id?: string; phone?: string };
        include?: Record<string, unknown>;
        select?: Record<string, unknown>;
      }) => {
        let user: MockUser | undefined;

        if (args.where.id) {
          user = users.get(args.where.id);
        } else if (args.where.phone) {
          user = usersByPhone.get(args.where.phone);
        }

        if (!user) return null;

        // Handle select (return only selected fields)
        if (args.select) {
          const result: Record<string, unknown> = {};
          for (const key of Object.keys(args.select)) {
            if (args.select[key]) {
              result[key] = (user as unknown as Record<string, unknown>)[key];
            }
          }
          return result;
        }

        // Handle include (add related data)
        if (args.include) {
          const result: Record<string, unknown> = { ...user };

          if (args.include.profile) {
            result.profile = user.profile;
          }
          if (args.include.photos) {
            result.photos = user.photos || [];
          }
          if (args.include.badges) {
            const ub = [...userBadges.values()].filter((b) => b.userId === user!.id);
            result.badges = ub;
          }
          if (args.include.subscriptions) {
            result.subscriptions = user.subscriptions || [];
          }

          return result;
        }

        return { ...user };
      }),

      create: jest.fn().mockImplementation(async (args: {
        data: { phone: string; phoneCountryCode: string };
      }) => {
        const id = uuid();
        const now = new Date();
        const newUser: MockUser = {
          id,
          phone: args.data.phone,
          phoneCountryCode: args.data.phoneCountryCode,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          isActive: true,
          isSmsVerified: false,
          isSelfieVerified: false,
          isFullyVerified: false,
          packageTier: 'FREE',
          goldBalance: 0,
          profile: null,
          photos: [],
          badges: [],
          subscriptions: [],
        };
        users.set(id, newUser);
        usersByPhone.set(newUser.phone, newUser);
        return newUser;
      }),

      update: jest.fn().mockImplementation(async (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const user = users.get(args.where.id);
        if (!user) return null;

        const updated = { ...user, ...args.data, updatedAt: new Date() } as MockUser;
        users.set(args.where.id, updated);

        // Update phone index if phone changed
        if (args.data.phone && args.data.phone !== user.phone) {
          usersByPhone.delete(user.phone);
          usersByPhone.set(args.data.phone as string, updated);
        } else {
          usersByPhone.set(updated.phone, updated);
        }

        return updated;
      }),
    },

    // ── UserVerification model ──────────────────────────────────
    userVerification: {
      create: jest.fn().mockImplementation(async (args: {
        data: {
          userId: string;
          type: string;
          otpCode?: string;
          otpExpiresAt?: Date;
          otpAttempts?: number;
          status?: string;
          selfieUrl?: string;
          livenessScore?: number;
          faceMatchScore?: number;
          verifiedAt?: Date;
          rejectionReason?: string;
        };
      }) => {
        const id = uuid();
        const v: MockVerification = {
          id,
          userId: args.data.userId,
          type: args.data.type,
          status: args.data.status || 'PENDING',
          otpCode: args.data.otpCode || null,
          otpExpiresAt: args.data.otpExpiresAt || null,
          otpAttempts: args.data.otpAttempts ?? 0,
          selfieUrl: args.data.selfieUrl || null,
          livenessScore: args.data.livenessScore || null,
          faceMatchScore: args.data.faceMatchScore || null,
          rejectionReason: args.data.rejectionReason || null,
          verifiedAt: args.data.verifiedAt || null,
          createdAt: new Date(),
        };
        verifications.set(id, v);
        return v;
      }),

      findFirst: jest.fn().mockImplementation(async (args: {
        where: { userId: string; type: string; status: string };
        orderBy?: Record<string, string>;
      }) => {
        const matches = [...verifications.values()].filter(
          (v) =>
            v.userId === args.where.userId &&
            v.type === args.where.type &&
            v.status === args.where.status,
        );
        if (matches.length === 0) return null;

        // Sort by createdAt descending
        matches.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        return matches[0];
      }),

      update: jest.fn().mockImplementation(async (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const v = verifications.get(args.where.id);
        if (!v) return null;
        const updated = { ...v, ...args.data } as MockVerification;
        verifications.set(args.where.id, updated);
        return updated;
      }),

      updateMany: jest.fn().mockImplementation(async (args: {
        where: { userId: string; type: string; status: string };
        data: Record<string, unknown>;
      }) => {
        let count = 0;
        for (const [id, v] of verifications.entries()) {
          if (
            v.userId === args.where.userId &&
            v.type === args.where.type &&
            v.status === args.where.status
          ) {
            verifications.set(id, { ...v, ...args.data } as MockVerification);
            count++;
          }
        }
        return { count };
      }),
    },

    // ── UserSession model ───────────────────────────────────────
    userSession: {
      create: jest.fn().mockImplementation(async (args: {
        data: {
          userId: string;
          accessToken: string;
          refreshToken: string;
          expiresAt: Date;
        };
      }) => {
        const id = uuid();
        const session: MockSession = {
          id,
          userId: args.data.userId,
          accessToken: args.data.accessToken,
          refreshToken: args.data.refreshToken,
          deviceId: null,
          deviceType: null,
          ipAddress: null,
          expiresAt: args.data.expiresAt,
          createdAt: new Date(),
          isRevoked: false,
        };
        sessions.set(id, session);
        sessionsByRefreshToken.set(session.refreshToken, session);
        return session;
      }),

      findUnique: jest.fn().mockImplementation(async (args: {
        where: { id?: string; refreshToken?: string };
      }) => {
        if (args.where.id) {
          return sessions.get(args.where.id) || null;
        }
        if (args.where.refreshToken) {
          return sessionsByRefreshToken.get(args.where.refreshToken) || null;
        }
        return null;
      }),

      update: jest.fn().mockImplementation(async (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const s = sessions.get(args.where.id);
        if (!s) return null;
        const updated = { ...s, ...args.data } as MockSession;
        sessions.set(args.where.id, updated);
        sessionsByRefreshToken.set(updated.refreshToken, updated);
        return updated;
      }),

      updateMany: jest.fn().mockImplementation(async (args: {
        where: { userId: string; isRevoked?: boolean };
        data: Record<string, unknown>;
      }) => {
        let count = 0;
        for (const [id, s] of sessions.entries()) {
          const matchesUserId = s.userId === args.where.userId;
          const matchesRevoked =
            args.where.isRevoked === undefined ||
            s.isRevoked === args.where.isRevoked;

          if (matchesUserId && matchesRevoked) {
            sessions.set(id, { ...s, ...args.data } as MockSession);
            count++;
          }
        }
        return { count };
      }),
    },

    // ── UserProfile model ───────────────────────────────────────
    userProfile: {
      findUnique: jest.fn().mockImplementation(async (args: {
        where: { userId?: string };
      }) => {
        if (!args.where.userId) return null;
        const user = users.get(args.where.userId);
        return user?.profile || null;
      }),

      findMany: jest.fn().mockResolvedValue([]),

      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },

    // ── UserPhoto model ─────────────────────────────────────────
    userPhoto: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },

    // ── BadgeDefinition model ───────────────────────────────────
    badgeDefinition: {
      findMany: jest.fn().mockImplementation(async (args?: {
        where?: { isActive?: boolean };
        orderBy?: Record<string, string>;
        select?: Record<string, boolean>;
      }) => {
        let results = [...badgeDefinitions.values()];

        if (args?.where?.isActive !== undefined) {
          results = results.filter((b) => b.isActive === args.where!.isActive);
        }

        // Sort by createdAt ascending (default)
        results.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );

        // Apply select if provided
        if (args?.select) {
          return results.map((b) => {
            const obj: Record<string, unknown> = {};
            for (const key of Object.keys(args.select!)) {
              if (args.select![key]) {
                obj[key] = (b as unknown as Record<string, unknown>)[key];
              }
            }
            return obj;
          });
        }

        return results;
      }),

      findUnique: jest.fn().mockImplementation(async (args: {
        where: { key?: string; id?: string };
      }) => {
        if (args.where.key) {
          return (
            [...badgeDefinitions.values()].find(
              (b) => b.key === args.where.key,
            ) || null
          );
        }
        if (args.where.id) {
          return badgeDefinitions.get(args.where.id) || null;
        }
        return null;
      }),
    },

    // ── UserBadge model ─────────────────────────────────────────
    userBadge: {
      findMany: jest.fn().mockImplementation(async (args: {
        where: { userId: string };
        include?: { badge?: Record<string, unknown> | boolean };
        orderBy?: Record<string, string>;
      }) => {
        const results = [...userBadges.values()].filter(
          (ub) => ub.userId === args.where.userId,
        );
        return results;
      }),

      findUnique: jest.fn().mockImplementation(async (args: {
        where: { userId_badgeId?: { userId: string; badgeId: string } };
      }) => {
        if (args.where.userId_badgeId) {
          return (
            [...userBadges.values()].find(
              (ub) =>
                ub.userId === args.where.userId_badgeId!.userId &&
                ub.badgeId === args.where.userId_badgeId!.badgeId,
            ) || null
          );
        }
        return null;
      }),

      upsert: jest.fn().mockImplementation(async (args: {
        where: { userId_badgeId: { userId: string; badgeId: string } };
        create: { userId: string; badgeId: string };
        update: Record<string, unknown>;
      }) => {
        const existing = [...userBadges.values()].find(
          (ub) =>
            ub.userId === args.where.userId_badgeId.userId &&
            ub.badgeId === args.where.userId_badgeId.badgeId,
        );
        if (existing) return existing;

        const id = uuid();
        const badge = badgeDefinitions.get(args.create.badgeId);
        const ub: MockUserBadge = {
          id,
          userId: args.create.userId,
          badgeId: args.create.badgeId,
          earnedAt: new Date(),
          badge: badge!,
        };
        userBadges.set(id, ub);
        return ub;
      }),

      create: jest.fn().mockImplementation(async (args: {
        data: { userId: string; badgeId: string };
      }) => {
        const id = uuid();
        const badge = badgeDefinitions.get(args.data.badgeId);
        const ub: MockUserBadge = {
          id,
          userId: args.data.userId,
          badgeId: args.data.badgeId,
          earnedAt: new Date(),
          badge: badge!,
        };
        userBadges.set(id, ub);
        return ub;
      }),
    },

    // ── Subscription model ──────────────────────────────────────
    subscription: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (args: {
        data: Record<string, unknown>;
      }) => {
        return { id: uuid(), ...args.data, createdAt: new Date(), updatedAt: new Date() };
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },

    // ── Swipe model ─────────────────────────────────────────────
    swipe: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (args: {
        data: Record<string, unknown>;
      }) => {
        return { id: uuid(), ...args.data, createdAt: new Date() };
      }),
    },

    // ── Block model ─────────────────────────────────────────────
    block: {
      findMany: jest.fn().mockResolvedValue([]),
    },

    // ── CompatibilityScore model ────────────────────────────────
    compatibilityScore: {
      findUnique: jest.fn().mockResolvedValue(null),
    },

    // ── DailySwipeCount model ───────────────────────────────────
    dailySwipeCount: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ count: 0 }),
    },

    // ── Match model ─────────────────────────────────────────────
    match: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async (args: {
        data: Record<string, unknown>;
      }) => {
        return { id: uuid(), ...args.data, createdAt: new Date() };
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },

    // ── UserAnswer model ────────────────────────────────────────
    userAnswer: {
      count: jest.fn().mockResolvedValue(0),
    },

    // ── Notification model ──────────────────────────────────────
    notification: {
      create: jest.fn().mockResolvedValue({ id: uuid() }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },

    // ── GoldTransaction model ───────────────────────────────────
    goldTransaction: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: uuid() }),
    },

    // ── IapReceipt model ────────────────────────────────────────
    iapReceipt: {
      create: jest.fn().mockResolvedValue({ id: uuid() }),
    },

    // ── DeviceToken model ───────────────────────────────────────
    deviceToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════

describe('LUMA V1 API (E2E)', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  // Phone number used throughout the auth flow tests
  const TEST_PHONE = '+905551234567';
  const TEST_COUNTRY_CODE = 'TR';

  // Will be populated during the auth flow tests
  let capturedOtpCode: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    resetStores();
    mockPrisma = createMockPrismaService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();

    // Replicate the same setup as main.ts
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────
  // SECTION 1: Auth Flow — Full Registration to Logout Cycle
  // ─────────────────────────────────────────────────────────────────

  describe('Auth Flow', () => {
    it('POST /api/v1/auth/register — should register a new user and return success message', async () => {
      // Spy on the verification creation to capture the OTP code
      const createSpy = mockPrisma.userVerification.create as jest.Mock;
      const originalImpl = createSpy.getMockImplementation();

      createSpy.mockImplementation(async (args: { data: { otpCode?: string; [k: string]: unknown } }) => {
        // Capture the OTP code for later use in verify-sms
        if (args.data.otpCode) {
          capturedOtpCode = args.data.otpCode;
        }
        // Call original implementation
        if (originalImpl) {
          return originalImpl(args);
        }
        return { id: uuid(), ...args.data };
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: TEST_PHONE,
          countryCode: TEST_COUNTRY_CODE,
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('isNewUser');
      expect(response.body.isNewUser).toBe(true);
      expect(response.body.message).toBeTruthy();
      expect(typeof response.body.message).toBe('string');

      // Ensure OTP was captured
      expect(capturedOtpCode).toBeDefined();
      expect(capturedOtpCode.length).toBe(6);
    });

    it('POST /api/v1/auth/register — should return isNewUser=false for existing user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: TEST_PHONE,
          countryCode: TEST_COUNTRY_CODE,
        })
        .expect(201);

      expect(response.body.isNewUser).toBe(false);
    });

    it('POST /api/v1/auth/verify-sms — should verify OTP and return tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({
          phone: TEST_PHONE,
          code: capturedOtpCode,
        })
        .expect(200);

      expect(response.body).toHaveProperty('verified', true);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');

      // Save tokens for subsequent requests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('GET /api/v1/users/me — should return current user with Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('phone', TEST_PHONE);
      expect(response.body).toHaveProperty('isSmsVerified');
      expect(response.body).toHaveProperty('packageTier');
      expect(response.body).toHaveProperty('age');
      expect(response.body).toHaveProperty('profileCompletion');
      expect(typeof response.body.profileCompletion).toBe('number');
    });

    it('POST /api/v1/auth/logout — should succeed with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // SECTION 2: Protected Endpoints — 401 Without Auth
  // ─────────────────────────────────────────────────────────────────

  describe('Protected Endpoints — Require Auth', () => {
    it('GET /api/v1/users/me — should return 401 without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('GET /api/v1/discovery/feed — should return 401 without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/discovery/feed')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('POST /api/v1/discovery/swipe — should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/discovery/swipe')
        .send({ targetUserId: uuid(), direction: 'like' })
        .expect(401);
    });

    it('GET /api/v1/badges — should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/badges')
        .expect(401);
    });

    it('GET /api/v1/badges/me — should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/badges/me')
        .expect(401);
    });

    it('POST /api/v1/auth/logout — should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    it('POST /api/v1/auth/verify-selfie — should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-selfie')
        .send({ selfieImage: 'base64data' })
        .expect(401);
    });

    it('DELETE /api/v1/auth/delete-account — should return 401 without token', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/auth/delete-account')
        .expect(401);
    });

    it('POST /api/v1/payments/subscribe — should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/subscribe')
        .send({ packageTier: 'gold', platform: 'apple', receipt: 'test' })
        .expect(401);
    });

    it('GET /api/v1/payments/gold/balance — should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments/gold/balance')
        .expect(401);
    });

    it('GET /api/v1/users/me — should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // SECTION 3: Public Endpoints — No Auth Required
  // ─────────────────────────────────────────────────────────────────

  describe('Public Endpoints — No Auth Required', () => {
    it('GET /api/v1/payments/packages — should return 4 packages', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/packages')
        .expect(200);

      expect(response.body).toHaveProperty('packages');
      expect(response.body).toHaveProperty('goldPacks');
      expect(Array.isArray(response.body.packages)).toBe(true);
      expect(response.body.packages).toHaveLength(4);

      // Verify LOCKED 4 package tiers
      const tiers = response.body.packages.map(
        (p: { tier: string }) => p.tier,
      );
      expect(tiers).toContain('FREE');
      expect(tiers).toContain('GOLD');
      expect(tiers).toContain('PRO');
      expect(tiers).toContain('RESERVED');

      // Verify package shape
      const freePackage = response.body.packages.find(
        (p: { tier: string }) => p.tier === 'FREE',
      );
      expect(freePackage).toHaveProperty('name');
      expect(freePackage).toHaveProperty('nameTr');
      expect(freePackage).toHaveProperty('monthlyPriceUsd');
      expect(freePackage).toHaveProperty('features');
      expect(freePackage.monthlyPriceUsd).toBe(0);
      expect(freePackage.features).toHaveProperty('dailySwipes');
      expect(freePackage.features).toHaveProperty('coreQuestions', 20);
    });

    it('GET /api/v1/payments/packages — each package should have correct structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/packages')
        .expect(200);

      for (const pkg of response.body.packages) {
        expect(pkg).toHaveProperty('tier');
        expect(pkg).toHaveProperty('name');
        expect(pkg).toHaveProperty('nameTr');
        expect(pkg).toHaveProperty('monthlyPriceUsd');
        expect(typeof pkg.monthlyPriceUsd).toBe('number');
        expect(pkg).toHaveProperty('features');

        // Verify feature keys
        const features = pkg.features;
        expect(features).toHaveProperty('dailySwipes');
        expect(features).toHaveProperty('coreQuestions');
        expect(features).toHaveProperty('premiumQuestions');
        expect(features).toHaveProperty('monthlyGold');
        expect(features).toHaveProperty('seeWhoLikesYou');
        expect(features).toHaveProperty('profileBoost');
        expect(features).toHaveProperty('readReceipts');
      }

      // Verify gold packs
      expect(response.body.goldPacks.length).toBeGreaterThan(0);
      for (const pack of response.body.goldPacks) {
        expect(pack).toHaveProperty('id');
        expect(pack).toHaveProperty('amount');
        expect(pack).toHaveProperty('priceUsd');
        expect(pack).toHaveProperty('bonus');
        expect(pack).toHaveProperty('totalGold');
        expect(pack.totalGold).toBe(pack.amount + pack.bonus);
      }
    });

    it('POST /api/v1/auth/register — is a public endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: '+905559999999',
          countryCode: 'TR',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
    });

    it('POST /api/v1/auth/verify-sms — is a public endpoint (returns error for invalid data)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({
          phone: '+905550000000',
          code: '000000',
        });

      // Either 400 (user not found) or another non-401 code
      // The point is it should NOT be 401 (it is public)
      expect(response.status).not.toBe(401);
    });

    it('POST /api/v1/auth/login — is a public endpoint (returns error for unknown phone)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          phone: '+905550000000',
          code: '000000',
        });

      // Should not be 401 (it is a public endpoint)
      expect(response.status).not.toBe(401);
    });

    it('POST /api/v1/auth/refresh-token — is a public endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'invalid-token',
        });

      // Returns 401 because of invalid token, not because of missing auth
      // The key distinction is that this endpoint does not require Bearer auth
      expect(response.status).toBe(401);
      expect(response.body.message).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // SECTION 4: Input Validation — DTO Validation via ValidationPipe
  // ─────────────────────────────────────────────────────────────────

  describe('Input Validation', () => {
    it('POST /api/v1/auth/register — should reject missing phone', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ countryCode: 'TR' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('POST /api/v1/auth/register — should reject missing countryCode', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: '+905551234567' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('POST /api/v1/auth/register — should reject empty body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);
    });

    it('POST /api/v1/auth/register — should reject extraneous fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: '+905551234567',
          countryCode: 'TR',
          hackerField: 'malicious',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('POST /api/v1/auth/verify-sms — should reject invalid code length', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({
          phone: '+905551234567',
          code: '12345', // Too short (5 chars, need 6)
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('POST /api/v1/auth/verify-sms — should reject missing code', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({
          phone: '+905551234567',
        })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // SECTION 5: Authenticated Endpoints — Response Shapes
  // ─────────────────────────────────────────────────────────────────

  describe('Authenticated Endpoints — Response Shapes', () => {
    // Get a fresh token before these tests
    let authToken: string;

    beforeAll(async () => {
      // Register + verify a fresh user for this section
      resetStores();
      mockPrisma = createMockPrismaService();

      // We need to re-bootstrap the app with fresh mocks
      await app.close();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrisma)
        .compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true },
        }),
      );
      await app.init();

      // Capture OTP during registration
      let otp = '';
      const createSpy = mockPrisma.userVerification.create as jest.Mock;
      const origImpl = createSpy.getMockImplementation();
      createSpy.mockImplementation(async (args: { data: { otpCode?: string; [k: string]: unknown } }) => {
        if (args.data.otpCode) {
          otp = args.data.otpCode;
        }
        if (origImpl) return origImpl(args);
        return { id: uuid(), ...args.data };
      });

      // Register
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone: TEST_PHONE, countryCode: TEST_COUNTRY_CODE });

      // Verify SMS and get tokens
      const verifyResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-sms')
        .send({ phone: TEST_PHONE, code: otp });

      authToken = verifyResponse.body.accessToken;
    });

    it('GET /api/v1/users/me — response shape should include user fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Core user fields
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('phone');
      expect(response.body).toHaveProperty('isSmsVerified');
      expect(response.body).toHaveProperty('isSelfieVerified');
      expect(response.body).toHaveProperty('isFullyVerified');
      expect(response.body).toHaveProperty('packageTier');
      expect(response.body).toHaveProperty('goldBalance');

      // Computed fields
      expect(response.body).toHaveProperty('age');
      expect(response.body).toHaveProperty('profileCompletion');
      expect(response.body).toHaveProperty('activeSubscription');

      // deletedAt should be excluded
      expect(response.body).not.toHaveProperty('deletedAt');
    });

    it('GET /api/v1/badges — response should have badges array and total', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/badges')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('badges');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.badges)).toBe(true);
      expect(response.body.total).toBe(response.body.badges.length);

      // Should have 8 seeded badges
      expect(response.body.badges.length).toBe(8);

      // Each badge should have the expected shape
      if (response.body.badges.length > 0) {
        const badge = response.body.badges[0];
        expect(badge).toHaveProperty('id');
        expect(badge).toHaveProperty('key');
        expect(badge).toHaveProperty('nameEn');
        expect(badge).toHaveProperty('nameTr');
        expect(badge).toHaveProperty('descriptionEn');
        expect(badge).toHaveProperty('descriptionTr');
        expect(badge).toHaveProperty('goldReward');
      }
    });

    it('GET /api/v1/badges/me — response should have earned badges and progress', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/badges/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('earnedBadges');
      expect(response.body).toHaveProperty('totalEarned');
      expect(response.body).toHaveProperty('totalAvailable');
      expect(response.body).toHaveProperty('progress');
      expect(Array.isArray(response.body.earnedBadges)).toBe(true);
      expect(Array.isArray(response.body.progress)).toBe(true);
      expect(typeof response.body.totalEarned).toBe('number');
      expect(typeof response.body.totalAvailable).toBe('number');
    });

    it('GET /api/v1/payments/packages — response shape with packages and goldPacks', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/packages')
        .expect(200);

      // Verify exactly 4 packages (LOCKED)
      expect(response.body.packages).toHaveLength(4);

      // Verify price ordering (free < gold < pro < reserved)
      const prices = response.body.packages.map(
        (p: { monthlyPriceUsd: number }) => p.monthlyPriceUsd,
      );
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }

      // Verify gold packs have 4 options
      expect(response.body.goldPacks).toHaveLength(4);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // SECTION 6: Edge Cases & Error Handling
  // ─────────────────────────────────────────────────────────────────

  describe('Edge Cases & Error Handling', () => {
    it('GET /api/v1/nonexistent — should return 404 for unknown routes', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/nonexistent')
        .expect(404);
    });

    it('POST /api/v1/auth/register — should handle invalid phone format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: 'not-a-phone',
          countryCode: 'TR',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('POST /api/v1/auth/register — should handle country code too long', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: '+905551234567',
          countryCode: 'TOOLONG',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('PATCH /api/v1/users/me — should return 401 without token', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .send({ displayName: 'Test' })
        .expect(401);
    });

    it('Requests to root /api/v1 without specific route — should return 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1')
        .expect(404);
    });

    it('Request without api/v1 prefix — should return 404', async () => {
      await request(app.getHttpServer())
        .get('/auth/register')
        .expect(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // SECTION 7: Login Flow (separate from register)
  // ─────────────────────────────────────────────────────────────────

  describe('Login Flow', () => {
    it('POST /api/v1/auth/login — should return 400 for non-existent phone', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          phone: '+905550000001',
          code: '123456',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('POST /api/v1/auth/login — should reject empty body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // SECTION 8: Refresh Token
  // ─────────────────────────────────────────────────────────────────

  describe('Refresh Token', () => {
    it('POST /api/v1/auth/refresh-token — should reject invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'completely-invalid-token',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('POST /api/v1/auth/refresh-token — should reject empty body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({})
        .expect(400);
    });
  });
});
