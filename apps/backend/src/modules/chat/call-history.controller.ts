import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { CallHistoryService } from "./call-history.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Call History")
@ApiBearerAuth()
@Controller("call-history")
export class CallHistoryController {
  constructor(private readonly callHistoryService: CallHistoryService) {}

  @Get()
  @ApiOperation({ summary: "Get call history for current user (paginated)" })
  @ApiQuery({
    name: "cursor",
    required: false,
    description: "Cursor for pagination (call ID)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of records to fetch (max 50)",
    type: Number,
  })
  async getCallHistory(
    @CurrentUser("sub") userId: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const parsed = limit ? parseInt(limit, 10) : 20;
    const parsedLimit = Number.isNaN(parsed) || parsed < 1 ? 20 : Math.min(parsed, 50);
    return this.callHistoryService.getCallHistory(userId, cursor, parsedLimit);
  }

  @Get(":callId")
  @ApiOperation({ summary: "Get single call detail" })
  async getCallById(
    @CurrentUser("sub") userId: string,
    @Param("callId") callId: string,
  ) {
    return this.callHistoryService.getCallById(userId, callId);
  }

  @Delete(":callId")
  @ApiOperation({ summary: "Soft-delete a call from user view" })
  async deleteCall(
    @CurrentUser("sub") userId: string,
    @Param("callId") callId: string,
  ) {
    await this.callHistoryService.deleteCallForUser(userId, callId);
    return { message: "Arama kaydi silindi" };
  }
}
