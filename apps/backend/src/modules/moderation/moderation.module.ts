import { Module } from "@nestjs/common";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";
import { ContentScannerService } from "./content-scanner.service";
import { AdminGuard } from "../../common/guards/admin.guard";

@Module({
  controllers: [ModerationController],
  providers: [ModerationService, ContentScannerService, AdminGuard],
  exports: [ModerationService, ContentScannerService],
})
export class ModerationModule {}
