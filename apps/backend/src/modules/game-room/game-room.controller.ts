import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { GameRoomService } from "./game-room.service";
import { CreateRoomDto } from "./dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Game Room")
@ApiBearerAuth()
@Controller("game-rooms")
export class GameRoomController {
  constructor(private readonly gameRoomService: GameRoomService) {}

  @Get()
  @ApiOperation({ summary: "List active game rooms" })
  async listRooms(@Query("gameType") gameType?: string) {
    return this.gameRoomService.listRooms(gameType ? { gameType } : undefined);
  }

  @Post()
  @ApiOperation({ summary: "Create a new game room" })
  async createRoom(
    @CurrentUser("sub") userId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.gameRoomService.createRoom(userId, dto);
  }

  @Get("history")
  @ApiOperation({ summary: "Get current user's game history" })
  async getMyHistory(@CurrentUser("sub") userId: string) {
    return this.gameRoomService.getMyHistory(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a game room by ID" })
  async getRoom(@Param("id") id: string) {
    return this.gameRoomService.getRoom(id);
  }
}
