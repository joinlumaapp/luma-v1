import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, Matches } from "class-validator";

export class UpdatePreferencesDto {
  @ApiProperty({
    description: "Yeni eslesmeler bildirimi",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  newMatches?: boolean;

  @ApiProperty({
    description: "Mesaj bildirimleri",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @ApiProperty({
    description: "Harmony davetleri bildirimi",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  harmonyInvites?: boolean;

  @ApiProperty({
    description: "Rozet bildirimleri",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  badges?: boolean;

  @ApiProperty({
    description: "Sistem bildirimleri",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  system?: boolean;

  @ApiProperty({
    description: "Tum bildirimleri kapat",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  allDisabled?: boolean;

  @ApiProperty({
    description: 'Quiet hours start time in HH:mm format (e.g. "23:00")',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "quietHoursStart must be in HH:mm format",
  })
  quietHoursStart?: string;

  @ApiProperty({
    description: 'Quiet hours end time in HH:mm format (e.g. "08:00")',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "quietHoursEnd must be in HH:mm format",
  })
  quietHoursEnd?: string;

  @ApiProperty({
    description: 'User timezone (IANA format, e.g. "Europe/Istanbul")',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export interface NotificationPreferences {
  newMatches: boolean;
  messages: boolean;
  harmonyInvites: boolean;
  badges: boolean;
  system: boolean;
  allDisabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  newMatches: true,
  messages: true,
  harmonyInvites: true,
  badges: true,
  system: true,
  allDisabled: false,
  quietHoursStart: "23:00",
  quietHoursEnd: "08:00",
  timezone: "Europe/Istanbul",
};
