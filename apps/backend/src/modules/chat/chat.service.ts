import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ModerationService } from "../moderation/moderation.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { MessageReactionDto } from "./dto/message-reaction.dto";

/**
 * ChatService — handles 1-on-1 messaging between matched users.
 *
 * Schema: ChatMessage model defined in prisma/schema.prisma
 * Migration: npx prisma migrate dev --name add_chat_messages_and_notification_prefs
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderationService: ModerationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Conversations ──────────────────────────────────────────

  /**
   * Get all conversations (matches with messages) for the current user.
   * Returns matches that are active, ordered by most recent message.
   */
  async getConversations(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        isActive: true,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
            photos: {
              where: { isPrimary: true, isApproved: true },
              take: 1,
              select: { thumbnailUrl: true },
            },
          },
        },
        userB: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
            photos: {
              where: { isPrimary: true, isApproved: true },
              take: 1,
              select: { thumbnailUrl: true },
            },
          },
        },
        // Get the latest message for preview
        chatMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            type: true,
            status: true,
            mediaUrl: true,
            readAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      conversations: matches.map((match: (typeof matches)[number]) => {
        const partner = match.userAId === userId ? match.userB : match.userA;
        const lastMessage = match.chatMessages?.[0] ?? null;

        return {
          matchId: match.id,
          partner: {
            userId: partner.id,
            firstName: partner.profile?.firstName ?? "Kullanici",
            photoUrl: partner.photos[0]?.thumbnailUrl ?? null,
          },
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                type: lastMessage.type,
                status: lastMessage.status,
                mediaUrl: lastMessage.mediaUrl,
                isRead: lastMessage.readAt !== null,
                createdAt: lastMessage.createdAt.toISOString(),
              }
            : null,
          matchedAt: match.createdAt.toISOString(),
        };
      }),
    };
  }

  // ─── Messages ──────────────────────────────────────────────

  /**
   * Get messages for a specific conversation with cursor-based pagination.
   * Messages are returned in descending order (newest first).
   * When the recipient fetches messages, undelivered messages are marked as 'DELIVERED'.
   */
  async getMessages(
    userId: string,
    matchId: string,
    cursor?: string,
    limit = 50,
  ) {
    // Verify the user is part of this match
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { userAId: true, userBId: true, isActive: true },
    });

    if (!match) {
      throw new NotFoundException("Konusma bulunamadi");
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException("Bu konusmaya erisim yetkiniz yok");
    }

    // Mark undelivered messages from the OTHER user as DELIVERED
    await this.prisma.chatMessage.updateMany({
      where: {
        matchId,
        senderId: { not: userId },
        status: "SENT",
      },
      data: {
        status: "DELIVERED",
      },
    });

    const messages = await this.prisma.chatMessage.findMany({
      where: { matchId },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // fetch one extra to determine if there are more
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1, // skip the cursor itself
          }
        : {}),
      select: {
        id: true,
        senderId: true,
        content: true,
        type: true,
        status: true,
        mediaUrl: true,
        metadata: true,
        readAt: true,
        createdAt: true,
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return {
      messages: items.map((msg: (typeof items)[number]) => ({
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        type: msg.type,
        status: msg.status,
        mediaUrl: msg.mediaUrl,
        metadata: msg.metadata,
        isRead: msg.readAt !== null,
        createdAt: msg.createdAt.toISOString(),
      })),
      nextCursor,
      hasMore,
    };
  }

  // ─── Send Message ──────────────────────────────────────────

  /**
   * Send a message in a conversation.
   * Validates the match is active and the user is a participant.
   * Supports text and image message types.
   */
  async sendMessage(userId: string, matchId: string, dto: SendMessageDto) {
    // Verify match and participation
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { userAId: true, userBId: true, isActive: true },
    });

    if (!match) {
      throw new NotFoundException("Konusma bulunamadi");
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException("Bu konusmaya erisim yetkiniz yok");
    }

    if (!match.isActive) {
      throw new ForbiddenException("Bu eslesme artik aktif degil");
    }

    // Check if either user has blocked the other
    const partnerId = match.userAId === userId ? match.userBId : match.userAId;
    const blocked = await this.moderationService.isBlocked(userId, partnerId);
    if (blocked) {
      throw new ForbiddenException("Bu kullaniciya mesaj gonderemezsiniz");
    }

    const messageType = dto.type ?? "TEXT";

    const message = await this.prisma.chatMessage.create({
      data: {
        matchId,
        senderId: userId,
        content: dto.content.trim(),
        type: messageType,
        status: "SENT",
        mediaUrl: dto.mediaUrl ?? null,
        mediaDuration: dto.mediaDuration ?? null,
      },
      select: {
        id: true,
        senderId: true,
        content: true,
        type: true,
        status: true,
        mediaUrl: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Detect URLs in text messages and store link preview metadata.
    // TODO: Server-side link preview fetching (title, image, description) could be
    // added here as an async job — for now we only extract the first URL so the
    // client can fetch preview data itself.
    if (messageType === "TEXT") {
      const urlMatch = dto.content.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        await this.prisma.chatMessage.update({
          where: { id: message.id },
          data: { metadata: { linkUrl: urlMatch[0] } },
        });
      }
    }

    // Update match's updatedAt to bubble conversation to top
    await this.prisma.match.update({
      where: { id: matchId },
      data: { updatedAt: new Date() },
    });

    // Send push notification to the partner (fire-and-forget)
    const senderProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { firstName: true },
    });
    const senderName = senderProfile?.firstName ?? "Biri";

    // Use type-aware preview text for non-text messages
    let preview: string;
    if (messageType === "GIF") {
      preview = "GIF gonderdi";
    } else if (messageType === "IMAGE") {
      preview = "Fotograf gonderdi";
    } else if (messageType === "VOICE") {
      preview = "Sesli mesaj gonderdi";
    } else {
      preview =
        dto.content.trim().length > 100
          ? dto.content.trim().substring(0, 97) + "..."
          : dto.content.trim();
    }
    this.notificationsService
      .notifyNewMessage(partnerId, senderName, preview)
      .catch(() => {});

    return {
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      status: message.status,
      mediaUrl: message.mediaUrl,
      metadata: message.metadata,
      isRead: false,
      createdAt: message.createdAt.toISOString(),
    };
  }

  // ─── Mark as Read ──────────────────────────────────────────

  /**
   * Mark all unread messages in a conversation as read for the current user.
   * Only marks messages sent by the OTHER user (not your own).
   * Also updates message status to READ.
   */
  async markAsRead(userId: string, matchId: string) {
    // Verify match and participation
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { userAId: true, userBId: true },
    });

    if (!match) {
      throw new NotFoundException("Konusma bulunamadi");
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException("Bu konusmaya erisim yetkiniz yok");
    }

    const result = await this.prisma.chatMessage.updateMany({
      where: {
        matchId,
        senderId: { not: userId }, // only mark the other user's messages
        readAt: null,
      },
      data: {
        readAt: new Date(),
        status: "READ",
      },
    });

    return {
      markedAsRead: result.count,
    };
  }

  // ─── Message Reactions ──────────────────────────────────────

  /**
   * Add or toggle a reaction on a message.
   * If the user has already reacted with the same emoji, it removes the reaction.
   * A user can only have one reaction per message.
   */
  async reactToMessage(
    userId: string,
    messageId: string,
    dto: MessageReactionDto,
  ) {
    // Verify message exists
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, matchId: true },
    });

    if (!message) {
      throw new NotFoundException("Mesaj bulunamadi");
    }

    // Verify user is a participant in this match
    const match = await this.prisma.match.findUnique({
      where: { id: message.matchId },
      select: { userAId: true, userBId: true },
    });

    if (!match) {
      throw new NotFoundException("Eslesme bulunamadi");
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException("Bu mesaja erisim yetkiniz yok");
    }

    // Check if user already has a reaction on this message
    const existingReaction = await this.prisma.messageReaction.findFirst({
      where: {
        messageId,
        userId,
      },
    });

    if (existingReaction) {
      if (existingReaction.emoji === dto.emoji) {
        // Same emoji — remove the reaction (toggle off)
        await this.prisma.messageReaction.delete({
          where: { id: existingReaction.id },
        });
        return {
          action: "removed",
          messageId,
          emoji: dto.emoji,
        };
      } else {
        // Different emoji — update to new emoji
        await this.prisma.messageReaction.update({
          where: { id: existingReaction.id },
          data: { emoji: dto.emoji },
        });
        return {
          action: "updated",
          messageId,
          emoji: dto.emoji,
        };
      }
    }

    // No existing reaction — create new one
    await this.prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji: dto.emoji,
      },
    });

    return {
      action: "added",
      messageId,
      emoji: dto.emoji,
    };
  }

  // ─── Delete / Unsend Message ──────────────────────────────

  /**
   * Soft-delete a message. Only the original sender can delete their own message.
   * Sets content to empty string and status to DELETED — the record is preserved
   * so conversation ordering and references remain intact.
   */
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, matchId: true },
    });

    if (!message) {
      throw new NotFoundException("Mesaj bulunamadi");
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException("Sadece kendi mesajlarinizi silebilirsiniz");
    }

    // Verify the match is still active
    const match = await this.prisma.match.findUnique({
      where: { id: message.matchId },
      select: { isActive: true },
    });

    if (!match) {
      throw new NotFoundException("Eslesme bulunamadi");
    }

    if (!match.isActive) {
      throw new ForbiddenException("Bu eslestirme artik aktif degil");
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: "",
        status: "DELETED",
        metadata: Prisma.JsonNull,
      },
    });

    return {
      messageId,
      matchId: message.matchId,
      deleted: true,
    };
  }
}
