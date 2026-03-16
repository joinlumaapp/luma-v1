import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsBoolean, MaxLength } from "class-validator";

/**
 * DTO for updating fields on the User model (not UserProfile).
 *
 * User model only has: phone, phoneCountryCode, isActive,
 * isSmsVerified, isSelfieVerified, isFullyVerified, packageTier, goldBalance.
 *
 * Profile-level fields (displayName, email, dateOfBirth, gender, city)
 * belong to UserProfile and should be updated via ProfilesModule.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: "Phone country code", example: "+90" })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  phoneCountryCode?: string;

  @ApiPropertyOptional({ description: "Whether the user account is active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
