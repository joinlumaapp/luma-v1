import { Module, forwardRef } from '@nestjs/common';
import { CompatibilityController } from './compatibility.controller';
import { CompatibilityService } from './compatibility.service';
import { DailyQuestionController } from './daily-question.controller';
import { DailyQuestionService } from './daily-question.service';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [forwardRef(() => BadgesModule)],
  controllers: [CompatibilityController, DailyQuestionController],
  providers: [CompatibilityService, DailyQuestionService],
  exports: [CompatibilityService, DailyQuestionService],
})
export class CompatibilityModule {}
