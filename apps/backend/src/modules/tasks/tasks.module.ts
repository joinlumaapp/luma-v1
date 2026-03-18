import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { RelationshipsModule } from "../relationships/relationships.module";
import { StoriesModule } from "../stories/stories.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [RelationshipsModule, StoriesModule, PaymentsModule],
  providers: [TasksService],
})
export class TasksModule {}
