import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Yeni eslesmeler bildirimi',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  newMatches?: boolean;

  @ApiProperty({
    description: 'Mesaj bildirimleri',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @ApiProperty({
    description: 'Harmony davetleri bildirimi',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  harmonyInvites?: boolean;

  @ApiProperty({
    description: 'Rozet bildirimleri',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  badges?: boolean;

  @ApiProperty({
    description: 'Sistem bildirimleri',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  system?: boolean;

  @ApiProperty({
    description: 'Tum bildirimleri kapat',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  allDisabled?: boolean;
}

export interface NotificationPreferences {
  newMatches: boolean;
  messages: boolean;
  harmonyInvites: boolean;
  badges: boolean;
  system: boolean;
  allDisabled: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  newMatches: true,
  messages: true,
  harmonyInvites: true,
  badges: true,
  system: true,
  allDisabled: false,
};
