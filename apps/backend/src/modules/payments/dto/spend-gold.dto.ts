import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  Min,
} from "class-validator";

const VALID_GOLD_ACTIONS = [
  "profile_boost",
  "super_like",
  "read_receipts",
  "undo_pass",
  "spotlight",
  "travel_mode",
  "priority_message",
  "voice_call",
  "video_call",
] as const;

export class SpendGoldDto {
  @ApiProperty({
    description:
      "Action to spend gold on: profile_boost, super_like, read_receipts, undo_pass, spotlight, travel_mode, priority_message",
    example: "profile_boost",
    enum: VALID_GOLD_ACTIONS,
  })
  @IsNotEmpty()
  @IsIn(VALID_GOLD_ACTIONS)
  action!: string;

  @ApiProperty({
    description:
      "Gold amount to spend (defaults to action cost if not specified)",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiProperty({
    description:
      "Optional reference ID (e.g. target user ID for super like)",
    required: false,
  })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
