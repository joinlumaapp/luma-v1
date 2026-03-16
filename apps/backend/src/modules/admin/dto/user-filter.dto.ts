import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";

export enum UserStatusFilter {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DELETED = "deleted",
}

export enum UserTierFilter {
  FREE = "FREE",
  GOLD = "GOLD",
  PRO = "PRO",
  RESERVED = "RESERVED",
}

export class UserFilterDto {
  @ApiPropertyOptional({
    description: "Search by name, phone, or ID",
    example: "Ahmet",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by user status",
    enum: UserStatusFilter,
  })
  @IsOptional()
  @IsEnum(UserStatusFilter)
  status?: UserStatusFilter;

  @ApiPropertyOptional({
    description: "Filter by package tier",
    enum: UserTierFilter,
  })
  @IsOptional()
  @IsEnum(UserTierFilter)
  tier?: UserTierFilter;

  @ApiPropertyOptional({
    description: "Filter users created after this date (ISO 8601)",
    example: "2025-01-01",
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: "Filter users created before this date (ISO 8601)",
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
