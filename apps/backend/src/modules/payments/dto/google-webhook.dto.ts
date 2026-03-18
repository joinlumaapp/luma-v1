import { IsString, IsNotEmpty, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Google Pub/Sub push message wrapper.
 */
class GooglePubSubMessage {
  @ApiProperty({ description: "Base64-encoded notification data" })
  @IsString()
  @IsNotEmpty()
  data!: string;

  @ApiProperty({ description: "Pub/Sub message ID" })
  @IsString()
  @IsNotEmpty()
  messageId!: string;
}

/**
 * DTO for Google Play Real-Time Developer Notifications (RTDN).
 * Delivered via Google Cloud Pub/Sub push subscription.
 */
export class GoogleWebhookDto {
  @ApiProperty({
    description: "Google Pub/Sub push message",
    type: GooglePubSubMessage,
  })
  @ValidateNested()
  @Type(() => GooglePubSubMessage)
  message!: GooglePubSubMessage;

  @ApiProperty({ description: "Pub/Sub subscription name" })
  @IsString()
  @IsNotEmpty()
  subscription!: string;
}
