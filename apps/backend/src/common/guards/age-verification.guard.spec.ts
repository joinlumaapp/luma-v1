import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AgeVerificationGuard } from "./age-verification.guard";
import { PrismaService } from "../../prisma/prisma.service";

describe("AgeVerificationGuard", () => {
  let guard: AgeVerificationGuard;

  const mockPrisma = {
    userProfile: {
      findUnique: jest.fn(),
    },
  };

  function createMockContext(user: Record<string, unknown> | null): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgeVerificationGuard,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<AgeVerificationGuard>(AgeVerificationGuard);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should throw ForbiddenException when user is not authenticated", async () => {
    const context = createMockContext(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should throw ForbiddenException when user has no profile", async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue(null);
    const context = createMockContext({ sub: "user-1" });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should throw ForbiddenException when birthDate is null", async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue({ birthDate: null });
    const context = createMockContext({ sub: "user-1" });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should throw ForbiddenException when user is under 18", async () => {
    // Set birthDate to 10 years ago
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    mockPrisma.userProfile.findUnique.mockResolvedValue({
      birthDate: tenYearsAgo,
    });
    const context = createMockContext({ sub: "user-1" });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should allow access when user is exactly 18", async () => {
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    // Ensure birthday has already passed this year
    eighteenYearsAgo.setMonth(0, 1);
    mockPrisma.userProfile.findUnique.mockResolvedValue({
      birthDate: eighteenYearsAgo,
    });
    const context = createMockContext({ sub: "user-1" });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("should allow access when user is over 18", async () => {
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
    mockPrisma.userProfile.findUnique.mockResolvedValue({
      birthDate: thirtyYearsAgo,
    });
    const context = createMockContext({ sub: "user-1" });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("should query profile by userId from JWT payload", async () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 25);
    mockPrisma.userProfile.findUnique.mockResolvedValue({ birthDate });
    const context = createMockContext({ sub: "user-specific-id" });

    await guard.canActivate(context);

    expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-specific-id" },
      select: { birthDate: true },
    });
  });
});
