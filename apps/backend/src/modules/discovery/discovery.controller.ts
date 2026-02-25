import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DiscoveryService } from './discovery.service';
import { SwipeDto, FeedFilterDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Discovery')
@ApiBearerAuth()
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('feed')
  @ApiOperation({ summary: 'Get discovery card feed with optional filters' })
  @ApiQuery({ name: 'genderPreference', required: false, enum: ['male', 'female', 'all'] })
  @ApiQuery({ name: 'minAge', required: false, type: Number })
  @ApiQuery({ name: 'maxAge', required: false, type: Number })
  @ApiQuery({ name: 'maxDistance', required: false, type: Number })
  @ApiQuery({ name: 'intentionTags', required: false, type: String, description: 'Comma-separated intention tags' })
  async getFeed(
    @CurrentUser('sub') userId: string,
    @Query() filters: FeedFilterDto,
  ) {
    return this.discoveryService.getFeed(userId, filters);
  }

  @Post('swipe')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 swipes per minute
  @ApiOperation({ summary: 'Swipe on a profile (like, pass, or super_like)' })
  async swipe(
    @CurrentUser('sub') userId: string,
    @Body() dto: SwipeDto,
  ) {
    return this.discoveryService.swipe(userId, dto);
  }

  @Post('undo')
  @ApiOperation({ summary: 'Undo last swipe within 5-second window (Geri Al)' })
  async undoSwipe(
    @CurrentUser('sub') userId: string,
  ) {
    return this.discoveryService.undoSwipe(userId);
  }
}
