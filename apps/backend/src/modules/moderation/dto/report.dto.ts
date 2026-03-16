import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsUUID,
} from "class-validator";

export enum ReportReasonDto {
  SPAM = "spam",
  INAPPROPRIATE_PHOTO = "inappropriate_photo",
  HARASSMENT = "harassment",
  UNDERAGE = "underage",
  FAKE_PROFILE = "fake_profile",
  SCAM = "scam",
  OTHER = "other",
}

export class CreateReportDto {
  @ApiProperty({
    description: "ID of the user being reported",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsNotEmpty()
  @IsUUID()
  reportedUserId!: string;

  @ApiProperty({
    description: "Reason for the report",
    enum: ReportReasonDto,
    example: ReportReasonDto.SPAM,
  })
  @IsNotEmpty()
  @IsEnum(ReportReasonDto)
  reason!: ReportReasonDto;

  @ApiPropertyOptional({
    description: "Additional details about the report",
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
