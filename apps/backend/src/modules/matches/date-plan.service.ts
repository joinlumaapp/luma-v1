import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDatePlanDto, RespondDatePlanDto } from './dto/date-plan.dto';

@Injectable()
export class DatePlanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new date plan for a match.
   * The user must be a participant in the match.
   */
  async createDatePlan(
    userId: string,
    matchId: string,
    dto: CreateDatePlanDto,
  ) {
    // Verify the match exists and is active
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, userAId: true, userBId: true, isActive: true },
    });

    if (!match) {
      throw new NotFoundException('Eslesme bulunamadi');
    }

    if (!match.isActive) {
      throw new ForbiddenException('Bu eslesme artik aktif degil');
    }

    // Verify user is a participant
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException('Bu eslesmeye erisim yetkiniz yok');
    }

    const datePlan = await this.prisma.datePlan.create({
      data: {
        matchId,
        proposedById: userId,
        title: dto.title,
        suggestedDate: dto.suggestedDate
          ? new Date(dto.suggestedDate)
          : null,
        suggestedPlace: dto.suggestedPlace ?? null,
        note: dto.note ?? null,
        status: 'PROPOSED',
      },
    });

    return datePlan;
  }

  /**
   * Respond to a date plan (accept or decline).
   * Only the other participant (not the proposer) can respond.
   */
  async respondToDatePlan(
    userId: string,
    planId: string,
    dto: RespondDatePlanDto,
  ) {
    const datePlan = await this.prisma.datePlan.findUnique({
      where: { id: planId },
      include: {
        match: {
          select: { userAId: true, userBId: true, isActive: true },
        },
      },
    });

    if (!datePlan) {
      throw new NotFoundException('Bulusma plani bulunamadi');
    }

    if (!datePlan.match.isActive) {
      throw new ForbiddenException('Bu eslesme artik aktif degil');
    }

    // Verify user is a participant in the match
    const { userAId, userBId } = datePlan.match;
    if (userAId !== userId && userBId !== userId) {
      throw new ForbiddenException('Bu plana erisim yetkiniz yok');
    }

    // The proposer cannot respond to their own plan
    if (datePlan.proposedById === userId) {
      throw new ForbiddenException(
        'Kendi onerdiginiz plana yanit veremezsiniz',
      );
    }

    // Can only respond to PROPOSED plans
    if (datePlan.status !== 'PROPOSED') {
      throw new ForbiddenException(
        'Bu plana zaten yanit verilmis',
      );
    }

    const updated = await this.prisma.datePlan.update({
      where: { id: planId },
      data: {
        status: dto.response,
        respondedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Get all date plans for a match, ordered by most recent first.
   * The user must be a participant in the match.
   */
  async getDatePlans(userId: string, matchId: string) {
    // Verify the match exists
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, userAId: true, userBId: true },
    });

    if (!match) {
      throw new NotFoundException('Eslesme bulunamadi');
    }

    // Verify user is a participant
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException('Bu eslesmeye erisim yetkiniz yok');
    }

    const plans = await this.prisma.datePlan.findMany({
      where: { matchId },
      orderBy: { createdAt: 'desc' },
      include: {
        proposedBy: {
          select: {
            id: true,
            profile: {
              select: { firstName: true },
            },
          },
        },
      },
    });

    return {
      datePlans: plans,
      total: plans.length,
    };
  }

  /**
   * Cancel a date plan.
   * Only the proposer can cancel their own plan.
   */
  async cancelDatePlan(userId: string, planId: string) {
    const datePlan = await this.prisma.datePlan.findUnique({
      where: { id: planId },
      include: {
        match: {
          select: { userAId: true, userBId: true },
        },
      },
    });

    if (!datePlan) {
      throw new NotFoundException('Bulusma plani bulunamadi');
    }

    // Verify user is a participant in the match
    const { userAId, userBId } = datePlan.match;
    if (userAId !== userId && userBId !== userId) {
      throw new ForbiddenException('Bu plana erisim yetkiniz yok');
    }

    // Only the proposer can cancel
    if (datePlan.proposedById !== userId) {
      throw new ForbiddenException(
        'Yalnizca plani oneren kisi iptal edebilir',
      );
    }

    // Cannot cancel already completed or cancelled plans
    if (datePlan.status === 'COMPLETED' || datePlan.status === 'CANCELLED') {
      throw new ForbiddenException(
        'Bu plan zaten tamamlanmis veya iptal edilmis',
      );
    }

    const updated = await this.prisma.datePlan.update({
      where: { id: planId },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }
}
