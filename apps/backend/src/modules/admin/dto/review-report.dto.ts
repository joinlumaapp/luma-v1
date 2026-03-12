import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ReportDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export enum ReportAction {
  WARN = 'warn',
  BAN = 'ban',
  DISMISS = 'dismiss',
}

export class ReviewReportDto {
  @ApiProperty({
    description: 'Decision on the report',
    enum: ReportDecision,
    example: ReportDecision.APPROVE,
  })
  @IsEnum(ReportDecision)
  decision!: ReportDecision;

  @ApiPropertyOptional({
    description: 'Action to take if approved (warn/ban/dismiss)',
    enum: ReportAction,
  })
  @IsOptional()
  @IsEnum(ReportAction)
  action?: ReportAction;

  @ApiPropertyOptional({
    description: 'Review note from admin/moderator',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
