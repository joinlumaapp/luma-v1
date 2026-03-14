import { Injectable, Logger } from '@nestjs/common';
import { LumaCacheService } from '../cache/cache.service';

/** Presence TTL in seconds — user is considered offline after this. */
const PRESENCE_TTL_SECONDS = 300; // 5 minutes

/** Redis key prefix for presence data. */
const PRESENCE_KEY_PREFIX = 'presence';

interface PresenceData {
  lastSeen: string;
}

export interface UserPresenceStatus {
  isOnline: boolean;
  lastSeen: string | null;
}

/**
 * PresenceService — Redis-based user online/offline tracking.
 *
 * Each heartbeat stores a timestamp in Redis with a 5-minute TTL.
 * If the key exists, the user is online. If it has expired, they are offline.
 */
@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(private readonly cache: LumaCacheService) {}

  /**
   * Update a user's presence heartbeat.
   * Sets/refreshes a Redis key with 5-minute TTL.
   */
  async heartbeat(userId: string): Promise<void> {
    const key = this.buildKey(userId);
    const data: PresenceData = { lastSeen: new Date().toISOString() };
    await this.cache.set(key, data, PRESENCE_TTL_SECONDS);
    this.logger.debug(`Heartbeat received for user ${userId}`);
  }

  /**
   * Explicitly mark a user as offline by removing their presence key.
   */
  async setOffline(userId: string): Promise<void> {
    const key = this.buildKey(userId);
    await this.cache.del(key);
    this.logger.debug(`User ${userId} marked offline`);
  }

  /**
   * Check if a single user is currently online.
   */
  async isOnline(userId: string): Promise<boolean> {
    const data = await this.cache.get<PresenceData>(this.buildKey(userId));
    return data !== null;
  }

  /**
   * Get the last seen timestamp for a user.
   * Returns null if the user has never sent a heartbeat (or TTL expired).
   */
  async getLastSeen(userId: string): Promise<string | null> {
    const data = await this.cache.get<PresenceData>(this.buildKey(userId));
    return data?.lastSeen ?? null;
  }

  /**
   * Batch check online status for multiple users.
   * Returns a map of userId -> { isOnline, lastSeen }.
   */
  async getOnlineStatuses(
    userIds: string[],
  ): Promise<Record<string, UserPresenceStatus>> {
    const result: Record<string, UserPresenceStatus> = {};

    // Fetch all in parallel
    const entries = await Promise.all(
      userIds.map(async (userId) => {
        const data = await this.cache.get<PresenceData>(this.buildKey(userId));
        return { userId, data };
      }),
    );

    for (const { userId, data } of entries) {
      result[userId] = {
        isOnline: data !== null,
        lastSeen: data?.lastSeen ?? null,
      };
    }

    return result;
  }

  private buildKey(userId: string): string {
    return `${PRESENCE_KEY_PREFIX}:${userId}`;
  }
}
