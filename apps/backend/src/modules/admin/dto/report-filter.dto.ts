import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export enum ReportStatusFilter {
  PENDING = "PENDING",
  REVIEWING = "REVIEWING",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

export enum ReportTypeFilter {
  FAKE_PROFILE = "FAKE_PROFILE",
  HARASSMENT = "HARASSMENT",
  INAPPROPRIATE_PHOTO = "INAPPROPRIATE_PHOTO",
  SPAM = "SPAM",
  UNDERAGE = "UNDERAGE",
  SCAM = "SCAM",
  OTHER = "OTHER",
}

export class ReportFilterDto {
  @ApiPropertyOptional({
    description: "Filter by report status",
    enum: ReportStatusFilter,
  })
  @IsOptional()
  @IsEnum(ReportStatusFilter)
  status?: ReportStatusFilter;

  @ApiPropertyOptional({
    description: "Filter by report category",
    enum: ReportTypeFilter,
  })
  @IsOptional()
  @IsEnum(ReportTypeFilter)
  type?: ReportTypeFilter;

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
