import { Global, Module } from "@nestjs/common";
import { LumaCacheService } from "./cache.service";

/**
 * CacheModule — Global Redis cache layer for LUMA V1.
 *
 * Registered as @Global so every feature module can inject
 * LumaCacheService without importing CacheModule explicitly.
 */
@Global()
@Module({
  providers: [LumaCacheService],
  exports: [LumaCacheService],
})
export class CacheModule {}
