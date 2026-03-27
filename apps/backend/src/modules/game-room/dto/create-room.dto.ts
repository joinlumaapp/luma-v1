import {
  IsEnum,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateRoomDto {
  @ApiProperty({
    enum: [
      "UNO",
      "OKEY",
      "TRUTH_DARE",
      "TWO_TRUTHS_ONE_LIE",
      "TRIVIA",
      "WORD_BATTLE",
      "EMOJI_GUESS",
      "COMPATIBILITY",
    ],
  })
  @IsEnum([
    "UNO",
    "OKEY",
    "TRUTH_DARE",
    "TWO_TRUTHS_ONE_LIE",
    "TRIVIA",
    "WORD_BATTLE",
    "EMOJI_GUESS",
    "COMPATIBILITY",
  ])
  gameType!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  roomCode?: string;
}
