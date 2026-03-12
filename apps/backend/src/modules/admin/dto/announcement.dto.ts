import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AnnouncementTargetTier {
  ALL = 'all',
  FREE = 'FREE',
  GOLD = 'GOLD',
  PRO = 'PRO',
  RESERVED = 'RESERVED',
}

export class AnnouncementDto {
  @ApiProperty({
    description: 'Announcement title',
    example: 'Yeni ozellik!',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    description: 'Announcement body',
    example: 'LUMA artik daha hizli eslesme sunuyor.',
    maxLength: 2000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  body!: string;

  @ApiPropertyOptional({
    description: 'Target user tier (default: all users)',
    enum: AnnouncementTargetTier,
    default: AnnouncementTargetTier.ALL,
  })
  @IsOptional()
  @IsEnum(AnnouncementTargetTier)
  targetTier?: AnnouncementTargetTier = AnnouncementTargetTier.ALL;
}
