import { Module } from "@nestjs/common";
import { GameRoomController } from "./game-room.controller";
import { GameRoomService } from "./game-room.service";
import { GameRoomGateway } from "./game-room.gateway";

@Module({
  controllers: [GameRoomController],
  providers: [GameRoomService, GameRoomGateway],
  exports: [GameRoomService, GameRoomGateway],
})
export class GameRoomModule {}
