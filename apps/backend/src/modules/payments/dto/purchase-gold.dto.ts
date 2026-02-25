import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, IsIn } from 'class-validator';

export class PurchaseGoldDto {
  @ApiProperty({
    description: 'Gold package ID to purchase',
  })
  @IsNotEmpty()
  @IsString()
  packageId!: string;

  @ApiProperty({
    description: 'App Store or Play Store receipt/token',
  })
  @IsNotEmpty()
  @IsString()
  receipt!: string;

  @ApiProperty({
    description: 'Platform: ios or android',
  })
  @IsNotEmpty()
  @IsIn(['ios', 'android'])
  platform!: string;
}
