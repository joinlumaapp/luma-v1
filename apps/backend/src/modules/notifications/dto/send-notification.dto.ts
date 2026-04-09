import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
} from "class-validator";

/**
 * Notification types that can be sent via the internal API.
 * Maps to the Prisma NotificationType enum.
 */
export enum SendNotificationType {
  NEW_MATCH = "NEW_MATCH",
  NEW_MESSAGE = "NEW_MESSAGE",
  SUPER_LIKE = "SUPER_LIKE",
  MATCH_REMOVED = "MATCH_REMOVED",
  BADGE_EARNED = "BADGE_EARNED",
  SUBSCRIPTION_EXPIRING = "SUBSCRIPTION_EXPIRING",
  CANLI_MATCH_FOUND = "CANLI_MATCH_FOUND",
  DAILY_MATCH_READY = "DAILY_MATCH_READY",
  FRIENDSHIP_FORMED = "FRIENDSHIP_FORMED",
  SYSTEM = "SYSTEM",
}

export class SendNotificationDto {
  @ApiProperty({ description: "Target user ID" })
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @ApiProperty({
    description: "Notification type",
    enum: SendNotificationType,
  })
  @IsNotEmpty()
  @IsEnum(SendNotificationType)
  type!: SendNotificationType;

  @ApiPropertyOptional({
    description: "Extra data payload (e.g. matcherName, badgeName)",
    type: "object",
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}

/**
 * DTO for batch sending notifications to multiple users.
 */
export class SendBatchNotificationDto {
  @ApiProperty({ description: "Target user IDs", type: [String] })
  @IsNotEmpty()
  @IsString({ each: true })
  userIds!: string[];

  @ApiProperty({
    description: "Notification type",
    enum: SendNotificationType,
  })
  @IsNotEmpty()
  @IsEnum(SendNotificationType)
  type!: SendNotificationType;

  @ApiPropertyOptional({
    description: "Extra data payload",
    type: "object",
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
