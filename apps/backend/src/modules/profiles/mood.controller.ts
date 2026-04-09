import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SetMoodDto, MoodValue } from "./dto/set-mood.dto";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * MoodController — "Anlık Ruh Hali" feature.
 *
 * Users can set a mood that appears as a badge on their discovery card
 * and feed posts. Moods expire after 4 hours automatically.
 * Tapping the same mood again clears it (send null).
 *
 * Endpoints:
 *   PATCH /profiles/mood         — Set or clear current mood
 *   GET   /profiles/mood/:userId — Get a user's current mood
 */
@ApiTags("Profiles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("profiles")
export class MoodController {
  /** Mood expiry duration in hours */
  private static readonly MOOD_EXPIRY_HOURS = 4;

  constructor(private readonly prisma: PrismaService) {}

  @Patch("mood")
  @ApiOperation({ summary: "Set or clear mood status (expires after 4 hours)" })
  async setMood(@CurrentUser("sub") userId: string, @Body() dto: SetMoodDto) {
    // Validate mood value when provided
    const validMoods: string[] = Object.values(MoodValue);
    if (dto.mood !== null && dto.mood !== undefined && !validMoods.includes(dto.mood)) {
      throw new BadRequestException("Geçersiz mood değeri");
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    const mood = dto.mood ?? null;

    const profile = await this.prisma.userProfile.update({
      where: { userId },
      data: {
        currentMood: mood,
        moodSetAt: mood ? new Date() : null,
      },
    });

    return {
      mood: profile.currentMood,
      moodSetAt: profile.moodSetAt
        ? (profile.moodSetAt as Date).toISOString()
        : null,
      expiresAt: profile.moodSetAt
        ? new Date(
            (profile.moodSetAt as Date).getTime() +
              MoodController.MOOD_EXPIRY_HOURS * 60 * 60 * 1000,
          ).toISOString()
        : null,
    };
  }

  @Get("mood/:userId")
  @ApiOperation({ summary: "Get a user's current mood" })
  async getUserMood(@Param("userId") userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: {
        currentMood: true,
        moodSetAt: true,
      },
    });

    if (!profile) {
      throw new NotFoundException("Profil bulunamadı");
    }

    // Check if mood has expired
    const moodSetAt = profile.moodSetAt as Date | null;
    if (!profile.currentMood || !moodSetAt) {
      return { mood: null, isActive: false };
    }

    const expiresAt = new Date(
      moodSetAt.getTime() + MoodController.MOOD_EXPIRY_HOURS * 60 * 60 * 1000,
    );
    const isActive = new Date() < expiresAt;

    if (!isActive) {
      return { mood: null, isActive: false };
    }

    return {
      mood: profile.currentMood as MoodValue,
      moodSetAt: moodSetAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
    };
  }
}
