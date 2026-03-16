import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsOptional, IsIn } from "class-validator";

export class CreateSessionDto {
  @ApiProperty({
    description: "Match ID to create a Harmony Room session with",
  })
  @IsNotEmpty()
  @IsString()
  matchId!: string;

  @ApiPropertyOptional({
    description: "Optional question deck category to focus the session on",
    enum: ["ICEBREAKER", "DEEP_CONNECTION", "FUN_PLAYFUL"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["ICEBREAKER", "DEEP_CONNECTION", "FUN_PLAYFUL"])
  deckCategory?: string;
}
