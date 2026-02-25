import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsPhoneNumber,
  Length,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+905551234567',
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber()
  phone!: string;

  @ApiProperty({
    description: 'ISO country code',
    example: 'TR',
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 3)
  countryCode!: string;
}
