import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BadgesService } from './badges.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Badges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available badges' })
  async getAllBadges() {
    return this.badgesService.getAllBadges();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get badges earned by current user' })
  async getMyBadges(@CurrentUser('sub') userId: string) {
    return this.badgesService.getMyBadges(userId);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get detailed badge progress for current user' })
  async getBadgeProgress(@CurrentUser('sub') userId: string) {
    const progress = await this.badgesService.getBadgeProgress(userId);
    return {
      badges: progress,
      total: progress.length,
      earned: progress.filter((b) => b.isEarned).length,
    };
  }
}
