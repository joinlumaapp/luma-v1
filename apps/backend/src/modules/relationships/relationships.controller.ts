import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RelationshipsService } from './relationships.service';
import { ActivateRelationshipDto, ToggleVisibilityDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Relationships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'Deactivate relationship mode' })
  async deactivate(@CurrentUser('sub') userId: string) {
    return this.relationshipsService.deactivate(userId);
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
}
