import { Module, forwardRef } from "@nestjs/common";
import { BadgesController } from "./badges.controller";
import { BadgesService } from "./badges.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [BadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
