import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { ReceiptValidatorService } from "./receipt-validator.service";
import { BadgesModule } from "../badges/badges.module";

@Module({
  imports: [BadgesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, ReceiptValidatorService],
  exports: [PaymentsService, ReceiptValidatorService],
})
export class PaymentsModule {}
