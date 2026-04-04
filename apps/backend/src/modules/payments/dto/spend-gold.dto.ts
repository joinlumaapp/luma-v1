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
  // Matching redesign actions
  "extra_likes_reveal",
  "extra_viewers_reveal",
  "viewer_delay_bypass",
  "priority_visibility_1h",
  "priority_visibility_3h",
  "activity_strip_pin",
  "secret_admirer_send",
  "secret_admirer_extra_guess",
  "compatibility_xray",
  "super_compatible_reveal",
  "ai_chat_suggestion_pack",
  "nearby_notify",
  "weekly_top_reveal",
  "message_bundle_3",
  "message_bundle_5",
  "message_bundle_10",
  // Messaging & social actions
  "send_message",
  "greeting",
  "wave_extra",
  "match_extend",
  "date_planner",
] as const;

export class SpendGoldDto {
  @ApiProperty({
    description:
      "Action to spend gold on. See GOLD_COSTS for full list: profile_boost, super_like, read_receipts, undo_pass, spotlight, travel_mode, priority_message, extra_likes_reveal, extra_viewers_reveal, viewer_delay_bypass, priority_visibility_1h, priority_visibility_3h, activity_strip_pin, secret_admirer_send, secret_admirer_extra_guess, compatibility_xray, super_compatible_reveal, ai_chat_suggestion_pack, nearby_notify, weekly_top_reveal, message_bundle_3, message_bundle_5, message_bundle_10, send_message, greeting, wave_extra, match_extend, date_planner",
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
