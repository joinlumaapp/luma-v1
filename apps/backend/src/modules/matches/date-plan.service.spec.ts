import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { DatePlanService } from "./date-plan.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("DatePlanService", () => {
  let service: DatePlanService;
  let prisma: {
    match: { findUnique: jest.Mock };
    datePlan: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const userId = "user-1";
  const partnerId = "user-2";
  const matchId = "match-1";
  const planId = "plan-1";

  const activeMatch = {
    id: matchId,
    userAId: userId,
    userBId: partnerId,
    isActive: true,
  };

  const proposedPlan = {
    id: planId,
    matchId,
    proposedById: userId,
    title: "Kahve bulusmasi",
    suggestedDate: new Date("2026-04-01T18:00:00Z"),
    suggestedPlace: "Bebek Starbucks",
    note: null,
    status: "PROPOSED",
    respondedAt: null,
    createdAt: new Date(),
    match: { userAId: userId, userBId: partnerId, isActive: true },
  };

  beforeEach(async () => {
    prisma = {
      match: { findUnique: jest.fn() },
      datePlan: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatePlanService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DatePlanService>(DatePlanService);
  });

  describe("createDatePlan", () => {
    it("should create a date plan for an active match", async () => {
      prisma.match.findUnique.mockResolvedValue(activeMatch);
      prisma.datePlan.create.mockResolvedValue({
        id: planId,
        matchId,
        proposedById: userId,
        title: "Kahve bulusmasi",
        status: "PROPOSED",
      });

      const result = await service.createDatePlan(userId, matchId, {
        title: "Kahve bulusmasi",
        suggestedDate: "2026-04-01T18:00:00Z",
        suggestedPlace: "Bebek Starbucks",
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("PROPOSED");
      expect(prisma.datePlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matchId,
            proposedById: userId,
            title: "Kahve bulusmasi",
            status: "PROPOSED",
          }),
        }),
      );
    });

    it("should throw NotFoundException when match does not exist", async () => {
      prisma.match.findUnique.mockResolvedValue(null);

      await expect(
        service.createDatePlan(userId, matchId, { title: "Test" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when match is not active", async () => {
      prisma.match.findUnique.mockResolvedValue({
        ...activeMatch,
        isActive: false,
      });

      await expect(
        service.createDatePlan(userId, matchId, { title: "Test" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException when user is not a participant", async () => {
      prisma.match.findUnique.mockResolvedValue({
        ...activeMatch,
        userAId: "other-user-1",
        userBId: "other-user-2",
      });

      await expect(
        service.createDatePlan(userId, matchId, { title: "Test" }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getDatePlans", () => {
    it("should return date plans for a match", async () => {
      prisma.match.findUnique.mockResolvedValue(activeMatch);
      prisma.datePlan.findMany.mockResolvedValue([proposedPlan]);

      const result = await service.getDatePlans(userId, matchId);

      expect(result.datePlans).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should throw NotFoundException when match does not exist", async () => {
      prisma.match.findUnique.mockResolvedValue(null);

      await expect(service.getDatePlans(userId, matchId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("respondToDatePlan", () => {
    it("should accept a date plan as the partner", async () => {
      prisma.datePlan.findUnique.mockResolvedValue(proposedPlan);
      prisma.datePlan.update.mockResolvedValue({
        ...proposedPlan,
        status: "ACCEPTED",
        respondedAt: new Date(),
      });

      const result = await service.respondToDatePlan(partnerId, planId, {
        response: "ACCEPTED",
      });

      expect(result.status).toBe("ACCEPTED");
      expect(prisma.datePlan.update).toHaveBeenCalledWith({
        where: { id: planId },
        data: { status: "ACCEPTED", respondedAt: expect.any(Date) },
      });
    });

    it("should throw ForbiddenException when proposer tries to respond", async () => {
      prisma.datePlan.findUnique.mockResolvedValue(proposedPlan);

      await expect(
        service.respondToDatePlan(userId, planId, { response: "ACCEPTED" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException for already responded plan", async () => {
      prisma.datePlan.findUnique.mockResolvedValue({
        ...proposedPlan,
        status: "ACCEPTED",
      });

      await expect(
        service.respondToDatePlan(partnerId, planId, { response: "DECLINED" }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("cancelDatePlan", () => {
    it("should cancel a date plan as the proposer", async () => {
      prisma.datePlan.findUnique.mockResolvedValue({
        ...proposedPlan,
        match: { userAId: userId, userBId: partnerId },
      });
      prisma.datePlan.update.mockResolvedValue({
        ...proposedPlan,
        status: "CANCELLED",
      });

      const result = await service.cancelDatePlan(userId, planId);

      expect(result.status).toBe("CANCELLED");
    });

    it("should throw ForbiddenException when non-proposer tries to cancel", async () => {
      prisma.datePlan.findUnique.mockResolvedValue({
        ...proposedPlan,
        match: { userAId: userId, userBId: partnerId },
      });

      await expect(
        service.cancelDatePlan(partnerId, planId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
