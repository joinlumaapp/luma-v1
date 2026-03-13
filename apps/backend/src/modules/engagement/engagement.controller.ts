import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface AuthRequest {
  user: { sub: string };
}

@Controller('engagement')
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  // ── Daily Reward ──

  @Post('daily-reward/claim')
  async claimDailyReward(
    @Req() req: AuthRequest,
    @Body() body: { day: number; jetons: number },
  ) {
    return this.engagementService.claimDailyReward(req.user.sub, body.day);
  }

  // ── Challenge Progress ──

  @Post('challenge/progress')
  async updateChallengeProgress(
    @Req() req: AuthRequest,
    @Body()
    body: {
      challengeId: string;
      progress: number;
      completed: boolean;
    },
  ) {
    return this.engagementService.updateChallengeProgress(
      req.user.sub,
      body.challengeId,
      body.progress,
      body.completed,
    );
  }

  // ── Leaderboard ──

  @Get('leaderboard')
  async getLeaderboard(
    @Req() req: AuthRequest,
    @Query('category')
    category?: 'most_liked' | 'most_messaged' | 'best_compatibility',
  ) {
    return this.engagementService.getLeaderboard(
      req.user.sub,
      category ?? 'most_liked',
    );
  }

  // ── Achievement ──

  @Post('achievement/unlock')
  async unlockAchievement(
    @Req() req: AuthRequest,
    @Body() body: { achievementId: string },
  ) {
    return this.engagementService.unlockAchievement(
      req.user.sub,
      body.achievementId,
    );
  }

  // ── Match Extend ──

  @Post('match/extend')
  async extendMatch(
    @Req() req: AuthRequest,
    @Body() body: { matchId: string },
  ) {
    return this.engagementService.extendMatch(req.user.sub, body.matchId);
  }

  // ── Likes Teaser ──

  @Get('likes-teaser')
  async getLikesTeaser(@Req() req: AuthRequest) {
    return this.engagementService.getLikesTeaser(req.user.sub);
  }
}
