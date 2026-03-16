import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsPhoneNumber,
  IsOptional,
  Length,
} from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "Phone number in E.164 format",
    example: "+905551234567",
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber()
  phone!: string;

  @ApiProperty({
    description: "6-digit SMS verification code",
    example: "123456",
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiPropertyOptional({
    description: "Unique device identifier for fingerprinting",
    example: "D4F5A6B7-C8D9-E0F1-A2B3-C4D5E6F7A8B9",
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: "Device model name",
    example: "iPhone 15 Pro",
  })
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiPropertyOptional({
    description: "Application version",
    example: "1.0.0",
  })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
