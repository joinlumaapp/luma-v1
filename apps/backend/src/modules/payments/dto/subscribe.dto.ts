import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsEnum, IsIn } from "class-validator";

/**
 * LUMA has exactly 4 package tiers (locked architecture).
 */
export enum PackageTier {
  FREE = "free",
  GOLD = "gold",
  PRO = "pro",
  RESERVED = "reserved",
}

export class SubscribeDto {
  @ApiProperty({
    description: "Package tier to subscribe to (4 locked tiers)",
    enum: PackageTier,
  })
  @IsNotEmpty()
  @IsEnum(PackageTier)
  packageTier!: PackageTier;

  @ApiProperty({
    description: "App Store or Play Store receipt/token",
  })
  @IsNotEmpty()
  @IsString()
  receipt!: string;

  @ApiProperty({
    description: "Platform: ios or android",
  })
  @IsNotEmpty()
  @IsIn(["apple", "google"])
  platform!: string;
}
