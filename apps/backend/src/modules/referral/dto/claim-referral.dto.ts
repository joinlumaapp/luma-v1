import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length, Matches } from "class-validator";

export class ClaimReferralDto {
  @ApiProperty({
    description: "Referral code to claim (e.g. LUMA-A3F8)",
    example: "LUMA-A3F8",
  })
  @IsNotEmpty()
  @IsString()
  @Length(4, 10)
  @Matches(/^[A-Z0-9-]+$/, {
    message: "Geçersiz davet kodu formatı",
  })
  code!: string;
}
