import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CompatibilityService } from "./compatibility.service";
import { SubmitAnswerDto, SubmitAnswersBulkDto } from "./dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Compatibility")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("compatibility")
export class CompatibilityController {
  constructor(private readonly compatibilityService: CompatibilityService) {}

  @Get("questions")
  @ApiOperation({
    summary: "Get all compatibility questions (20 core + 25 premium)",
  })
  async getQuestions(@CurrentUser("sub") userId: string) {
    return this.compatibilityService.getQuestions(userId);
  }

  @Post("answers")
  @ApiOperation({ summary: "Submit an answer to a compatibility question" })
  async submitAnswer(
    @CurrentUser("sub") userId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.compatibilityService.submitAnswer(userId, dto);
  }

  @Post("answers/bulk")
  @ApiOperation({ summary: "Submit multiple answers at once" })
  async submitAnswersBulk(
    @CurrentUser("sub") userId: string,
    @Body() dto: SubmitAnswersBulkDto,
  ) {
    return this.compatibilityService.submitAnswersBulk(userId, dto);
  }

  @Get("progress")
  @ApiOperation({ summary: "Get user's quiz progress (completed questions + last question)" })
  async getProgress(@CurrentUser("sub") userId: string) {
    return this.compatibilityService.getProgress(userId);
  }

  @Post("calculate")
  @ApiOperation({ summary: "Trigger compatibility score calculation after completing all 20 questions" })
  async triggerCalculate(@CurrentUser("sub") userId: string) {
    return this.compatibilityService.triggerCalculate(userId);
  }

  @Get("my-answers")
  @ApiOperation({ summary: "Get all answers submitted by the current user" })
  async getMyAnswers(@CurrentUser("sub") userId: string) {
    return this.compatibilityService.getMyAnswers(userId);
  }

  @Get("score/:targetUserId")
  @ApiOperation({ summary: "Get compatibility score with another user" })
  async getScoreWithUser(
    @CurrentUser("sub") userId: string,
    @Param("targetUserId") targetUserId: string,
  ) {
    return this.compatibilityService.getScoreWithUser(userId, targetUserId);
  }

  @Get("detailed/:targetUserId")
  @ApiOperation({
    summary: "Get detailed compatibility breakdown with another user",
    description:
      "Returns strong areas, differences, and conversation starters in Turkish.",
  })
  async getDetailedCompatibility(
    @CurrentUser("sub") userId: string,
    @Param("targetUserId") targetUserId: string,
  ) {
    return this.compatibilityService.getDetailedCompatibility(
      userId,
      targetUserId,
    );
  }
}
