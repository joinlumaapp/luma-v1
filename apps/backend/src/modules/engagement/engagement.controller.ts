import { Controller, Post, Get, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import {
  IsInt,
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
} from "class-validator";
import { EngagementService } from "./engagement.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

// ── DTOs ──

export class ClaimDailyRewardDto {
  @IsInt()
  @Min(1)
  day!: number;
}

export class UpdateChallengeProgressDto {
  @IsString()
  challengeId!: string;

  @IsNumber()
  @Min(0)
  progress!: number;

  @IsBoolean()
  completed!: boolean;
}

export class LeaderboardQueryDto {
  @IsOptional()
  @IsIn(["most_liked", "most_messaged", "best_compatibility"])
  category?: "most_liked" | "most_messaged" | "best_compatibility";
}

export class UnlockAchievementDto {
  @IsString()
  achievementId!: string;
}

export class ExtendMatchDto {
  @IsString()
  matchId!: string;
}

// ── Controller ──

@ApiTags("Engagement")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("engagement")
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  // ── Daily Reward ──

  @Post("daily-reward/claim")
  @ApiOperation({ summary: "Claim daily reward for a given day" })
  async claimDailyReward(
    @CurrentUser("sub") userId: string,
    @Body() dto: ClaimDailyRewardDto,
  ) {
    return this.engagementService.claimDailyReward(userId, dto.day);
  }

  // ── Challenge Progress ──

  @Post("challenge/progress")
  @ApiOperation({ summary: "Update challenge progress" })
  async updateChallengeProgress(
    @CurrentUser("sub") userId: string,
    @Body() dto: UpdateChallengeProgressDto,
  ) {
    return this.engagementService.updateChallengeProgress(
      userId,
      dto.challengeId,
      dto.progress,
      dto.completed,
    );
  }

  // ── Leaderboard ──

  @Get("leaderboard")
  @ApiOperation({ summary: "Get leaderboard by category" })
  async getLeaderboard(
    @CurrentUser("sub") userId: string,
    @Query() query: LeaderboardQueryDto,
  ) {
    return this.engagementService.getLeaderboard(
      userId,
      query.category ?? "most_liked",
    );
  }

  // ── Achievement ──

  @Post("achievement/unlock")
  @ApiOperation({ summary: "Unlock an achievement" })
  async unlockAchievement(
    @CurrentUser("sub") userId: string,
    @Body() dto: UnlockAchievementDto,
  ) {
    return this.engagementService.unlockAchievement(userId, dto.achievementId);
  }

  // ── Match Extend ──

  @Post("match/extend")
  @ApiOperation({ summary: "Extend a match expiration" })
  async extendMatch(
    @CurrentUser("sub") userId: string,
    @Body() dto: ExtendMatchDto,
  ) {
    return this.engagementService.extendMatch(userId, dto.matchId);
  }

  // ── Likes Teaser ──

  @Get("likes-teaser")
  @ApiOperation({ summary: "Get blurred likes teaser for free users" })
  async getLikesTeaser(@CurrentUser("sub") userId: string) {
    return this.engagementService.getLikesTeaser(userId);
  }
}
