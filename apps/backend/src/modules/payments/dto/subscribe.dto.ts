import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsEnum, IsIn } from "class-validator";

/**
 * LUMA has exactly 3 package tiers (locked architecture).
 */
export enum PackageTier {
  FREE = "FREE",
  PREMIUM = "PREMIUM",
  SUPREME = "SUPREME",
}

export class SubscribeDto {
  @ApiProperty({
    description: "Package tier to subscribe to (3 locked tiers)",
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
