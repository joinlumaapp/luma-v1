import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  Matches,
  IsUUID,
} from "class-validator";

export enum ReportReasonDto {
  SPAM = "SPAM",
  INAPPROPRIATE_PHOTO = "INAPPROPRIATE_PHOTO",
  HARASSMENT = "HARASSMENT",
  UNDERAGE = "UNDERAGE",
  FAKE_PROFILE = "FAKE_PROFILE",
  SCAM = "SCAM",
  OTHER = "OTHER",
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
  @Matches(/^[^<>]*$/, {
    message: "HTML etiketleri kullanilamaz",
  })
  details?: string;
}
