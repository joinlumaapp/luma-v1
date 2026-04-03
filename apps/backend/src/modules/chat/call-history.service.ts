import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
/** Inline type from @luma/shared — avoids monorepo resolution issues in Railway */
export interface CallHistoryItem {
  id: string;
  matchId: string;
  callerId: string;
  receiverId: string;
  callType: string;
  status: string;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  goldCost: number;
  endedBy: string | null;
  createdAt: string;
  partner: { userId: string; firstName: string; photoUrl: string | null };
  isOutgoing: boolean;
}

@Injectable()
export class CallHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Lifecycle Methods (called by ChatGateway) ────────────

  async createCallRecord(data: {
    matchId: string;
    callerId: string;
    receiverId: string;
    callType: "VOICE" | "VIDEO";
    goldCost: number;
    goldTransactionId?: string;
  }): Promise<string> {
    const record = await this.prisma.callHistory.create({
      data: {
        matchId: data.matchId,
        callerId: data.callerId,
        receiverId: data.receiverId,
        callType: data.callType,
        goldCost: data.goldCost,
        goldTransactionId: data.goldTransactionId,
      },
      select: { id: true },
    });
    return record.id;
  }

  async markAnswered(callHistoryId: string): Promise<void> {
    await this.prisma.callHistory.update({
      where: { id: callHistoryId },
      data: {
        status: "ANSWERED",
        answeredAt: new Date(),
      },
    });
  }

  async markRejected(callHistoryId: string, rejectedBy: string): Promise<void> {
    await this.prisma.callHistory.update({
      where: { id: callHistoryId },
      data: {
        status: "REJECTED",
        endedAt: new Date(),
        endedBy: rejectedBy,
      },
    });
  }

  async markEnded(callHistoryId: string, endedBy: string): Promise<void> {
    const call = await this.prisma.callHistory.findUnique({
      where: { id: callHistoryId },
      select: { answeredAt: true, status: true },
    });

    if (!call || call.status !== "ANSWERED") return;

    const now = new Date();
    const durationSeconds = call.answeredAt
      ? Math.floor((now.getTime() - call.answeredAt.getTime()) / 1000)
      : null;

    await this.prisma.callHistory.update({
      where: { id: callHistoryId },
      data: {
        status: "ANSWERED",
        endedAt: now,
        endedBy,
        durationSeconds,
      },
    });
  }

  async markMissed(callHistoryId: string): Promise<void> {
    await this.prisma.callHistory.update({
      where: { id: callHistoryId },
      data: {
        status: "MISSED",
        endedAt: new Date(),
      },
    });
  }

  async markCancelled(callHistoryId: string): Promise<void> {
    await this.prisma.callHistory.update({
      where: { id: callHistoryId },
      data: {
        status: "CANCELLED",
        endedAt: new Date(),
      },
    });
  }

  // ─── Query Methods (called by CallHistoryController) ──────

  async getCallHistory(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ calls: CallHistoryItem[]; nextCursor: string | null; hasMore: boolean }> {
    const calls = await this.prisma.callHistory.findMany({
      where: {
        OR: [
          { callerId: userId, deletedByCaller: false },
          { receiverId: userId, deletedByReceiver: false },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? { cursor: { id: cursor }, skip: 1 }
        : {}),
      select: {
        id: true,
        matchId: true,
        callerId: true,
        receiverId: true,
        callType: true,
        status: true,
        startedAt: true,
        answeredAt: true,
        endedAt: true,
        durationSeconds: true,
        goldCost: true,
        endedBy: true,
        createdAt: true,
        caller: {
          select: {
            id: true,
            profile: {
              select: { firstName: true },
            },
            photos: {
              where: { order: 0 },
              select: { url: true },
              take: 1,
            },
          },
        },
        receiver: {
          select: {
            id: true,
            profile: {
              select: { firstName: true },
            },
            photos: {
              where: { order: 0 },
              select: { url: true },
              take: 1,
            },
          },
        },
      },
    });

    const hasMore = calls.length > limit;
    const items = hasMore ? calls.slice(0, limit) : calls;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      calls: items.map((call) => this.mapCallToItem(call, userId)),
      nextCursor,
      hasMore,
    };
  }

  async getCallById(userId: string, callId: string): Promise<CallHistoryItem> {
    const call = await this.prisma.callHistory.findUnique({
      where: { id: callId },
      select: {
        id: true,
        matchId: true,
        callerId: true,
        receiverId: true,
        callType: true,
        status: true,
        startedAt: true,
        answeredAt: true,
        endedAt: true,
        durationSeconds: true,
        goldCost: true,
        endedBy: true,
        createdAt: true,
        deletedByCaller: true,
        deletedByReceiver: true,
        caller: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
            photos: { where: { order: 0 }, select: { url: true }, take: 1 },
          },
        },
        receiver: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
            photos: { where: { order: 0 }, select: { url: true }, take: 1 },
          },
        },
      },
    });

    if (!call) {
      throw new NotFoundException("Arama kaydi bulunamadi");
    }

    if (call.callerId !== userId && call.receiverId !== userId) {
      throw new ForbiddenException("Bu arama kaydina erisim yetkiniz yok");
    }

    const isDeleted =
      (call.callerId === userId && call.deletedByCaller) ||
      (call.receiverId === userId && call.deletedByReceiver);

    if (isDeleted) {
      throw new NotFoundException("Arama kaydi bulunamadi");
    }

    return this.mapCallToItem(call, userId);
  }

  async deleteCallForUser(userId: string, callId: string): Promise<void> {
    const call = await this.prisma.callHistory.findUnique({
      where: { id: callId },
      select: { callerId: true, receiverId: true },
    });

    if (!call) {
      throw new NotFoundException("Arama kaydi bulunamadi");
    }

    if (call.callerId !== userId && call.receiverId !== userId) {
      throw new ForbiddenException("Bu arama kaydina erisim yetkiniz yok");
    }

    const updateField =
      call.callerId === userId ? "deletedByCaller" : "deletedByReceiver";

    await this.prisma.callHistory.update({
      where: { id: callId },
      data: { [updateField]: true },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────

  private mapCallToItem(
    call: {
      id: string;
      matchId: string;
      callerId: string;
      receiverId: string;
      callType: string;
      status: string;
      startedAt: Date;
      answeredAt: Date | null;
      endedAt: Date | null;
      durationSeconds: number | null;
      goldCost: number;
      endedBy: string | null;
      createdAt: Date;
      caller: {
        id: string;
        profile: { firstName: string } | null;
        photos: { url: string }[];
      };
      receiver: {
        id: string;
        profile: { firstName: string } | null;
        photos: { url: string }[];
      };
    },
    userId: string,
  ): CallHistoryItem {
    const isOutgoing = call.callerId === userId;
    const partner = isOutgoing ? call.receiver : call.caller;

    return {
      id: call.id,
      matchId: call.matchId,
      callerId: call.callerId,
      receiverId: call.receiverId,
      callType: call.callType as CallHistoryItem["callType"],
      status: call.status as CallHistoryItem["status"],
      startedAt: call.startedAt.toISOString(),
      answeredAt: call.answeredAt?.toISOString() ?? null,
      endedAt: call.endedAt?.toISOString() ?? null,
      durationSeconds: call.durationSeconds,
      goldCost: call.goldCost,
      endedBy: call.endedBy,
      createdAt: call.createdAt.toISOString(),
      partner: {
        userId: partner.id,
        firstName: partner.profile?.firstName ?? "Kullanici",
        photoUrl: partner.photos[0]?.url ?? null,
      },
      isOutgoing,
    };
  }
}
