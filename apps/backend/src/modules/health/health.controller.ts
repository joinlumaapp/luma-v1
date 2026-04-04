import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { LumaCacheService } from "../cache/cache.service";

@ApiTags("Health")
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: LumaCacheService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Health check — API, database and cache status" })
  @ApiResponse({ status: 200, description: "Service health status" })
  async check() {
    const services: Record<string, string> = { api: "ok" };

    // Database check using parameterized query (safe from SQL injection)
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = "ok";
    } catch {
      services.database = "error";
    }

    // Redis cache check
    services.cache = this.cache.isRedisConnected() ? "ok" : "unavailable";

    const allOk = Object.values(services).every(
      (v) => v === "ok" || v === "unavailable",
    );
    const hasError = Object.values(services).some((v) => v === "error");

    return {
      status: hasError ? "degraded" : allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      uptime: Math.floor(process.uptime()),
      services,
    };
  }

  @Public()
  @Get("ping")
  @ApiOperation({ summary: "Simple ping/pong liveness check" })
  @ApiResponse({ status: 200, description: "Pong response" })
  ping() {
    return { status: "pong", timestamp: new Date().toISOString() };
  }
}
