import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { MatchesService } from "./matches.service";
import { DatePlanService } from "./date-plan.service";
import { SecretAdmirerService } from "./secret-admirer.service";
import { CompatibilityXrayService } from "./compatibility-xray.service";
import {
  CurrentUser,
  JwtPayload,
} from "../../common/decorators/current-user.decorator";
import { CreateDatePlanDto, RespondDatePlanDto } from "./dto/date-plan.dto";

@ApiTags("Matches")
@ApiBearerAuth()
@Controller("matches")
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly datePlanService: DatePlanService,
    private readonly secretAdmirerService: SecretAdmirerService,
    private readonly compatibilityXrayService: CompatibilityXrayService,
  ) {}

  // ─── Viewers, Activity Strip, Warm Banner ─────────────────────

  @Get("viewers")
  @ApiOperation({ summary: "Get profile viewers (Kim Gördü)" })
  async getViewers(@CurrentUser() user: JwtPayload) {
    return this.matchesService.getViewers(
      user.sub,
      user.packageTier?.toUpperCase() || "FREE",
    );
  }

  @Get("activity-strip")
  @ApiOperation({ summary: "Get activity strip profiles" })
  async getActivityStrip(@CurrentUser() user: JwtPayload) {
    return this.matchesService.getActivityStrip(
      user.sub,
      user.packageTier?.toUpperCase() || "FREE",
    );
  }

  @Get("warm-banner")
  @ApiOperation({ summary: "Get warm notification banner" })
  async getWarmBanner(@CurrentUser("sub") userId: string) {
    return this.matchesService.getWarmBanner(userId);
  }

  // ─── Secret Admirer Endpoints ─────────────────────────────────

  @Post("secret-admirer")
  @ApiOperation({ summary: "Send a secret admirer challenge" })
  async sendSecretAdmirer(
    @CurrentUser() user: JwtPayload,
    @Body() body: { receiverId: string },
  ) {
    return this.secretAdmirerService.send(
      user.sub,
      body.receiverId,
      user.packageTier?.toUpperCase() || "FREE",
    );
  }

  @Post("secret-admirer/:id/guess")
  @ApiOperation({ summary: "Guess who sent the secret admirer" })
  async guessSecretAdmirer(
    @CurrentUser("sub") userId: string,
    @Param("id") admirerId: string,
    @Body() body: { guessedUserId: string },
  ) {
    return this.secretAdmirerService.guess(admirerId, userId, body.guessedUserId);
  }

  @Get("secret-admirers")
  @ApiOperation({ summary: "Get received secret admirer challenges" })
  async getSecretAdmirers(@CurrentUser("sub") userId: string) {
    return this.secretAdmirerService.getReceived(userId);
  }

  // ─── Weekly Top Endpoint ────────────────────────────────────────

  @Get("weekly-top")
  @ApiOperation({ summary: "Get weekly top 3 most compatible matches" })
  async getWeeklyTop(@CurrentUser() user: JwtPayload) {
    return this.matchesService.getWeeklyTop(
      user.sub,
      user.packageTier?.toUpperCase() || "FREE",
    );
  }

  // ─── Core Match Endpoints ───────────────────────────────────

  @Get()
  @ApiOperation({ summary: "Get all matches for current user" })
  async getAllMatches(@CurrentUser("sub") userId: string) {
    return this.matchesService.getAllMatches(userId);
  }

  @Get(":matchId")
  @ApiOperation({ summary: "Get a single match with full details" })
  async getMatch(
    @CurrentUser("sub") userId: string,
    @Param("matchId") matchId: string,
  ) {
    return this.matchesService.getMatch(userId, matchId);
  }

  @Delete(":matchId")
  @ApiOperation({ summary: "Unmatch — deactivate a match" })
  async unmatch(
    @CurrentUser("sub") userId: string,
    @Param("matchId") matchId: string,
  ) {
    return this.matchesService.unmatch(userId, matchId);
  }

  // ─── Compatibility X-Ray Endpoint ──────────────────────────────

  @Get(":id/compatibility-xray")
  @ApiOperation({ summary: "Get compatibility X-Ray breakdown with a user" })
  async getCompatibilityXray(
    @CurrentUser("sub") userId: string,
    @Param("id") targetUserId: string,
  ) {
    return this.compatibilityXrayService.getXray(userId, targetUserId);
  }

  // ─── Date Plan Endpoints ────────────────────────────────────────

  @Post(":matchId/date-plans")
  @ApiOperation({ summary: "Propose a new date plan for a match" })
  async createDatePlan(
    @CurrentUser("sub") userId: string,
    @Param("matchId") matchId: string,
    @Body() dto: CreateDatePlanDto,
  ) {
    return this.datePlanService.createDatePlan(userId, matchId, dto);
  }

  @Get(":matchId/date-plans")
  @ApiOperation({ summary: "Get all date plans for a match" })
  async getDatePlans(
    @CurrentUser("sub") userId: string,
    @Param("matchId") matchId: string,
  ) {
    return this.datePlanService.getDatePlans(userId, matchId);
  }

  @Patch("date-plans/:planId/respond")
  @ApiOperation({ summary: "Respond to a date plan (accept or decline)" })
  async respondToDatePlan(
    @CurrentUser("sub") userId: string,
    @Param("planId") planId: string,
    @Body() dto: RespondDatePlanDto,
  ) {
    return this.datePlanService.respondToDatePlan(userId, planId, dto);
  }

  @Delete("date-plans/:planId")
  @ApiOperation({ summary: "Cancel a date plan (proposer only)" })
  async cancelDatePlan(
    @CurrentUser("sub") userId: string,
    @Param("planId") planId: string,
  ) {
    return this.datePlanService.cancelDatePlan(userId, planId);
  }
}
