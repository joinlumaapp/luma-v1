import {
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all matches for current user' })
  async getAllMatches(@CurrentUser('sub') userId: string) {
    return this.matchesService.getAllMatches(userId);
  }

  @Get(':matchId')
  @ApiOperation({ summary: 'Get a single match with full details' })
  async getMatch(
    @CurrentUser('sub') userId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.matchesService.getMatch(userId, matchId);
  }

  @Delete(':matchId')
  @ApiOperation({ summary: 'Unmatch — deactivate a match' })
  async unmatch(
    @CurrentUser('sub') userId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.matchesService.unmatch(userId, matchId);
  }
}
