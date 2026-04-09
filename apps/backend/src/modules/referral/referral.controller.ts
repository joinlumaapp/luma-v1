import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ReferralService } from "./referral.service";
import { ClaimReferralDto } from "./dto/claim-referral.dto";

@ApiTags("Referral")
@ApiBearerAuth()
@Controller("referral")
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post("claim")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Claim a referral code — awards 50 jeton to both users" })
  async claimReferral(
    @Request() req: { user: { sub: string } },
    @Body() dto: ClaimReferralDto,
  ) {
    return this.referralService.claimReferralCode(req.user.sub, dto.code);
  }

  @Get("me")
  @ApiOperation({ summary: "Get my referral code, stats, and invited users" })
  async getMyReferrals(@Request() req: { user: { sub: string } }) {
    return this.referralService.getMyReferralInfo(req.user.sub);
  }
}
