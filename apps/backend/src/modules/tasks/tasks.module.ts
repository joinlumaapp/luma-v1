import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { StoriesModule } from "../stories/stories.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [StoriesModule, PaymentsModule],
  providers: [TasksService],
})
export class TasksModule {}
