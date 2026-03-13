import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { RelationshipsModule } from '../relationships/relationships.module';
import { StoriesModule } from '../stories/stories.module';

@Module({
  imports: [RelationshipsModule, StoriesModule],
  providers: [TasksService],
})
export class TasksModule {}
