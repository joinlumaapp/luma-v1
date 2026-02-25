import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SetMoodDto, MoodValue } from './dto/set-mood.dto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * MoodController — "Bugün Ne Moddayım?" feature.
 *
 * Users can set a mood that appears as a badge on their discovery card.
 * Moods expire after 24 hours automatically.
 *
 * Endpoints:
 *   PUT  /profiles/mood         — Set current mood
 *   GET  /profiles/mood/:userId — Get a user's current mood
 */
@ApiTags('Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class MoodController {
  private static readonly MOOD_EXPIRY_HOURS = 24;

  constructor(private readonly prisma: PrismaService) {}

  @Put('mood')
  @ApiOperation({ summary: 'Set current mood (expires after 24 hours)' })
  async setMood(
    @CurrentUser('sub') userId: string,
    @Body() dto: SetMoodDto,
  ) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    // Upsert mood — store in userProfile's JSON field or dedicated mood table
    // Using userProfile metadata for simplicity
    const profile = await this.prisma.userProfile.update({
      where: { userId },
      data: {
        currentMood: dto.mood,
        moodSetAt: new Date(),
      },
    });

    return {
      mood: profile.currentMood as MoodValue,
      moodSetAt: (profile.moodSetAt as Date).toISOString(),
      expiresAt: new Date(
        (profile.moodSetAt as Date).getTime() +
          MoodController.MOOD_EXPIRY_HOURS * 60 * 60 * 1000,
      ).toISOString(),
      message: 'Ruh halin güncellendi!',
    };
  }

  @Get('mood/:userId')
  @ApiOperation({ summary: 'Get a user\'s current mood' })
  async getUserMood(@Param('userId') userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: {
        currentMood: true,
        moodSetAt: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profil bulunamadi');
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
