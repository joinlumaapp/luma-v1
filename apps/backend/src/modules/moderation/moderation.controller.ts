import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { CreateReportDto, CreateBlockDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
}
