import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { CreateReportDto, CreateBlockDto } from './dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Moderation')
@ApiBearerAuth()
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('report')
  @ApiOperation({ summary: 'Report a user for review' })
  async reportUser(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderationService.reportUser(userId, dto);
  }

  @Post('block')
  @ApiOperation({ summary: 'Block a user' })
  async blockUser(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.moderationService.blockUser(userId, dto);
  }

  @Delete('block/:userId')
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(
    @CurrentUser('sub') userId: string,
    @Param('userId') blockedUserId: string,
  ) {
    return this.moderationService.unblockUser(userId, blockedUserId);
  }

  @Get('blocked')
  @ApiOperation({ summary: 'Get list of blocked users' })
  async getBlockedUsers(@CurrentUser('sub') userId: string) {
    return this.moderationService.getBlockedUsers(userId);
  }

  // ─── Photo Moderation (Admin Only) ──────────────────────────

  @Get('photos/pending')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get photos pending moderation review (admin only)' })
  async getPendingPhotos(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.moderationService.getPendingPhotos(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Patch('photos/:photoId/approve')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Approve a photo for public display (admin only)' })
  async approvePhoto(
    @CurrentUser('sub') adminUserId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.moderationService.approvePhoto(photoId, adminUserId);
  }

  @Patch('photos/:photoId/reject')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Reject and delete a photo (admin only)' })
  async rejectPhoto(
    @CurrentUser('sub') adminUserId: string,
    @Param('photoId') photoId: string,
    @Body() body: { reason?: string },
  ) {
    return this.moderationService.rejectPhoto(photoId, adminUserId, body.reason);
  }
}
