import { Module, forwardRef } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { FirebaseProvider } from "./firebase.provider";
import { HarmonyModule } from "../harmony/harmony.module";

@Module({
  imports: [forwardRef(() => HarmonyModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService, FirebaseProvider],
  exports: [NotificationsService, FirebaseProvider],
})
export class NotificationsModule {}
