import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ServerOptions } from "socket.io";

/**
 * RedisIoAdapter — Socket.IO adapter backed by Redis pub/sub for horizontal scaling.
 *
 * When REDIS_URL is configured, all Socket.IO events are published through Redis
 * so that multiple backend instances share the same rooms and broadcasts.
 *
 * Falls back gracefully to the default in-memory adapter when Redis is unavailable,
 * which is fine for single-instance deployments and local development.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;
  private readonly logger = new Logger("RedisIoAdapter");
  private pubClient: Redis | undefined;
  private subClient: Redis | undefined;

  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = this.configService.get<string>("REDIS_URL");
    if (!redisUrl) {
      this.logger.warn(
        "REDIS_URL not configured — Socket.IO will use in-memory adapter (single-instance only)",
      );
      return;
    }

    try {
      this.pubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number): number | null {
          if (times > 5) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
        enableReadyCheck: true,
      });

      this.subClient = this.pubClient.duplicate();

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
      this.logger.log("Socket.IO Redis adapter connected successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to connect Socket.IO Redis adapter — falling back to in-memory: ${message}`,
      );
      // Clean up partial connections
      await this.pubClient?.quit().catch(() => {});
      await this.subClient?.quit().catch(() => {});
      this.pubClient = undefined;
      this.subClient = undefined;
    }
  }

  createIOServer(port: number, options?: Partial<ServerOptions>) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin:
          this.configService.get<string>("CORS_ORIGINS")?.split(",") || ["*"],
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 30_000,
      pingInterval: 10_000,
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }

  /**
   * Clean up Redis connections on application shutdown.
   */
  async dispose(): Promise<void> {
    await this.pubClient?.quit().catch(() => {});
    await this.subClient?.quit().catch(() => {});
    this.logger.log("Socket.IO Redis adapter connections closed");
  }
}
