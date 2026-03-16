import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SendMessageDto } from "./dto/send-message.dto";

/**
 * Authenticated socket interface — userId attached after JWT handshake.
 */
interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    phone: string;
  };
}

/**
 * WebSocket gateway for real-time chat messaging.
 * Handles: join/leave conversation rooms, send messages, typing indicators, read receipts.
 *
 * Events emitted TO clients:
 *   chat:message, chat:typing, chat:stop_typing, chat:read, chat:message_deleted, chat:error
 *
 * Events received FROM clients:
 *   chat:join, chat:leave, chat:message, chat:delete_message, chat:typing, chat:stop_typing, chat:read
 */
@WebSocketGateway({
  namespace: "/chat",
  cors: {
    origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /** Maps userId -> Set of socketIds (supports multiple devices) */
  private userSockets = new Map<string, Set<string>>();

  /** Tracks last event timestamps per socket for rate limiting */
  private eventTimestamps = new Map<string, Map<string, number[]>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(): void {
    this.logger.log("Chat WebSocket Gateway initialized");
  }

  /**
   * Validate JWT from handshake auth header on connection.
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        throw new WsException("Authentication token required");
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });

      // Attach user data to socket
      client.data.userId = payload.sub;
      client.data.phone = payload.phone;

      // Support multiple connections per user (e.g., multiple devices)
      const existing = this.userSockets.get(payload.sub);
      if (existing) {
        existing.add(client.id);
      } else {
        this.userSockets.set(payload.sub, new Set([client.id]));
      }

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.emit("chat:error", { message: "Kimlik dogrulama basarisiz" });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const userId = client.data?.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.eventTimestamps.delete(client.id);
      this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
    }
  }

  /**
   * Simple per-socket rate limiter. Returns true if the event should be rejected.
   */
  private isRateLimited(
    socketId: string,
    event: string,
    maxPerMinute: number,
  ): boolean {
    const now = Date.now();
    const windowMs = 60_000;

    let socketEvents = this.eventTimestamps.get(socketId);
    if (!socketEvents) {
      socketEvents = new Map();
      this.eventTimestamps.set(socketId, socketEvents);
    }

    let timestamps = socketEvents.get(event);
    if (!timestamps) {
      timestamps = [];
      socketEvents.set(event, timestamps);
    }

    // Remove expired timestamps
    const cutoff = now - windowMs;
    const filtered = timestamps.filter((t) => t > cutoff);
    socketEvents.set(event, filtered);

    if (filtered.length >= maxPerMinute) {
      return true;
    }

    filtered.push(now);
    return false;
  }

  /**
   * Verify user is a participant in an active match.
   */
  private async validateMatchParticipant(
    client: AuthenticatedSocket,
    userId: string,
    matchId: string,
  ): Promise<boolean> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { userAId: true, userBId: true, isActive: true },
    });

    if (!match) {
      client.emit("chat:error", { message: "Eslestirme bulunamadi" });
      return false;
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      client.emit("chat:error", { message: "Bu sohbete erisim yetkiniz yok" });
      return false;
    }

    if (!match.isActive) {
      client.emit("chat:error", { message: "Bu eslestirme artik aktif degil" });
      return false;
    }

    return true;
  }

  // ─── Conversation Events ──────────────────────────────────

  /**
   * Join a conversation room to receive real-time updates.
   */
  @SubscribeMessage("chat:join")
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!data.matchId) {
      client.emit("chat:error", { message: "Match ID gerekli" });
      return;
    }

    // Verify user is a participant of this active match
    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    const roomName = `chat:${data.matchId}`;
    await client.join(roomName);
    this.logger.log(`User ${userId} joined conversation ${data.matchId}`);
  }

  /**
   * Leave a conversation room.
   */
  @SubscribeMessage("chat:leave")
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);
    const roomName = `chat:${data.matchId}`;

    await client.leave(roomName);
    this.logger.log(`User ${userId} left conversation ${data.matchId}`);
  }

  // ─── Messaging ────────────────────────────────────────────

  /**
   * Send a chat message via WebSocket.
   * Persists via ChatService and broadcasts to the conversation room.
   * Supports text and image message types.
   * Rate limited to 60 messages per minute.
   */
  @SubscribeMessage("chat:message")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      matchId: string;
      content: string;
      type?: "TEXT" | "IMAGE";
      mediaUrl?: string;
    },
  ): Promise<void> {
    const userId = this.getUserId(client);

    // Rate limit messages
    if (this.isRateLimited(client.id, "chat:message", 60)) {
      client.emit("chat:error", { message: "Cok fazla mesaj gonderiyorsunuz" });
      return;
    }

    if (!data.content?.trim()) {
      client.emit("chat:error", { message: "Mesaj bos olamaz" });
      return;
    }

    if (data.content.length > 1000) {
      client.emit("chat:error", { message: "Mesaj 1000 karakteri asamaz" });
      return;
    }

    // Verify user is a participant of this active match
    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    try {
      const dto: SendMessageDto = {
        content: data.content,
        type: data.type,
        mediaUrl: data.mediaUrl,
      };
      const message = await this.chatService.sendMessage(
        userId,
        data.matchId,
        dto,
      );

      // Broadcast to the conversation room
      this.server.to(`chat:${data.matchId}`).emit("chat:message", {
        ...message,
        matchId: data.matchId,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Mesaj gonderilemedi";
      client.emit("chat:error", { message: errorMessage });
    }
  }

  // ─── Delete / Unsend ──────────────────────────────────────

  /**
   * Delete (unsend) a message via WebSocket.
   * Soft-deletes via ChatService and broadcasts chat:message_deleted to the room.
   */
  @SubscribeMessage("chat:delete_message")
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!data.messageId) {
      client.emit("chat:error", { message: "Message ID gerekli" });
      return;
    }

    try {
      const result = await this.chatService.deleteMessage(
        userId,
        data.messageId,
      );

      // Broadcast deletion to the conversation room
      this.server.to(`chat:${result.matchId}`).emit("chat:message_deleted", {
        messageId: result.messageId,
        matchId: result.matchId,
        deletedBy: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Mesaj silinemedi";
      client.emit("chat:error", { message: errorMessage });
    }
  }

  // ─── Typing Indicators ────────────────────────────────────

  /**
   * Broadcast typing indicator to conversation partner.
   * Rate limited to 10 events per minute.
   */
  @SubscribeMessage("chat:typing")
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (this.isRateLimited(client.id, "chat:typing", 10)) {
      return;
    }

    // Verify user is a participant of this match
    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    client.to(`chat:${data.matchId}`).emit("chat:typing", {
      userId,
      matchId: data.matchId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast stop-typing indicator to conversation partner.
   */
  @SubscribeMessage("chat:stop_typing")
  async handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    // Verify user is a participant of this match
    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    client.to(`chat:${data.matchId}`).emit("chat:stop_typing", {
      userId,
      matchId: data.matchId,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Read Receipts ────────────────────────────────────────

  /**
   * Mark messages as read and notify the conversation partner.
   */
  @SubscribeMessage("chat:read")
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    // Verify user is a participant of this match
    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    try {
      const result = await this.chatService.markAsRead(userId, data.matchId);

      // Notify partner that messages were read
      client.to(`chat:${data.matchId}`).emit("chat:read", {
        userId,
        matchId: data.matchId,
        markedAsRead: result.markedAsRead,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Okundu bilgisi gonderilemedi";
      client.emit("chat:error", { message: errorMessage });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  private getUserId(client: AuthenticatedSocket): string {
    const userId = client.data?.userId;
    if (!userId) {
      throw new WsException("Kimlik dogrulama gerekli");
    }
    return userId;
  }

  /**
   * Check if a user is currently connected via WebSocket.
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * Broadcast an event to all clients in a conversation room (used by ChatController).
   */
  broadcastToRoom(
    matchId: string,
    event: string,
    data: Record<string, unknown>,
  ): void {
    this.server.to(`chat:${matchId}`).emit(event, data);
  }

  /**
   * Notify a specific user via WebSocket (used by other services).
   * Sends to all connected devices for the user.
   */
  notifyUser(
    userId: string,
    event: string,
    data: Record<string, unknown>,
  ): void {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }
}
