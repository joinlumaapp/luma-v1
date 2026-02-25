import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum GenderPreferenceParam {
  MALE = 'male',
  FEMALE = 'female',
  ALL = 'all',
}

export class FeedFilterDto {
  @ApiPropertyOptional({
    description: 'Gender preference filter',
    enum: GenderPreferenceParam,
  })
  @IsOptional()
  @IsEnum(GenderPreferenceParam)
  genderPreference?: GenderPreferenceParam;

  @ApiPropertyOptional({
    description: 'Minimum age filter',
    minimum: 18,
    maximum: 99,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(99)
  minAge?: number;

  @ApiPropertyOptional({
    description: 'Maximum age filter',
    minimum: 18,
    maximum: 99,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(99)
  maxAge?: number;

  @ApiPropertyOptional({
    description: 'Maximum distance in kilometers',
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  maxDistance?: number;

  @ApiPropertyOptional({
    description: 'Intention tag filters (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v: string) => v.trim());
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  intentionTags?: string[];
}
