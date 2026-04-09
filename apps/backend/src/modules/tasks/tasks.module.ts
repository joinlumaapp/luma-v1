import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { StoriesModule } from "../stories/stories.module";
import { PaymentsModule } from "../payments/payments.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [StoriesModule, PaymentsModule, NotificationsModule],
  providers: [TasksService],
})
export class TasksModule {}
