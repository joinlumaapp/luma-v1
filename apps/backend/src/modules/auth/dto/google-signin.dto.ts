import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsOptional, IsEmail } from "class-validator";

export class GoogleSignInDto {
  @ApiProperty({ description: "Google ID token from client" })
  @IsNotEmpty()
  @IsString()
  idToken!: string;

  @ApiProperty({ description: "Google user ID" })
  @IsNotEmpty()
  @IsString()
  googleUserId!: string;

  @ApiPropertyOptional({ description: "User's first name from Google profile" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: "User's last name from Google profile" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: "User's email from Google profile" })
  @IsOptional()
  @IsEmail()
  email?: string;
}
