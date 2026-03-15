import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RelationshipsService } from './relationships.service';
import { ActivateRelationshipDto, ToggleVisibilityDto, CreateEventDto, RsvpEventDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Relationships')
@ApiBearerAuth()
@Controller('relationships')
export class RelationshipsController {
  constructor(
    private readonly relationshipsService: RelationshipsService,
  ) {}

  @Post('activate')
  @ApiOperation({ summary: 'Activate relationship mode from a match' })
  async activate(
    @CurrentUser('sub') userId: string,
    @Body() dto: ActivateRelationshipDto,
  ) {
    return this.relationshipsService.activate(userId, dto);
  }

  @Delete('deactivate')
  @ApiOperation({ summary: 'Initiate 48-hour relationship deactivation' })
  async deactivate(@CurrentUser('sub') userId: string) {
    return this.relationshipsService.deactivate(userId);
  }

  @Post('deactivate/confirm')
  @ApiOperation({ summary: 'Confirm relationship deactivation (partner only)' })
  async confirmDeactivation(@CurrentUser('sub') userId: string) {
    return this.relationshipsService.confirmDeactivation(userId);
  }

  @Post('deactivate/cancel')
  @ApiOperation({ summary: 'Cancel pending relationship deactivation (initiator only)' })
  async cancelDeactivation(@CurrentUser('sub') userId: string) {
    return this.relationshipsService.cancelDeactivation(userId);
  }

  @Patch('visibility')
  @ApiOperation({ summary: 'Toggle relationship visibility in Couples Club' })
  async toggleVisibility(
    @CurrentUser('sub') userId: string,
    @Body() dto: ToggleVisibilityDto,
  ) {
    return this.relationshipsService.toggleVisibility(userId, dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current relationship status' })
  async getStatus(@CurrentUser('sub') userId: string) {
    return this.relationshipsService.getStatus(userId);
  }

  @Get('milestones')
  @ApiOperation({ summary: 'Get relationship milestones (achieved and upcoming)' })
  async getMilestones(@CurrentUser('sub') userId: string) {
    return this.relationshipsService.getMilestones(userId);
  }

  @Get('couple-matches')
  @ApiOperation({ summary: 'Find compatible couples for 2v2 interactions' })
  async getCoupleMatches(@CurrentUser('sub') userId: string) {
    return this.relationshipsService.findCoupleMatches(userId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get upcoming Couples Club events' })
  async getEvents(@CurrentUser('sub') userId: string) {
    return this.relationshipsService.getEvents(userId);
  }

  @Post('events/:eventId/rsvp')
  @ApiOperation({ summary: 'RSVP to a Couples Club event' })
  async rsvpEvent(
    @CurrentUser('sub') userId: string,
    @Param('eventId') eventId: string,
    @Body() dto: RsvpEventDto,
  ) {
    return this.relationshipsService.rsvpEvent(userId, eventId, dto.status);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create a new Couples Club event' })
  async createEvent(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.relationshipsService.createEvent(userId, dto);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get Couples Club leaderboard' })
  async getLeaderboard(@CurrentUser('sub') userId: string) {
    return this.relationshipsService.getLeaderboard(userId);
  }
}
