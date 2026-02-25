import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

const VALID_GOLD_ACTIONS = ['harmony_extension', 'profile_boost', 'super_like'] as const;

export class SpendGoldDto {
  @ApiProperty({
    description: 'Action to spend gold on: harmony_extension, profile_boost, super_like',
    example: 'harmony_extension',
    enum: VALID_GOLD_ACTIONS,
  })
  @IsNotEmpty()
  @IsIn(VALID_GOLD_ACTIONS)
  action!: string;

  @ApiProperty({
    description: 'Optional reference ID (e.g. session ID for harmony extension, target user ID for super like)',
    required: false,
  })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
