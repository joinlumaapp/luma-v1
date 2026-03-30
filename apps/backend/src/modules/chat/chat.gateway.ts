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
import { CallHistoryService } from "./call-history.service";
import { PrismaService } from "../../prisma/prisma.service";
import { WsConnectionService } from "../../common/providers/ws-connection.service";
import { PresenceService } from "../presence/presence.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { GOLD_COSTS } from "@luma/shared";

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

  /** Maps matchId -> active CallHistory ID for ongoing calls */
  private activeCalls = new Map<string, string>();

  /** Timeout handles for unanswered calls (30s auto-miss) */
  private callTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly callHistoryService: CallHistoryService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly wsConnectionService: WsConnectionService,
    private readonly presenceService: PresenceService,
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

      // Register connection in Redis for cross-instance visibility
      await this.wsConnectionService.registerConnection(
        client.id,
        payload.sub,
        "/chat",
      );

      // Update presence in Redis and broadcast online status to matched users
      await this.presenceService.heartbeat(payload.sub);
      await this.broadcastPresence(payload.sub, true);

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

          // Only broadcast offline when no remaining connections for this user
          void this.presenceService.setOffline(userId);
          void this.broadcastPresence(userId, false);

          // Cleanup active calls for disconnected user
          void this.cleanupCallsForUser(userId);
        }
      }
      this.eventTimestamps.delete(client.id);

      // Remove connection from Redis
      void this.wsConnectionService.removeConnection(client.id, userId);

      this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
    }
  }

  private async cleanupCallsForUser(userId: string): Promise<void> {
    for (const [matchId, callHistoryId] of this.activeCalls.entries()) {
      try {
        const call = await this.prisma.callHistory.findUnique({
          where: { id: callHistoryId },
          select: { callerId: true, receiverId: true, status: true },
        });

        if (!call || (call.callerId !== userId && call.receiverId !== userId)) {
          continue;
        }

        const partnerId = call.callerId === userId ? call.receiverId : call.callerId;

        if (call.status === "RINGING") {
          await this.callHistoryService.markMissed(callHistoryId);
        } else if (call.status === "ANSWERED") {
          await this.callHistoryService.markEnded(callHistoryId, userId);
        }

        this.activeCalls.delete(matchId);
        const timeout = this.callTimeouts.get(matchId);
        if (timeout) {
          clearTimeout(timeout);
          this.callTimeouts.delete(matchId);
        }

        // Notify partner that the call ended due to disconnect
        this.notifyUser(partnerId, "call:end", {
          matchId,
          enderId: userId,
          reason: "disconnected",
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        this.logger.error(`Failed to cleanup call ${callHistoryId}: ${err}`);
      }
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

  // ─── Heartbeat ──────────────────────────────────────────────

  /**
   * Handle heartbeat from client to keep presence alive in Redis.
   * Refreshes the 5-minute TTL so the user does not appear falsely offline.
   */
  @SubscribeMessage("heartbeat")
  async handleHeartbeat(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const userId = this.getUserId(client);
    await this.presenceService.heartbeat(userId);
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

  // ─── Voice / Video Calls ───────────────────────────────────

  /**
   * Initiate a paid voice or video call.
   * Validates: active match, caller has paid package, sufficient Gold balance.
   * Deducts Gold atomically and signals the partner.
   */
  @SubscribeMessage("call:initiate")
  async handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; callType: "voice" | "video" },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!data.matchId || !data.callType) {
      client.emit("chat:error", { message: "Match ID ve arama tipi gerekli" });
      return;
    }

    if (data.callType !== "voice" && data.callType !== "video") {
      client.emit("chat:error", { message: "Gecersiz arama tipi" });
      return;
    }

    // Validate match participation
    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    // Get caller's package tier and gold balance
    const caller = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        packageTier: true,
        goldBalance: true,
        profile: { select: { firstName: true } },
      },
    });

    if (!caller) {
      client.emit("chat:error", { message: "Kullanici bulunamadi" });
      return;
    }

    // Must be a paid package (GOLD, PRO, or RESERVED)
    if (caller.packageTier === "FREE") {
      client.emit("chat:error", {
        message: "Arama yapabilmek icin paket sahibi olmaniz gerekiyor",
      });
      return;
    }

    // Prevent duplicate calls on the same match
    if (this.activeCalls.has(data.matchId)) {
      client.emit("chat:error", {
        message: "Zaten devam eden bir arama var",
      });
      return;
    }

    // Check gold balance
    const cost =
      data.callType === "voice" ? GOLD_COSTS.VOICE_CALL : GOLD_COSTS.VIDEO_CALL;

    if (caller.goldBalance < cost) {
      client.emit("chat:error", {
        message: `Yetersiz Gold bakiyesi. ${data.callType === "voice" ? "Sesli" : "Goruntulu"} arama icin ${cost} Gold gerekli`,
      });
      return;
    }

    // Get partner ID
    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
      select: { userAId: true, userBId: true },
    });

    if (!match) return;

    const partnerId =
      match.userAId === userId ? match.userBId : match.userAId;

    // Check if partner is online
    if (!this.isUserOnline(partnerId)) {
      client.emit("chat:error", {
        message: "Karsi taraf su an cevimdisi",
      });
      return;
    }

    // Atomically deduct gold and create call session
    try {
      const transactionType =
        data.callType === "voice" ? "VOICE_CALL" : "VIDEO_CALL";

      let goldTransactionId: string | undefined;

      await this.prisma.$transaction(async (tx) => {
        // Atomic balance deduction
        const updated = await tx.$executeRawUnsafe(
          `UPDATE "users" SET "gold_balance" = "gold_balance" - $1 WHERE "id" = $2::uuid AND "gold_balance" >= $1`,
          cost,
          userId,
        );

        if (updated === 0) {
          throw new Error("Yetersiz Gold bakiyesi");
        }

        // Get new balance
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { goldBalance: true },
        });

        // Log gold transaction
        const goldTx = await tx.goldTransaction.create({
          data: {
            userId,
            type: transactionType,
            amount: -cost,
            balance: user!.goldBalance,
            description:
              data.callType === "voice"
                ? "Sesli arama"
                : "Goruntulu arama",
            referenceId: data.matchId,
          },
          select: { id: true },
        });
        goldTransactionId = goldTx.id;
      });

      // Create call history record
      const callHistoryId = await this.callHistoryService.createCallRecord({
        matchId: data.matchId,
        callerId: userId,
        receiverId: partnerId,
        callType: data.callType === "voice" ? "VOICE" : "VIDEO",
        goldCost: cost,
        goldTransactionId,
      });

      // Track the active call
      this.activeCalls.set(data.matchId, callHistoryId);

      // Set 30-second timeout for missed call detection
      const timeout = setTimeout(async () => {
        try {
          const activeId = this.activeCalls.get(data.matchId);
          if (activeId === callHistoryId) {
            await this.callHistoryService.markMissed(callHistoryId);
            this.activeCalls.delete(data.matchId);
            this.callTimeouts.delete(data.matchId);
            this.notifyUser(userId, "call:end", {
              matchId: data.matchId,
              reason: "no_answer",
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          this.logger.error(`Failed to mark call as missed: ${err}`);
        }
      }, 30_000);
      this.callTimeouts.set(data.matchId, timeout);

      // Signal the partner
      this.notifyUser(partnerId, "call:initiate", {
        matchId: data.matchId,
        callerId: userId,
        callerName: caller.profile?.firstName ?? "Kullanici",
        callType: data.callType,
        timestamp: new Date().toISOString(),
      });

      // Confirm to caller that the call was initiated
      client.emit("call:initiate", {
        matchId: data.matchId,
        callType: data.callType,
        goldSpent: cost,
        status: "ringing",
      });

      this.logger.log(
        `Call initiated: ${userId} -> ${partnerId} (${data.callType}, ${cost} Gold)`,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Arama baslatilamadi";
      client.emit("chat:error", { message: errorMessage });
    }
  }

  /**
   * Accept an incoming call.
   */
  @SubscribeMessage("call:accept")
  async handleCallAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    // Clear the missed-call timeout
    const timeout = this.callTimeouts.get(data.matchId);
    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(data.matchId);
    }

    // Update call history to ANSWERED
    const callHistoryId = this.activeCalls.get(data.matchId);
    if (callHistoryId) {
      await this.callHistoryService.markAnswered(callHistoryId);
    }

    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
      select: { userAId: true, userBId: true },
    });

    if (!match) return;

    const partnerId =
      match.userAId === userId ? match.userBId : match.userAId;

    this.notifyUser(partnerId, "call:accept", {
      matchId: data.matchId,
      accepterId: userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Reject an incoming call.
   */
  @SubscribeMessage("call:reject")
  async handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; reason?: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    // Clear the missed-call timeout
    const timeout = this.callTimeouts.get(data.matchId);
    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(data.matchId);
    }

    // Update call history to REJECTED
    const callHistoryId = this.activeCalls.get(data.matchId);
    if (callHistoryId) {
      await this.callHistoryService.markRejected(callHistoryId, userId);
      this.activeCalls.delete(data.matchId);
    }

    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
      select: { userAId: true, userBId: true },
    });

    if (!match) return;

    const partnerId =
      match.userAId === userId ? match.userBId : match.userAId;

    this.notifyUser(partnerId, "call:reject", {
      matchId: data.matchId,
      rejecterId: userId,
      reason: data.reason || "declined",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * End an active call.
   */
  @SubscribeMessage("call:end")
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    // Clear the missed-call timeout
    const timeout = this.callTimeouts.get(data.matchId);
    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(data.matchId);
    }

    // Update call history
    const callHistoryId = this.activeCalls.get(data.matchId);
    if (callHistoryId) {
      const call = await this.prisma.callHistory.findUnique({
        where: { id: callHistoryId },
        select: { status: true },
      });

      if (call?.status === "ANSWERED") {
        await this.callHistoryService.markEnded(callHistoryId, userId);
      } else if (call?.status === "RINGING") {
        await this.callHistoryService.markCancelled(callHistoryId);
      }
      this.activeCalls.delete(data.matchId);
    }

    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
      select: { userAId: true, userBId: true },
    });

    if (!match) return;

    const partnerId =
      match.userAId === userId ? match.userBId : match.userAId;

    this.notifyUser(partnerId, "call:end", {
      matchId: data.matchId,
      enderId: userId,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── WebRTC Signaling ────────────────────────────────────

  @SubscribeMessage("webrtc:offer")
  async handleWebRTCOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; sdp: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
      select: { userAId: true, userBId: true },
    });

    if (!match) return;

    const partnerId =
      match.userAId === userId ? match.userBId : match.userAId;

    this.notifyUser(partnerId, "webrtc:offer", {
      matchId: data.matchId,
      callerId: userId,
      sdp: data.sdp,
    });
  }

  @SubscribeMessage("webrtc:answer")
  async handleWebRTCAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; sdp: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
      select: { userAId: true, userBId: true },
    });

    if (!match) return;

    const partnerId =
      match.userAId === userId ? match.userBId : match.userAId;

    this.notifyUser(partnerId, "webrtc:answer", {
      matchId: data.matchId,
      answererId: userId,
      sdp: data.sdp,
    });
  }

  @SubscribeMessage("webrtc:ice_candidate")
  async handleICECandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; candidate: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!(await this.validateMatchParticipant(client, userId, data.matchId))) {
      return;
    }

    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
      select: { userAId: true, userBId: true },
    });

    if (!match) return;

    const partnerId =
      match.userAId === userId ? match.userBId : match.userAId;

    this.notifyUser(partnerId, "webrtc:ice_candidate", {
      matchId: data.matchId,
      senderId: userId,
      candidate: data.candidate,
    });
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
   * Broadcast user:online or user:offline to all matched users who are currently connected.
   * Fetches the user's active matches and sends the presence event to each matched partner.
   */
  private async broadcastPresence(
    userId: string,
    isOnline: boolean,
  ): Promise<void> {
    try {
      const matches = await this.prisma.match.findMany({
        where: {
          isActive: true,
          OR: [{ userAId: userId }, { userBId: userId }],
        },
        select: { userAId: true, userBId: true },
      });

      const event = isOnline ? "user:online" : "user:offline";
      const payload = {
        userId,
        isOnline,
        lastSeen: new Date().toISOString(),
      };

      for (const match of matches) {
        const partnerId =
          match.userAId === userId ? match.userBId : match.userAId;
        this.notifyUser(partnerId, event, payload);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to broadcast presence for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
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
