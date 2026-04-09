import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AppleSignInDto {
  @ApiProperty({
    description: "Apple identity token from signInAsync credential",
    example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  identityToken!: string;

  @ApiProperty({
    description: "Apple user identifier (stable across sessions)",
    example: "001234.abc123def456.0789",
  })
  @IsString()
  @IsNotEmpty()
  appleUserId!: string;

  @ApiProperty({
    description: "User's first name (only provided on first sign-in)",
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: "User's last name (only provided on first sign-in)",
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: "User's email (only provided on first sign-in)",
    required: false,
  })
  @IsString()
  @IsOptional()
  email?: string;
}
