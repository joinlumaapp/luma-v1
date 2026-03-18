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
import { PrismaService } from "../../prisma/prisma.service";
import { WsConnectionService } from "../../common/providers/ws-connection.service";
import { HarmonyService } from "./harmony.service";

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
 * WebSocket gateway for real-time Harmony Room interactions.
 * Handles: join/leave rooms, card reveals, reactions, messages, timer sync.
 *
 * Events emitted TO clients:
 *   harmony:user_joined, harmony:user_left,
 *   harmony:card_revealed, harmony:reaction,
 *   harmony:message, harmony:session_ended,
 *   harmony:timer_sync, harmony:error
 *
 * Events received FROM clients:
 *   harmony:join, harmony:leave,
 *   harmony:reveal_card, harmony:react,
 *   harmony:send_message, harmony:request_timer
 */
@WebSocketGateway({
  namespace: "/harmony",
  cors: {
    origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class HarmonyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(HarmonyGateway.name);

  /** Maps userId → Set of socketIds (supports multiple devices) */
  private userSockets = new Map<string, Set<string>>();

  /** Maps socketId → Set of sessionIds the socket has joined */
  private readonly socketSessions = new Map<string, Set<string>>();

  /** Maps sessionId → timer interval for periodic timer sync broadcasts */
  private readonly sessionTimerIntervals = new Map<string, ReturnType<typeof setInterval>>();

  /** Tracks last event timestamps per socket for rate limiting */
  private eventTimestamps = new Map<string, Map<string, number[]>>();

  constructor(
    private readonly harmonyService: HarmonyService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly wsConnectionService: WsConnectionService,
  ) {}

  afterInit(): void {
    this.logger.log("Harmony WebSocket Gateway initialized");
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
        "/harmony",
      );

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.emit("harmony:error", { message: "Kimlik dogrulama basarisiz" });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const userId = client.data?.userId;

    // Notify all rooms that the user has left before cleaning up
    const sessions = this.socketSessions.get(client.id);
    if (sessions && userId) {
      for (const sessionId of sessions) {
        const roomName = `harmony:${sessionId}`;
        client.to(roomName).emit("harmony:user_left", {
          userId,
          sessionId,
          timestamp: new Date().toISOString(),
        });
        this.logger.log(
          `Disconnect: notified room ${roomName} that user ${userId} left`,
        );
      }
    }
    this.socketSessions.delete(client.id);

    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.eventTimestamps.delete(client.id);

      // Remove connection from Redis
      void this.wsConnectionService.removeConnection(client.id, userId);

      this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
    }
  }

  /**
   * Simple per-socket rate limiter. Returns true if the event should be rejected.
   * @param socketId - Socket ID to rate limit
   * @param event - Event name for tracking
   * @param maxPerMinute - Maximum events allowed per 60-second window
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

  // ─── Session Events ──────────────────────────────────────────

  /**
   * Join a Harmony Room session.
   * Validates user is a participant, joins Socket.IO room, notifies partner.
   */
  @SubscribeMessage("harmony:join")
  async handleJoinSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    // Validate session and participation
    const session = await this.prisma.harmonySession.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) {
      client.emit("harmony:error", { message: "Oturum bulunamadi" });
      return;
    }

    if (session.userAId !== userId && session.userBId !== userId) {
      client.emit("harmony:error", {
        message: "Bu oturumun katilimcisi degilsiniz",
      });
      return;
    }

    // Check if session is still active
    if (!["PENDING", "ACTIVE", "EXTENDED"].includes(session.status)) {
      client.emit("harmony:error", { message: "Bu oturum sona ermis" });
      return;
    }

    // Activate pending session when first user joins
    let currentStatus = session.status;
    let currentEndsAt = session.endsAt;
    if (session.status === "PENDING") {
      const now = new Date();
      currentEndsAt = new Date(now.getTime() + 30 * 60 * 1000);
      currentStatus = "ACTIVE";
      await this.prisma.harmonySession.update({
        where: { id: data.sessionId },
        data: {
          status: currentStatus,
          startedAt: now,
          endsAt: currentEndsAt,
        },
      });
    }

    const roomName = `harmony:${data.sessionId}`;
    await client.join(roomName);

    // Track which sessions this socket has joined
    const existingSessions =
      this.socketSessions.get(client.id) || new Set<string>();
    existingSessions.add(data.sessionId);
    this.socketSessions.set(client.id, existingSessions);

    // Calculate remaining time using the up-to-date endsAt
    const remainingMs = currentEndsAt
      ? Math.max(0, currentEndsAt.getTime() - Date.now())
      : 30 * 60 * 1000;

    // Send current session state to the joining user
    client.emit("harmony:session_state", {
      sessionId: data.sessionId,
      status: currentStatus,
      remainingSeconds: Math.floor(remainingMs / 1000),
      hasVoiceChat: session.hasVoiceChat,
      hasVideoChat: session.hasVideoChat,
    });

    // Start periodic timer sync if not already running for this session
    if (!this.sessionTimerIntervals.has(data.sessionId)) {
      const timerInterval = setInterval(async () => {
        const sess = await this.prisma.harmonySession.findUnique({
          where: { id: data.sessionId },
        });
        if (!sess || !["ACTIVE", "EXTENDED"].includes(sess.status)) {
          this.clearSessionTimer(data.sessionId);
          return;
        }
        const remaining = sess.endsAt
          ? Math.max(0, sess.endsAt.getTime() - Date.now())
          : 0;
        if (remaining === 0) {
          // Auto-end expired session
          await this.prisma.harmonySession.update({
            where: { id: data.sessionId },
            data: { status: "ENDED", actualEndedAt: new Date() },
          });
          this.server
            .to(`harmony:${data.sessionId}`)
            .emit("harmony:session_ended", {
              sessionId: data.sessionId,
              reason: "time_expired",
            });
          this.clearSessionTimer(data.sessionId);
          return;
        }
        this.server.to(`harmony:${data.sessionId}`).emit("harmony:timer_sync", {
          sessionId: data.sessionId,
          remainingSeconds: Math.floor(remaining / 1000),
          status: sess.status,
        });
      }, 30_000); // Broadcast every 30 seconds
      this.sessionTimerIntervals.set(data.sessionId, timerInterval);
    }

    // Notify partner
    this.server.to(roomName).emit("harmony:user_joined", {
      userId,
      sessionId: data.sessionId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User ${userId} joined session ${data.sessionId}`);
  }

  /**
   * Leave a Harmony Room session.
   */
  @SubscribeMessage("harmony:leave")
  async handleLeaveSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);
    const roomName = `harmony:${data.sessionId}`;

    // Notify partner before leaving
    this.server.to(roomName).emit("harmony:user_left", {
      userId,
      sessionId: data.sessionId,
      timestamp: new Date().toISOString(),
    });

    await client.leave(roomName);

    // Remove session from socket tracking
    const sessions = this.socketSessions.get(client.id);
    if (sessions) {
      sessions.delete(data.sessionId);
    }

    // Clear periodic timer if no more sockets are in this session room
    const roomSockets = await this.server.in(roomName).fetchSockets();
    if (roomSockets.length === 0) {
      this.clearSessionTimer(data.sessionId);
    }

    this.logger.log(`User ${userId} left session ${data.sessionId}`);
  }

  // ─── Card Events ─────────────────────────────────────────────

  /**
   * Reveal a harmony card in the session.
   * Marks the card as revealed in DB, broadcasts to room.
   */
  @SubscribeMessage("harmony:reveal_card")
  async handleRevealCard(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; cardId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    // Verify user is participant
    const session = await this.prisma.harmonySession.findUnique({
      where: { id: data.sessionId },
    });

    if (
      !session ||
      (session.userAId !== userId && session.userBId !== userId)
    ) {
      client.emit("harmony:error", { message: "Yetkisiz islem" });
      return;
    }

    // Verify card belongs to this session
    const usedCard = await this.prisma.harmonyUsedCard.findFirst({
      where: {
        sessionId: data.sessionId,
        OR: [{ questionCardId: data.cardId }, { gameCardId: data.cardId }],
      },
      include: { questionCard: true, gameCard: true },
    });

    if (!usedCard) {
      client.emit("harmony:error", { message: "Kart bulunamadi" });
      return;
    }

    // Build card data for broadcast
    const cardData = usedCard.questionCard
      ? {
          type: "question" as const,
          id: usedCard.questionCard.id,
          category: usedCard.questionCard.category,
          textTr: usedCard.questionCard.textTr,
          textEn: usedCard.questionCard.textEn,
        }
      : {
          type: "game" as const,
          id: usedCard.gameCard!.id,
          nameTr: usedCard.gameCard!.nameTr,
          nameEn: usedCard.gameCard!.nameEn,
          descriptionTr: usedCard.gameCard!.descriptionTr,
          gameType: usedCard.gameCard!.gameType,
        };

    // Log card reveal to database as a SYSTEM message for analytics
    this.prisma.harmonyMessage
      .create({
        data: {
          sessionId: data.sessionId,
          senderId: userId,
          content: `card_revealed:${data.cardId}`,
          type: "SYSTEM",
        },
      })
      .catch((err: Error) =>
        this.logger.warn(`Failed to persist card reveal: ${err.message}`),
      );

    // Broadcast card reveal to room
    this.server.to(`harmony:${data.sessionId}`).emit("harmony:card_revealed", {
      ...cardData,
      revealedBy: userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send a reaction to a card.
   * Rate limited to 30 reactions per minute to prevent spam.
   */
  @SubscribeMessage("harmony:react")
  async handleReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { sessionId: string; cardId: string; reaction: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    // Rate limit reactions
    if (this.isRateLimited(client.id, "harmony:react", 30)) {
      client.emit("harmony:error", {
        message: "Cok fazla reaksiyon gonderiyorsunuz",
      });
      return;
    }

    if (!data.cardId) {
      client.emit("harmony:error", { message: "Kart kimlik bilgisi gerekli" });
      return;
    }

    const validReactions = [
      "love",
      "laugh",
      "think",
      "surprise",
      "agree",
      "disagree",
    ];
    if (!validReactions.includes(data.reaction)) {
      client.emit("harmony:error", { message: "Gecersiz reaksiyon tipi" });
      return;
    }

    // Log reaction to database for analytics (non-blocking)
    this.prisma.harmonyMessage
      .create({
        data: {
          sessionId: data.sessionId,
          senderId: userId,
          content: `reaction:${data.reaction}:${data.cardId}`,
          type: "SYSTEM",
        },
      })
      .catch((err: Error) =>
        this.logger.warn(`Failed to persist reaction: ${err.message}`),
      );

    // Broadcast reaction to room
    this.server.to(`harmony:${data.sessionId}`).emit("harmony:reaction", {
      cardId: data.cardId,
      reaction: data.reaction,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Typing Indicator ────────────────────────────────────────

  /**
   * Handle typing indicator events.
   * Broadcasts typing state to the other user in the room.
   * Rate limited to 10 events per minute to prevent spam.
   */
  @SubscribeMessage("harmony:typing")
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; isTyping: boolean },
  ): Promise<void> {
    const userId = this.getUserId(client);

    // Rate limit typing events
    if (this.isRateLimited(client.id, "harmony:typing", 10)) {
      return;
    }

    // Validate session participation
    const session = await this.prisma.harmonySession.findUnique({
      where: { id: data.sessionId },
    });

    if (
      !session ||
      (session.userAId !== userId && session.userBId !== userId)
    ) {
      return; // Silently ignore invalid typing events
    }

    // Broadcast typing state to the room (excluding the sender)
    client.to(`harmony:${data.sessionId}`).emit("harmony:typing", {
      userId,
      isTyping: data.isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Messaging ───────────────────────────────────────────────

  /**
   * Send a text message in the Harmony Room.
   * Rate limited to 60 messages per minute.
   */
  @SubscribeMessage("harmony:send_message")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; content: string; type?: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    // Rate limit messages
    if (this.isRateLimited(client.id, "harmony:send_message", 60)) {
      client.emit("harmony:error", {
        message: "Cok fazla mesaj gonderiyorsunuz",
      });
      return;
    }

    if (!data.content?.trim()) {
      client.emit("harmony:error", { message: "Mesaj bos olamaz" });
      return;
    }

    // Enforce max message length
    if (data.content.length > 2000) {
      client.emit("harmony:error", { message: "Mesaj 2000 karakteri asamaz" });
      return;
    }

    // Verify participation
    const session = await this.prisma.harmonySession.findUnique({
      where: { id: data.sessionId },
    });

    if (
      !session ||
      (session.userAId !== userId && session.userBId !== userId)
    ) {
      client.emit("harmony:error", { message: "Yetkisiz islem" });
      return;
    }

    if (!["ACTIVE", "EXTENDED"].includes(session.status)) {
      client.emit("harmony:error", { message: "Oturum aktif degil" });
      return;
    }

    // Save message to database
    const message = await this.prisma.harmonyMessage.create({
      data: {
        sessionId: data.sessionId,
        senderId: userId,
        content: data.content.trim(),
        type:
          (data.type as "TEXT" | "QUESTION_CARD" | "GAME_CARD" | "SYSTEM") ||
          "TEXT",
      },
    });

    // Broadcast to room
    this.server.to(`harmony:${data.sessionId}`).emit("harmony:message", {
      id: message.id,
      senderId: userId,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt.toISOString(),
    });
  }

  // ─── Read Receipts ──────────────────────────────────────────

  /**
   * Handle message read receipt events.
   * When a user reads a message, broadcast read receipt to the sender.
   */
  @SubscribeMessage("harmony:message_read")
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; messageIds: string[] },
  ): Promise<void> {
    const userId = this.getUserId(client);

    // Validate session participation
    const session = await this.prisma.harmonySession.findUnique({
      where: { id: data.sessionId },
    });

    if (
      !session ||
      (session.userAId !== userId && session.userBId !== userId)
    ) {
      return;
    }

    if (!data.messageIds || data.messageIds.length === 0) {
      return;
    }

    // Update read status in the database
    await this.prisma.harmonyMessage.updateMany({
      where: {
        id: { in: data.messageIds },
        sessionId: data.sessionId,
        senderId: { not: userId }, // Only mark other user's messages as read
      },
      data: { readAt: new Date() },
    });

    // Broadcast read receipt to the room (the sender will see the double-check marks)
    client.to(`harmony:${data.sessionId}`).emit("harmony:read_receipt", {
      messageIds: data.messageIds,
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }

  // ─── Timer ───────────────────────────────────────────────────

  /**
   * Client requests current timer state (for reconnection sync).
   */
  @SubscribeMessage("harmony:request_timer")
  async handleTimerRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ): Promise<void> {
    const session = await this.prisma.harmonySession.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) return;

    const remainingMs = session.endsAt
      ? Math.max(0, session.endsAt.getTime() - Date.now())
      : 0;

    // Auto-end expired sessions
    if (remainingMs === 0 && ["ACTIVE", "EXTENDED"].includes(session.status)) {
      await this.prisma.harmonySession.update({
        where: { id: data.sessionId },
        data: { status: "ENDED", actualEndedAt: new Date() },
      });

      this.server
        .to(`harmony:${data.sessionId}`)
        .emit("harmony:session_ended", {
          sessionId: data.sessionId,
          reason: "time_expired",
        });
      return;
    }

    client.emit("harmony:timer_sync", {
      sessionId: data.sessionId,
      remainingSeconds: Math.floor(remainingMs / 1000),
      status: session.status,
    });
  }

  // ─── WebRTC Call Signaling ─────────────────────────────────────

  /**
   * Verify user is a participant in an active session. Returns false and emits
   * an error if validation fails, so callers can short-circuit.
   */
  private async validateSessionParticipant(
    client: AuthenticatedSocket,
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    const session = await this.prisma.harmonySession.findUnique({
      where: { id: sessionId },
    });

    if (
      !session ||
      (session.userAId !== userId && session.userBId !== userId)
    ) {
      client.emit("harmony:error", { message: "Yetkisiz islem" });
      return false;
    }

    if (!["ACTIVE", "EXTENDED"].includes(session.status)) {
      client.emit("harmony:error", { message: "Oturum aktif degil" });
      return false;
    }

    return true;
  }

  /**
   * Initiate a voice or video call in the Harmony Room.
   * Voice calls proceed directly. Video calls require dual consent first.
   * Validates session participation before broadcasting.
   */
  @SubscribeMessage("harmony:call_initiate")
  async handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; callType: "voice" | "video" },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!data.callType || !["voice", "video"].includes(data.callType)) {
      client.emit("harmony:error", { message: "Gecersiz arama tipi" });
      return;
    }

    if (
      !(await this.validateSessionParticipant(client, userId, data.sessionId))
    ) {
      return;
    }

    this.logger.log(
      `User ${userId} initiating ${data.callType} call in session ${data.sessionId}`,
    );

    if (data.callType === "video") {
      // Video calls require dual consent — send consent request to the partner
      const session = await this.prisma.harmonySession.findUnique({
        where: { id: data.sessionId },
      });
      if (!session) return;

      const targetUserId =
        session.userAId === userId ? session.userBId : session.userAId;
      this.server
        .to(`user:${targetUserId}`)
        .emit("harmony:video_consent_request", {
          sessionId: data.sessionId,
          requesterId: userId,
        });
      // Also broadcast to the Harmony room so that the partner receives the event
      // even if they have not joined the user-specific room
      client
        .to(`harmony:${data.sessionId}`)
        .emit("harmony:video_consent_request", {
          sessionId: data.sessionId,
          requesterId: userId,
        });
      return;
    }

    // Voice calls proceed directly
    client.to(`harmony:${data.sessionId}`).emit("harmony:call_initiate", {
      callerId: userId,
      callType: data.callType,
    });
  }

  // ─── Video Consent Flow ─────────────────────────────────────────

  /**
   * Request video consent from the partner.
   * Emits harmony:video_consent_request to the target user.
   */
  @SubscribeMessage("harmony:video_consent_request")
  async handleVideoConsentRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; targetUserId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (
      !(await this.validateSessionParticipant(client, userId, data.sessionId))
    ) {
      return;
    }

    // Emit consent request to the target user
    this.server
      .to(`user:${data.targetUserId}`)
      .emit("harmony:video_consent_request", {
        sessionId: data.sessionId,
        requesterId: userId,
      });
  }

  /**
   * Respond to a video consent request.
   * If accepted, notifies the requester to proceed with the video call.
   * If rejected, notifies the requester that consent was denied.
   */
  @SubscribeMessage("harmony:video_consent_response")
  async handleVideoConsentResponse(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { sessionId: string; requesterId: string; accepted: boolean },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (
      !(await this.validateSessionParticipant(client, userId, data.sessionId))
    ) {
      return;
    }

    if (data.accepted) {
      // Both parties consented — notify requester to proceed with video call
      this.server
        .to(`user:${data.requesterId}`)
        .emit("harmony:video_consent_accepted", {
          sessionId: data.sessionId,
          acceptedBy: userId,
        });
      // Also broadcast to the Harmony room
      this.server
        .to(`harmony:${data.sessionId}`)
        .emit("harmony:video_consent_accepted", {
          sessionId: data.sessionId,
          acceptedBy: userId,
        });
    } else {
      // Consent rejected — notify requester
      this.server
        .to(`user:${data.requesterId}`)
        .emit("harmony:video_consent_rejected", {
          sessionId: data.sessionId,
          rejectedBy: userId,
        });
      // Also broadcast to the Harmony room
      this.server
        .to(`harmony:${data.sessionId}`)
        .emit("harmony:video_consent_rejected", {
          sessionId: data.sessionId,
          rejectedBy: userId,
        });
    }
  }

  /**
   * Accept an incoming call in the Harmony Room.
   * Validates session participation before notifying the caller.
   */
  @SubscribeMessage("harmony:call_accept")
  async handleCallAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (
      !(await this.validateSessionParticipant(client, userId, data.sessionId))
    ) {
      return;
    }

    this.logger.log(
      `User ${userId} accepted call in session ${data.sessionId}`,
    );

    client.to(`harmony:${data.sessionId}`).emit("harmony:call_accept", {
      accepterId: userId,
    });
  }

  /**
   * Reject an incoming call in the Harmony Room.
   * Validates session participation before notifying the caller.
   */
  @SubscribeMessage("harmony:call_reject")
  async handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; reason?: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (
      !(await this.validateSessionParticipant(client, userId, data.sessionId))
    ) {
      return;
    }

    this.logger.log(
      `User ${userId} rejected call in session ${data.sessionId}`,
    );

    client.to(`harmony:${data.sessionId}`).emit("harmony:call_reject", {
      rejecterId: userId,
      reason: data.reason,
    });
  }

  /**
   * End the current call in the Harmony Room.
   * Validates session participation before notifying the partner.
   */
  @SubscribeMessage("harmony:call_end")
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (
      !(await this.validateSessionParticipant(client, userId, data.sessionId))
    ) {
      return;
    }

    this.logger.log(`User ${userId} ended call in session ${data.sessionId}`);

    client.to(`harmony:${data.sessionId}`).emit("harmony:call_end", {
      enderId: userId,
    });
  }

  /**
   * Relay WebRTC offer SDP to the other participant.
   * Validates session participation before relaying.
   */
  @SubscribeMessage("harmony:webrtc_offer")
  async handleWebRTCOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; sdp: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!data.sdp) {
      client.emit("harmony:error", { message: "SDP verisi gerekli" });
      return;
    }

    if (
      !(await this.validateSessionParticipant(client, userId, data.sessionId))
    ) {
      return;
    }

    this.logger.log(`WebRTC offer from ${userId} in session ${data.sessionId}`);

    client.to(`harmony:${data.sessionId}`).emit("harmony:webrtc_offer", {
      callerId: userId,
      sdp: data.sdp,
    });
  }

  /**
   * Relay WebRTC answer SDP to the other participant.
   * Validates session participation before relaying.
   */
  @SubscribeMessage("harmony:webrtc_answer")
  async handleWebRTCAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; sdp: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!data.sdp) {
      client.emit("harmony:error", { message: "SDP verisi gerekli" });
      return;
    }

    if (
      !(await this.validateSessionParticipant(client, userId, data.sessionId))
    ) {
      return;
    }

    this.logger.log(
      `WebRTC answer from ${userId} in session ${data.sessionId}`,
    );

    client.to(`harmony:${data.sessionId}`).emit("harmony:webrtc_answer", {
      answererId: userId,
      sdp: data.sdp,
    });
  }

  /**
   * Relay ICE candidate to the other participant.
   * Validates session participation before relaying.
   */
  @SubscribeMessage("harmony:webrtc_ice_candidate")
  async handleICECandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; candidate: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    if (!data.candidate) {
      return; // ICE candidates can be empty at the end of gathering
    }

    if (
      !(await this.validateSessionParticipant(client, userId, data.sessionId))
    ) {
      return;
    }

    client
      .to(`harmony:${data.sessionId}`)
      .emit("harmony:webrtc_ice_candidate", {
        senderId: userId,
        candidate: data.candidate,
      });
  }

  // ─── Helpers ─────────────────────────────────────────────────

  /**
   * Clear the periodic timer sync interval for a session.
   */
  private clearSessionTimer(sessionId: string): void {
    const interval = this.sessionTimerIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.sessionTimerIntervals.delete(sessionId);
      this.logger.log(`Timer sync cleared for session ${sessionId}`);
    }
  }

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
