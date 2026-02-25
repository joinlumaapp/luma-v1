import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlacesService } from './places.service';
import { CheckInDto, AddMemoryDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Places')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post('check-in')
  @ApiOperation({ summary: 'Check in to a place' })
  async checkIn(
    @CurrentUser('sub') userId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.placesService.checkIn(userId, dto);
  }

  @Get('shared/:partnerId')
  @ApiOperation({ summary: 'Get places shared with a matched user' })
  async getSharedPlaces(
    @CurrentUser('sub') userId: string,
    @Param('partnerId') partnerId: string,
  ) {
    return this.placesService.getSharedPlaces(userId, partnerId);
  }

  @Post('memories')
  @ApiOperation({ summary: 'Add a memory to a place' })
  async addMemory(
    @CurrentUser('sub') userId: string,
    @Body() dto: AddMemoryDto,
  ) {
    return this.placesService.addMemory(userId, dto);
  }

  @Get('timeline/:partnerId')
  @ApiOperation({ summary: 'Get memories timeline for a relationship' })
  async getTimeline(
    @CurrentUser('sub') userId: string,
    @Param('partnerId') partnerId: string,
  ) {
    return this.placesService.getMemoriesTimeline(userId, partnerId);
  }

  @Get('my-check-ins')
  @ApiOperation({ summary: 'Get my check-in history' })
  async getMyCheckIns(@CurrentUser('sub') userId: string) {
    return this.placesService.getMyCheckIns(userId);
  }
}
