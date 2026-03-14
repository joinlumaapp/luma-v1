import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PresenceService, UserPresenceStatus } from './presence.service';

/**
 * PresenceController — REST endpoints for user online/offline tracking.
 *
 * All endpoints require JWT authentication (global guard).
 * Mobile client calls heartbeat on foreground, offline on background.
 */
@Controller('presence')
export class PresenceController {
  private readonly logger = new Logger(PresenceController.name);

  constructor(private readonly presenceService: PresenceService) {}

  /**
   * POST /presence/heartbeat
   * Called periodically by the mobile app to signal the user is active.
   */
  @Post('heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  async heartbeat(@CurrentUser('sub') userId: string): Promise<void> {
    await this.presenceService.heartbeat(userId);
  }

  /**
   * POST /presence/offline
   * Called when the mobile app goes to background.
   */
  @Post('offline')
  @HttpCode(HttpStatus.NO_CONTENT)
  async offline(@CurrentUser('sub') userId: string): Promise<void> {
    await this.presenceService.setOffline(userId);
  }

  /**
   * POST /presence/batch
   * Returns online status for a list of user IDs.
   * Used by the chat list to show green dots.
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async batch(
    @CurrentUser('sub') _userId: string,
    @Body() body: { userIds: string[] },
  ): Promise<Record<string, UserPresenceStatus>> {
    const userIds = body.userIds ?? [];

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return {};
    }

    // Cap at 100 to prevent abuse
    const capped = userIds.slice(0, 100);
    return this.presenceService.getOnlineStatuses(capped);
  }
}
