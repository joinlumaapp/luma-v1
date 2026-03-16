import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";

export enum PaymentTypeFilter {
  PURCHASE = "PURCHASE",
  SUBSCRIPTION_ALLOCATION = "SUBSCRIPTION_ALLOCATION",
  REFERRAL_BONUS = "REFERRAL_BONUS",
  BADGE_REWARD = "BADGE_REWARD",
  HARMONY_EXTENSION = "HARMONY_EXTENSION",
  PROFILE_BOOST = "PROFILE_BOOST",
  SUPER_LIKE = "SUPER_LIKE",
}

export class PaymentFilterDto {
  @ApiPropertyOptional({
    description: "Filter by transaction type",
    enum: PaymentTypeFilter,
  })
  @IsOptional()
  @IsEnum(PaymentTypeFilter)
  type?: PaymentTypeFilter;

  @ApiPropertyOptional({
    description: "Filter transactions after this date (ISO 8601)",
    example: "2025-01-01",
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: "Filter transactions before this date (ISO 8601)",
    example: "2025-12-31",
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: "Page number (1-based)", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
