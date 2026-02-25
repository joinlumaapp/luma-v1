import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadVoiceIntroDto } from './dto/voice-intro.dto';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * VoiceIntroController — Profile voice introduction feature.
 *
 * Users can record a 30-second voice introduction that appears on their
 * discovery card with a "Sesimi Dinle" (Listen to my voice) button.
 *
 * Endpoints:
 *   POST   /profiles/voice-intro          — Upload voice recording
 *   GET    /profiles/voice-intro/:userId   — Get voice intro URL
 *   DELETE /profiles/voice-intro           — Delete voice intro
 */

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_AUDIO_TYPES = [
  'audio/mp4',
  'audio/m4a',
  'audio/mpeg',
  'audio/wav',
  'audio/aac',
  'audio/x-m4a',
];

@ApiTags('Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class VoiceIntroController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('voice-intro')
  @ApiOperation({ summary: 'Upload a 30-second voice introduction' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadVoiceIntro(
    @CurrentUser('sub') userId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Multer file type from @nestjs/platform-express
    @UploadedFile() file: any,
    @Body() dto: UploadVoiceIntroDto,
  ) {
    if (!file) {
      throw new BadRequestException('Ses dosyasi gerekli');
    }

    // Validate MIME type
    if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Desteklenmeyen dosya formati. M4A, MP3, WAV veya AAC kullanin.',
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new BadRequestException(
        `Dosya boyutu en fazla ${MAX_FILE_SIZE_MB}MB olabilir`,
      );
    }

    // Validate duration
    if (dto.durationSeconds > 30) {
      throw new BadRequestException('Ses kaydi en fazla 30 saniye olabilir');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    // In production: Upload to S3
    // For now: Mock URL generation
    const voiceId = crypto.randomUUID();
    const url = `https://cdn.luma.app/voice/${userId}/${voiceId}.m4a`;

    // Store voice intro URL in profile
    const profile = await this.prisma.userProfile.update({
      where: { userId },
      data: {
        voiceIntroUrl: url,
        voiceIntroDuration: dto.durationSeconds,
      },
    });

    return {
      voiceIntroUrl: profile.voiceIntroUrl,
      durationSeconds: profile.voiceIntroDuration,
      createdAt: new Date().toISOString(),
      message: 'Sesli tanitim yuklendi!',
    };
  }

  @Get('voice-intro/:userId')
  @ApiOperation({ summary: 'Get a user\'s voice introduction URL' })
  async getVoiceIntro(@Param('userId') userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: {
        voiceIntroUrl: true,
        voiceIntroDuration: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profil bulunamadi');
    }

    if (!profile.voiceIntroUrl) {
      return {
        hasVoiceIntro: false,
        voiceIntroUrl: null,
        durationSeconds: null,
      };
    }

    return {
      hasVoiceIntro: true,
      voiceIntroUrl: profile.voiceIntroUrl,
      durationSeconds: profile.voiceIntroDuration,
    };
  }

  @Delete('voice-intro')
  @ApiOperation({ summary: 'Delete voice introduction' })
  async deleteVoiceIntro(@CurrentUser('sub') userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { voiceIntroUrl: true },
    });

    if (!profile) {
      throw new NotFoundException('Profil bulunamadi');
    }

    if (!profile.voiceIntroUrl) {
      throw new BadRequestException('Silinecek sesli tanitim bulunamadi');
    }

    // In production: Delete from S3
    // await this.s3Service.deleteObject(profile.voiceIntroUrl);

    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        voiceIntroUrl: null,
        voiceIntroDuration: null,
      },
    });

    return {
      deleted: true,
      message: 'Sesli tanitim silindi',
    };
  }
}
