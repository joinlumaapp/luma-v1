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
import { WsConnectionService } from "../../common/providers/ws-connection.service";
import { GameRoomService } from "./game-room.service";

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
 * WebSocket gateway for real-time Game Room interactions.
 * Handles: join/leave rooms, ready/unready, game actions, chat, reactions,
 *          score updates, game finished, rematch, AFK management.
 *
 * Events emitted TO clients:
 *   game:room_updated, game:countdown_start, game:countdown_cancelled,
 *   game:started, game:action, game:message, game:react,
 *   game:score_update, game:finished, game:rematch_request,
 *   game:afk_warning, game:error
 *
 * Events received FROM clients:
 *   game:join_room, game:leave_room, game:ready, game:unready,
 *   game:action, game:send_message, game:react, game:score_update,
 *   game:finished, game:rematch
 */
@WebSocketGateway({
  namespace: "/game-room",
  cors: {
    origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class GameRoomGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameRoomGateway.name);

  /** Maps userId → Set of socketIds (supports multiple devices) */
  private userSockets = new Map<string, Set<string>>();

  /** Maps socketId → roomId the socket has joined */
  private socketRooms = new Map<string, string>();

  /** Maps roomId → countdown timer */
  private countdownTimers = new Map<string, NodeJS.Timeout>();

  /** Maps userId → AFK timer */
  private afkTimers = new Map<string, NodeJS.Timeout>();

  /** Tracks last event timestamps per socket for rate limiting */
  private eventTimestamps = new Map<string, Map<string, number[]>>();

  /** AFK warning timeout in ms (60 seconds) */
  private readonly AFK_WARNING_MS = 60_000;

  /** AFK kick timeout in ms (30 seconds after warning) */
  private readonly AFK_KICK_MS = 30_000;

  /** Countdown duration in seconds */
  private readonly COUNTDOWN_SECONDS = 5;

  constructor(
    private readonly gameRoomService: GameRoomService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly wsConnectionService: WsConnectionService,
  ) {}

  afterInit(): void {
    this.logger.log("Game Room WebSocket Gateway initialized");
  }

  // ─── Connection / Disconnection ────────────────────────────────

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
        "/game-room",
      );

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.emit("game:error", { message: "Kimlik dogrulama basarisiz" });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const userId = client.data?.userId;

    // Auto-leave room if socket was in one
    const roomId = this.socketRooms.get(client.id);
    if (roomId && userId) {
      try {
        await this.gameRoomService.leaveRoom(userId, roomId);
        const roomName = `game-room:${roomId}`;
        client.to(roomName).emit("game:room_updated", {
          roomId,
          event: "player_left",
          userId,
          reason: "disconnect",
          timestamp: new Date().toISOString(),
        });
        this.logger.log(
          `Disconnect: auto-left room ${roomId} for user ${userId}`,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to auto-leave room on disconnect: ${(err as Error).message}`,
        );
      }
    }
    this.socketRooms.delete(client.id);

    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          // Clear AFK timer when user fully disconnects
          this.clearAfkTimer(userId);
        }
      }
      this.eventTimestamps.delete(client.id);

      // Remove connection from Redis
      void this.wsConnectionService.removeConnection(client.id, userId);

      this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
    }
  }

  // ─── Rate Limiting ─────────────────────────────────────────────

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

  // ─── Room Events ───────────────────────────────────────────────

  /**
   * Join a game room.
   * Validates via service, joins Socket.IO room, broadcasts room_updated, starts AFK timer.
   */
  @SubscribeMessage("game:join_room")
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    try {
      const room = await this.gameRoomService.joinRoom(userId, data.roomId);
      const roomName = `game-room:${data.roomId}`;

      await client.join(roomName);
      this.socketRooms.set(client.id, data.roomId);

      // Broadcast room update to all players
      this.server.to(roomName).emit("game:room_updated", {
        roomId: data.roomId,
        event: "player_joined",
        userId,
        room,
        timestamp: new Date().toISOString(),
      });

      // Start AFK timer for the joining user
      this.startAfkTimer(userId, data.roomId);

      this.logger.log(`User ${userId} joined room ${data.roomId}`);
    } catch (err) {
      client.emit("game:error", { message: (err as Error).message });
    }
  }

  /**
   * Leave a game room.
   * Leaves via service, leaves Socket.IO room, broadcasts room_updated.
   */
  @SubscribeMessage("game:leave_room")
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    try {
      await this.gameRoomService.leaveRoom(userId, data.roomId);
      const roomName = `game-room:${data.roomId}`;

      // Broadcast before leaving the socket.io room
      this.server.to(roomName).emit("game:room_updated", {
        roomId: data.roomId,
        event: "player_left",
        userId,
        timestamp: new Date().toISOString(),
      });

      await client.leave(roomName);
      this.socketRooms.delete(client.id);

      // Clear AFK timer
      this.clearAfkTimer(userId);

      // Cancel countdown if active for this room
      this.cancelCountdown(data.roomId);

      this.logger.log(`User ${userId} left room ${data.roomId}`);
    } catch (err) {
      client.emit("game:error", { message: (err as Error).message });
    }
  }

  // ─── Ready / Unready ──────────────────────────────────────────

  /**
   * Set player as ready.
   * If all players are ready (min 2), start countdown.
   */
  @SubscribeMessage("game:ready")
  async handleReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    try {
      const result = await this.gameRoomService.setReady(
        userId,
        data.roomId,
        true,
      );

      const roomName = `game-room:${data.roomId}`;

      // Broadcast room update with ready state
      this.server.to(roomName).emit("game:room_updated", {
        roomId: data.roomId,
        event: "player_ready",
        userId,
        readyCount: result.readyCount,
        totalPlayers: result.totalPlayers,
        timestamp: new Date().toISOString(),
      });

      // If all players ready (min 2), start countdown
      if (result.allReady) {
        this.startCountdown(data.roomId);
      }

      this.logger.log(
        `User ${userId} ready in room ${data.roomId} (${result.readyCount}/${result.totalPlayers})`,
      );
    } catch (err) {
      client.emit("game:error", { message: (err as Error).message });
    }
  }

  /**
   * Unset player ready status.
   * Cancel countdown if active.
   */
  @SubscribeMessage("game:unready")
  async handleUnready(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    try {
      const result = await this.gameRoomService.setReady(
        userId,
        data.roomId,
        false,
      );

      const roomName = `game-room:${data.roomId}`;

      // Cancel countdown if active
      this.cancelCountdown(data.roomId);

      // Broadcast room update
      this.server.to(roomName).emit("game:room_updated", {
        roomId: data.roomId,
        event: "player_unready",
        userId,
        readyCount: result.readyCount,
        totalPlayers: result.totalPlayers,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `User ${userId} unready in room ${data.roomId} (${result.readyCount}/${result.totalPlayers})`,
      );
    } catch (err) {
      client.emit("game:error", { message: (err as Error).message });
    }
  }

  // ─── Game Actions ─────────────────────────────────────────────

  /**
   * Broadcast a game action to all players in the room.
   * Resets the AFK timer for the acting player.
   * Rate limited to 120 actions per minute.
   */
  @SubscribeMessage("game:action")
  async handleAction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { roomId: string; action: string; payload?: Record<string, unknown> },
  ): Promise<void> {
    const userId = this.getUserId(client);

    try {
      // Rate limit actions
      if (this.isRateLimited(client.id, "game:action", 120)) {
        client.emit("game:error", {
          message: "Cok fazla islem gonderiyorsunuz",
        });
        return;
      }

      const roomName = `game-room:${data.roomId}`;

      // Broadcast action to all players in room
      this.server.to(roomName).emit("game:action", {
        roomId: data.roomId,
        userId,
        action: data.action,
        payload: data.payload,
        timestamp: new Date().toISOString(),
      });

      // Reset AFK timer on action
      this.startAfkTimer(userId, data.roomId);
    } catch (err) {
      client.emit("game:error", { message: (err as Error).message });
    }
  }

  // ─── Messaging ────────────────────────────────────────────────

  /**
   * Send a chat message in the game room.
   * Saves via service, broadcasts to room.
   * Rate limited to 60 messages per minute.
   */
  @SubscribeMessage("game:send_message")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; content: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    try {
      // Rate limit messages
      if (this.isRateLimited(client.id, "game:send_message", 60)) {
        client.emit("game:error", {
          message: "Cok fazla mesaj gonderiyorsunuz",
        });
        return;
      }

      if (!data.content?.trim()) {
        client.emit("game:error", { message: "Mesaj bos olamaz" });
        return;
      }

      if (data.content.length > 2000) {
        client.emit("game:error", {
          message: "Mesaj 2000 karakteri asamaz",
        });
        return;
      }

      const message = await this.gameRoomService.saveMessage(
        data.roomId,
        userId,
        data.content.trim(),
      );

      const roomName = `game-room:${data.roomId}`;

      // Broadcast message to room
      this.server.to(roomName).emit("game:message", {
        id: message.id,
        roomId: data.roomId,
        senderId: userId,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt.toISOString(),
      });

      // Reset AFK timer on message
      this.startAfkTimer(userId, data.roomId);
    } catch (err) {
      client.emit("game:error", { message: (err as Error).message });
    }
  }

  // ─── Reactions ────────────────────────────────────────────────

  /**
   * Broadcast a reaction to the room (no DB save, just relay).
   * Rate limited to 30 reactions per minute.
   */
  @SubscribeMessage("game:react")
  async handleReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; reaction: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    try {
      // Rate limit reactions
      if (this.isRateLimited(client.id, "game:react", 30)) {
        client.emit("game:error", {
          message: "Cok fazla reaksiyon gonderiyorsunuz",
        });
        return;
      }

      const roomName = `game-room:${data.roomId}`;

      // Broadcast reaction to room (no DB save)
      this.server.to(roomName).emit("game:react", {
        roomId: data.roomId,
        userId,
        reaction: data.reaction,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      client.emit("game:error", { message: (err as Error).message });
    }
  }

  // ─── Score Updates ────────────────────────────────────────────

  /**
   * Broadcast score updates to the room.
   */
  @SubscribeMessage("game:score_update")
  async handleScoreUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { roomId: string; scores: Record<string, number> },
  ): Promise<void> {
    const userId = this.getUserId(client);

    try {
      const roomName = `game-room:${data.roomId}`;

      // Broadcast scores to room
      this.server.to(roomName).emit("game:score_update", {
        roomId: data.roomId,
        scores: data.scores,
        updatedBy: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      client.emit("game:error", { message: (err as Error).message });
    }
  }

  // ─── Game Finished ────────────────────────────────────────────

  /**
   * Finish the game — call finishGame on service, broadcast results.
   */
  @SubscribeMessage("game:finished")
  async handleFinished(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      roomId: string;
      winnerId: string | null;
      scores: Record<string, number>;
      connectionScores: Record<string, number>;
      durationSeconds: number;
    },
  ): Promise<void> {
    const userId = this.getUserId(client);

    try {
      const result = await this.gameRoomService.finishGame(
        data.roomId,
        data.winnerId,
        data.scores,
        data.connectionScores,
        data.durationSeconds,
      );

      const roomName = `game-room:${data.roomId}`;

      // Broadcast game results to room
      this.server.to(roomName).emit("game:finished", {
        roomId: data.roomId,
        result,
        winnerId: data.winnerId,
        scores: data.scores,
        connectionScores: data.connectionScores,
        durationSeconds: data.durationSeconds,
        finishedBy: userId,
        timestamp: new Date().toISOString(),
      });

      // Clear countdown and AFK timers for this room
      this.cancelCountdown(data.roomId);

      this.logger.log(`Game finished in room ${data.roomId}`);
    } catch (err) {
      client.emit("game:error", { message: (err as Error).message });
    }
  }

  // ─── Rematch ──────────────────────────────────────────────────

  /**
   * Broadcast rematch request to the room.
   */
  @SubscribeMessage("game:rematch")
  async handleRematch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const userId = this.getUserId(client);

    try {
      const roomName = `game-room:${data.roomId}`;

      // Broadcast rematch request to room
      this.server.to(roomName).emit("game:rematch_request", {
        roomId: data.roomId,
        requestedBy: userId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User ${userId} requested rematch in room ${data.roomId}`);
    } catch (err) {
      client.emit("game:error", { message: (err as Error).message });
    }
  }

  // ─── Countdown Logic ─────────────────────────────────────────

  /**
   * Start a 5-second countdown when all players are ready.
   * After countdown completes, starts the game via service.
   */
  private startCountdown(roomId: string): void {
    // Cancel any existing countdown for this room
    this.cancelCountdown(roomId);

    const roomName = `game-room:${roomId}`;
    let remaining = this.COUNTDOWN_SECONDS;

    // Emit initial countdown start
    this.server.to(roomName).emit("game:countdown_start", {
      roomId,
      seconds: remaining,
      timestamp: new Date().toISOString(),
    });

    const timer = setInterval(async () => {
      remaining--;

      if (remaining <= 0) {
        clearInterval(timer);
        this.countdownTimers.delete(roomId);

        try {
          // Start the game via service
          await this.gameRoomService.startGame(roomId);

          this.server.to(roomName).emit("game:started", {
            roomId,
            timestamp: new Date().toISOString(),
          });

          this.logger.log(`Game started in room ${roomId}`);
        } catch (err) {
          this.server.to(roomName).emit("game:error", {
            message: (err as Error).message,
          });
        }
      } else {
        // Emit countdown tick
        this.server.to(roomName).emit("game:countdown_start", {
          roomId,
          seconds: remaining,
          timestamp: new Date().toISOString(),
        });
      }
    }, 1000);

    this.countdownTimers.set(roomId, timer);
    this.logger.log(`Countdown started for room ${roomId}`);
  }

  /**
   * Cancel an active countdown for a room.
   */
  private cancelCountdown(roomId: string): void {
    const timer = this.countdownTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.countdownTimers.delete(roomId);

      const roomName = `game-room:${roomId}`;
      this.server.to(roomName).emit("game:countdown_cancelled", {
        roomId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Countdown cancelled for room ${roomId}`);
    }
  }

  // ─── AFK Management ──────────────────────────────────────────

  /**
   * Start or reset the AFK timer for a user.
   * 60 seconds of no action → warning
   * 30 more seconds → auto-kick
   */
  private startAfkTimer(userId: string, roomId: string): void {
    // Clear existing AFK timer
    this.clearAfkTimer(userId);

    // Set warning timer (60 seconds)
    const warningTimer = setTimeout(() => {
      // Emit AFK warning to the user
      this.emitToUser(userId, "game:afk_warning", {
        roomId,
        message: "Hareket algilanamiyor. 30 saniye icinde cikarilacaksiniz.",
        timestamp: new Date().toISOString(),
      });

      // Set kick timer (30 more seconds)
      const kickTimer = setTimeout(async () => {
        try {
          await this.gameRoomService.leaveRoom(userId, roomId);

          const roomName = `game-room:${roomId}`;
          this.server.to(roomName).emit("game:room_updated", {
            roomId,
            event: "player_left",
            userId,
            reason: "afk",
            timestamp: new Date().toISOString(),
          });

          // Also notify the kicked user
          this.emitToUser(userId, "game:room_updated", {
            roomId,
            event: "kicked_afk",
            userId,
            timestamp: new Date().toISOString(),
          });

          // Remove socket from room tracking
          const socketIds = this.userSockets.get(userId);
          if (socketIds) {
            for (const socketId of socketIds) {
              if (this.socketRooms.get(socketId) === roomId) {
                this.socketRooms.delete(socketId);
              }
            }
          }

          // Cancel countdown if active
          this.cancelCountdown(roomId);

          this.logger.log(
            `User ${userId} auto-kicked from room ${roomId} (AFK)`,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to auto-kick AFK user ${userId}: ${(err as Error).message}`,
          );
        }
      }, this.AFK_KICK_MS);

      this.afkTimers.set(userId, kickTimer);
    }, this.AFK_WARNING_MS);

    this.afkTimers.set(userId, warningTimer);
  }

  /**
   * Clear the AFK timer for a user.
   */
  private clearAfkTimer(userId: string): void {
    const timer = this.afkTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.afkTimers.delete(userId);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private getUserId(client: AuthenticatedSocket): string {
    const userId = client.data?.userId;
    if (!userId) {
      throw new WsException("Kimlik dogrulama gerekli");
    }
    return userId;
  }

  /**
   * Emit an event to all connected sockets for a specific user.
   */
  private emitToUser(
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
    this.emitToUser(userId, event, data);
  }
}
