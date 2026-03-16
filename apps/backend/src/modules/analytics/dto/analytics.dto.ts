// Analytics DTOs — request/response validation for analytics endpoints

import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ─── Event DTO ───────────────────────────────────────────────────────────────

export class AnalyticsEventDto {
  @ApiProperty({ description: "Event name (snake_case)" })
  @IsString()
  event!: string;

  @ApiProperty({ description: "Event properties (key-value pairs)" })
  properties!: Record<string, string | number | boolean | null>;

  @ApiProperty({ description: "Unix timestamp in milliseconds" })
  @IsNumber()
  timestamp!: number;
}

// ─── Batch Events Request ────────────────────────────────────────────────────

export class BatchEventsDto {
  @ApiProperty({ type: [AnalyticsEventDto], description: "Array of events" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventDto)
  events!: AnalyticsEventDto[];

  @ApiProperty({ description: "Client session ID" })
  @IsString()
  sessionId!: string;

  @ApiProperty({ enum: ["ios", "android"], description: "Client platform" })
  @IsEnum(["ios", "android"])
  platform!: "ios" | "android";

  @ApiProperty({ description: "Client app version" })
  @IsString()
  appVersion!: string;
}

// ─── Dashboard Query ─────────────────────────────────────────────────────────

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: ["day", "week", "month"], default: "day" })
  @IsOptional()
  @IsEnum(["day", "week", "month"])
  period?: "day" | "week" | "month";
}

// ─── Retention Query ─────────────────────────────────────────────────────────

export class RetentionQueryDto {
  @ApiPropertyOptional({
    description: "Number of cohorts to return",
    default: 12,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(52)
  cohorts?: number;
}
