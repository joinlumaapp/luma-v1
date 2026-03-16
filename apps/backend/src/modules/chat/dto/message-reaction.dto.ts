import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsEnum } from "class-validator";

/**
 * 6 reaction emoji types for chat messages.
 */
export enum ReactionEmojiValue {
  HEART = "HEART",
  LAUGH = "LAUGH",
  WOW = "WOW",
  SAD = "SAD",
  FIRE = "FIRE",
  THUMBS_UP = "THUMBS_UP",
}

export class MessageReactionDto {
  @ApiProperty({
    description: "Reaction emoji type",
    enum: ReactionEmojiValue,
    example: ReactionEmojiValue.HEART,
  })
  @IsNotEmpty()
  @IsEnum(ReactionEmojiValue)
  emoji!: ReactionEmojiValue;
}
