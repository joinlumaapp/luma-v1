import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import {
  SubscribeDto,
  ValidateReceiptDto,
  PurchaseGoldDto,
  UpgradePackageDto,
  SpendGoldDto,
  AppleWebhookDto,
  GoogleWebhookDto,
} from "./dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  CurrentUser,
  Public,
} from "../../common/decorators/current-user.decorator";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── Package Endpoints ──────────────────────────────────────────

  @Public()
  @Get("packages")
  @ApiOperation({
    summary: "Get all subscription packages (4 tiers) and gold packs",
  })
  async getPackages() {
    return this.paymentsService.getPackages();
  }

  @UseGuards(JwtAuthGuard)
  @Post("subscribe")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Subscribe to a package tier" })
  async subscribe(
    @CurrentUser("sub") userId: string,
    @Body() dto: SubscribeDto,
  ) {
    return this.paymentsService.subscribe(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("subscribe")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel current subscription" })
  async cancelSubscription(@CurrentUser("sub") userId: string) {
    return this.paymentsService.cancelSubscription(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("validate-receipt")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Validate App Store / Play Store receipt" })
  async validateReceipt(
    @CurrentUser("sub") userId: string,
    @Body() dto: ValidateReceiptDto,
  ) {
    return this.paymentsService.validateReceipt(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("status")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current subscription status, tier, expiry, gold balance",
  })
  async getSubscriptionStatus(@CurrentUser("sub") userId: string) {
    return this.paymentsService.getSubscriptionStatus(userId);
  }

  // ─── Package Upgrade ────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post("package/upgrade")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Upgrade package tier (Free -> Gold -> Pro -> Reserved)",
  })
  async upgradePackage(
    @CurrentUser("sub") userId: string,
    @Body() dto: UpgradePackageDto,
  ) {
    return this.paymentsService.upgradePackage(userId, dto);
  }

  // ─── Package Downgrade ─────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post("package/downgrade")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Downgrade package tier (Reserved -> Pro -> Gold -> Free)",
  })
  async downgradePackage(
    @CurrentUser("sub") userId: string,
    @Body() dto: UpgradePackageDto,
  ) {
    return this.paymentsService.downgradePackage(userId, dto);
  }

  // ─── Gold Endpoints ─────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get("gold/balance")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current gold balance and recent transactions" })
  async getGoldBalance(@CurrentUser("sub") userId: string) {
    return this.paymentsService.getGoldBalance(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("gold/purchase")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Purchase a gold pack (gold_50, gold_150, gold_500, gold_1000)",
  })
  async purchaseGold(
    @CurrentUser("sub") userId: string,
    @Body() dto: PurchaseGoldDto,
  ) {
    return this.paymentsService.purchaseGold(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("gold/history")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get gold transaction history with pagination" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 20)",
  })
  async getGoldHistory(
    @CurrentUser("sub") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.paymentsService.getGoldHistory(userId, pageNum, limitNum);
  }

  @UseGuards(JwtAuthGuard)
  @Post("gold/spend")
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Spend gold on an action (harmony_extension, profile_boost, super_like)",
  })
  async spendGold(
    @CurrentUser("sub") userId: string,
    @Body() dto: SpendGoldDto,
  ) {
    return this.paymentsService.spendGold(userId, dto);
  }

  // ─── Transaction History ────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get("history")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all payment transaction history" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getTransactionHistory(
    @CurrentUser("sub") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.paymentsService.getTransactionHistory(
      userId,
      pageNum,
      limitNum,
    );
  }

  // ─── Store Webhook Endpoints ──────────────────────────────────

  @Public()
  @Post("webhook/apple")
  @ApiOperation({
    summary: "Apple App Store Server Notifications (S2S) webhook",
  })
  async handleAppleWebhook(@Body() dto: AppleWebhookDto) {
    return this.paymentsService.handleAppleWebhook(dto.signedPayload);
  }

  @Public()
  @Post("webhook/google")
  @ApiOperation({
    summary: "Google Play Real-Time Developer Notifications (RTDN) webhook",
  })
  async handleGoogleWebhook(@Body() dto: GoogleWebhookDto) {
    return this.paymentsService.handleGoogleWebhook(dto.message.data);
  }
}
