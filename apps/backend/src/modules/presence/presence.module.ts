import { Module } from "@nestjs/common";
import { PresenceController } from "./presence.controller";
import { PresenceService } from "./presence.service";

/**
 * PresenceModule — User online/offline tracking via Redis heartbeats.
 *
 * Uses the global LumaCacheService (from CacheModule) for Redis access.
 * No additional imports needed since CacheModule is @Global.
 */
@Module({
  controllers: [PresenceController],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
