import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
} from "class-validator";

export enum SwipeDirection {
  LIKE = "LIKE",
  PASS = "PASS",
  SUPER_LIKE = "SUPER_LIKE",
}

export class SwipeDto {
  @ApiProperty({
    description: "Target user ID being swiped on",
  })
  @IsNotEmpty()
  @IsUUID()
  targetUserId!: string;

  @ApiProperty({
    description: "Swipe direction: like, pass, or super_like",
    enum: SwipeDirection,
  })
  @IsNotEmpty()
  @IsEnum(SwipeDirection)
  direction!: SwipeDirection;

  @ApiPropertyOptional({
    description: "Optional comment attached to a LIKE (max 200 chars)",
    example: "Seyahat fotoğrafların harika!",
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  comment?: string;
}
