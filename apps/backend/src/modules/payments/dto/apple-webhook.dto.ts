import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for Apple App Store Server Notifications (V2).
 * Apple sends a signed JWS (JSON Web Signature) payload.
 */
export class AppleWebhookDto {
  @ApiProperty({
    description: "Apple S2S signed payload (JWS format)",
    example: "eyJhbGciOiJFUzI1NiIs...",
  })
  @IsString()
  @IsNotEmpty()
  signedPayload!: string;
}
