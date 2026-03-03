import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto, SetIntentionTagDto, ReorderPhotosDto, UpdateLocationDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.profilesService.getProfile(userId);
  }

  @Get('strength')
  @ApiOperation({ summary: 'Get profile strength/completeness breakdown' })
  async getProfileStrength(@CurrentUser('sub') userId: string) {
    return this.profilesService.getProfileStrength(userId);
  }

  @Post('view/:targetUserId')
  @ApiOperation({ summary: 'Track a profile view' })
  async trackProfileView(
    @CurrentUser('sub') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    await this.profilesService.trackProfileView(userId, targetUserId);
    return { tracked: true };
  }

  @Get('visitors')
  @ApiOperation({ summary: 'Get recent profile visitors (last 7 days)' })
  async getProfileVisitors(@CurrentUser('sub') userId: string) {
    return this.profilesService.getProfileVisitors(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.updateProfile(userId, dto);
  }

  @Post('photos')
  @ApiOperation({ summary: 'Upload a profile photo (max 6)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @CurrentUser('sub') userId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Multer file type from @nestjs/platform-express
    @UploadedFile() file: any,
  ) {
    return this.profilesService.uploadPhoto(userId, file);
  }

  @Delete('photos/:photoId')
  @ApiOperation({ summary: 'Delete a profile photo' })
  async deletePhoto(
    @CurrentUser('sub') userId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.profilesService.deletePhoto(userId, photoId);
  }

  @Patch('photos/reorder')
  @ApiOperation({ summary: 'Reorder profile photos' })
  async reorderPhotos(
    @CurrentUser('sub') userId: string,
    @Body() dto: ReorderPhotosDto,
  ) {
    return this.profilesService.reorderPhotos(userId, dto);
  }

  @Patch('intention-tag')
  @ApiOperation({ summary: 'Set intention tag (1 of 3 options)' })
  async setIntentionTag(
    @CurrentUser('sub') userId: string,
    @Body() dto: SetIntentionTagDto,
  ) {
    return this.profilesService.setIntentionTag(userId, dto);
  }

  @Patch('location')
  @ApiOperation({ summary: 'Update user geolocation coordinates' })
  async updateLocation(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.profilesService.updateLocation(userId, dto.latitude, dto.longitude);
  }

  // ── Profile Prompts (Hinge-style) ───────────────────────────

  @Get(':userId/prompts')
  @ApiOperation({ summary: 'Get profile prompts for a user' })
  async getPrompts(@Param('userId') userId: string) {
    return this.profilesService.getPrompts(userId);
  }

  @Post('prompts')
  @ApiOperation({ summary: 'Save profile prompts (max 3)' })
  async savePrompts(
    @CurrentUser('sub') userId: string,
    @Body() body: { prompts: Array<{ question: string; answer: string; order: number }> },
  ) {
    return this.profilesService.savePrompts(userId, body.prompts);
  }

  // ── Profile Boost ───────────────────────────────────────────

  @Get('boost/status')
  @ApiOperation({ summary: 'Get current boost status' })
  async getBoostStatus(@CurrentUser('sub') userId: string) {
    return this.profilesService.getBoostStatus(userId);
  }

  @Post('boost')
  @ApiOperation({ summary: 'Activate a 30-minute profile boost (costs 50 Gold)' })
  async activateBoost(@CurrentUser('sub') userId: string) {
    return this.profilesService.activateBoost(userId);
  }

  // ── Login Streak ────────────────────────────────────────────

  @Post('login-streak')
  @ApiOperation({ summary: 'Record daily login and return streak info + Gold reward' })
  async recordLoginStreak(@CurrentUser('sub') userId: string) {
    return this.profilesService.recordLoginStreak(userId);
  }
}
