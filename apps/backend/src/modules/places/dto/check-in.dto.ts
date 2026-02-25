import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CheckInDto {
  @ApiProperty({
    description: 'Place ID (Google Places or internal ID)',
  })
  @IsNotEmpty()
  @IsString()
  placeId!: string;

  @ApiProperty({
    description: 'Place name',
    example: 'Cafe Istanbul',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  placeName!: string;

  @ApiProperty({ description: 'Latitude (-90 to 90)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ description: 'Longitude (-180 to 180)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiProperty({
    description: 'Optional note with the check-in',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}
