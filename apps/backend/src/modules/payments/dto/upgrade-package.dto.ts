import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsIn } from 'class-validator';
import { PackageTier } from './subscribe.dto';

export class UpgradePackageDto {
  @ApiProperty({
    description: 'Target package tier to upgrade to',
    enum: PackageTier,
    example: PackageTier.GOLD,
  })
  @IsNotEmpty()
  @IsEnum(PackageTier)
  targetTier!: PackageTier;

  @ApiProperty({
    description: 'App Store or Play Store receipt/token',
    example: 'mock-receipt-token',
  })
  @IsNotEmpty()
  @IsString()
  receipt!: string;

  @ApiProperty({
    description: 'Platform: ios or android',
    example: 'ios',
  })
  @IsNotEmpty()
  @IsIn(['apple', 'google'])
  platform!: string;
}
