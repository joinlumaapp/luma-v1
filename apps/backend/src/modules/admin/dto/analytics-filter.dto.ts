import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class AnalyticsFilterDto {
  @ApiPropertyOptional({
    description: 'Start date for analytics range (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date for analytics range (ISO 8601)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
