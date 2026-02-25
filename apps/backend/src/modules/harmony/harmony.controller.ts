import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HarmonyService } from './harmony.service';
import { CreateSessionDto, ExtendSessionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Harmony')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('harmony')
export class HarmonyController {
  constructor(private readonly harmonyService: HarmonyService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'Get all Harmony Room sessions for current user' })
  async getUserSessions(@CurrentUser('sub') userId: string) {
    return this.harmonyService.getUserSessions(userId);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new Harmony Room session' })
  async createSession(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.harmonyService.createSession(userId, dto);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get an active Harmony Room session' })
  async getSession(
    @CurrentUser('sub') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.harmonyService.getSession(userId, sessionId);
  }

  @Patch('sessions/extend')
  @ApiOperation({ summary: 'Extend a Harmony Room session (costs gold)' })
  async extendSession(
    @CurrentUser('sub') userId: string,
    @Body() dto: ExtendSessionDto,
  ) {
    return this.harmonyService.extendSession(userId, dto);
  }

  @Get('sessions/:sessionId/cards')
  @ApiOperation({ summary: 'Get harmony cards for a session' })
  async getCards(
    @CurrentUser('sub') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.harmonyService.getCards(userId, sessionId);
  }
}
