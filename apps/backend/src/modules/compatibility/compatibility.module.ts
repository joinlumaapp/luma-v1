import { Module } from '@nestjs/common';
import { CompatibilityController } from './compatibility.controller';
import { CompatibilityService } from './compatibility.service';
import { DailyQuestionController } from './daily-question.controller';
import { DailyQuestionService } from './daily-question.service';

@Module({
  controllers: [CompatibilityController, DailyQuestionController],
  providers: [CompatibilityService, DailyQuestionService],
  exports: [CompatibilityService, DailyQuestionService],
})
export class CompatibilityModule {}
