import { IsString, IsObject, IsNotEmpty } from "class-validator";

export class GameActionDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
