// LUMA V1 -- Gunluk Uyumluluk Sorusu Controller
// REST endpoints for the daily compatibility question feature

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DailyQuestionService } from './daily-question.service';
import { AnswerDailyQuestionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Compatibility')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compatibility/daily')
export class DailyQuestionController {
  constructor(
    private readonly dailyQuestionService: DailyQuestionService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get today\'s daily compatibility question',
    description: 'Returns a different compatibility question each day, cycling through all 45 questions.',
  })
  async getDailyQuestion(@CurrentUser('sub') userId: string) {
    return this.dailyQuestionService.getDailyQuestion(userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Answer today\'s daily question',
    description: 'Submit an answer to the daily question. Each question can only be answered once per day.',
  })
  async answerDailyQuestion(
    @CurrentUser('sub') userId: string,
    @Body() dto: AnswerDailyQuestionDto,
  ) {
    return this.dailyQuestionService.answerDailyQuestion(
      userId,
      dto.questionId,
      dto.optionId,
    );
  }

  @Get('insight')
  @ApiOperation({
    summary: 'Get insight for a daily question answer',
    description: 'After answering, shows the percentage of your matches who gave the same answer.',
  })
  @ApiQuery({
    name: 'questionId',
    required: true,
    description: 'Insight istenen sorunun ID\'si',
  })
  async getDailyInsight(
    @CurrentUser('sub') userId: string,
    @Query('questionId') questionId: string,
  ) {
    return this.dailyQuestionService.getDailyInsight(userId, questionId);
  }

  @Get('stats/:questionId')
  @ApiOperation({
    summary: 'Get global statistics for a question',
    description: 'Total respondent count, percentage breakdown per option, and most popular answer.',
  })
  @ApiParam({
    name: 'questionId',
    required: true,
    description: 'Istatistikleri istenen sorunun ID\'si',
  })
  async getAnswerStats(
    @CurrentUser('sub') userId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.dailyQuestionService.getAnswerStats(questionId, userId);
  }

  @Get('streak')
  @ApiOperation({
    summary: 'Get user\'s daily answer streak',
    description: 'Shows consecutive days answered and longest streak.',
  })
  async getStreak(@CurrentUser('sub') userId: string) {
    return this.dailyQuestionService.getStreak(userId);
  }
}
