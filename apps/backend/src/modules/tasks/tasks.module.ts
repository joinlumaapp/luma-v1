import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { RelationshipsModule } from '../relationships/relationships.module';

@Module({
  imports: [RelationshipsModule],
  providers: [TasksService],
})
export class TasksModule {}
