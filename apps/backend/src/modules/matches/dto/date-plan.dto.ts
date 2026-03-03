import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

export class CreateDatePlanDto {
  @ApiProperty({
    description: 'Title of the date plan',
    maxLength: 100,
    example: 'Kahve buluşması',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional({
    description: 'Suggested date and time for the plan (ISO 8601)',
    example: '2026-03-15T18:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  suggestedDate?: string;

  @ApiPropertyOptional({
    description: 'Suggested place for the date',
    maxLength: 200,
    example: 'Bebek Starbucks, Istanbul',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  suggestedPlace?: string;

  @ApiPropertyOptional({
    description: 'Optional note or message about the plan',
    maxLength: 300,
    example: 'Deniz kenarinda oturalim mi?',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class RespondDatePlanDto {
  @ApiProperty({
    description: 'Response to the date plan',
    enum: ['ACCEPTED', 'DECLINED'],
    example: 'ACCEPTED',
  })
  @IsNotEmpty()
  @IsIn(['ACCEPTED', 'DECLINED'])
  response!: 'ACCEPTED' | 'DECLINED';
}
