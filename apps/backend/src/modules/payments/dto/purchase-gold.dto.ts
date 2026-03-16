import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  MaxLength,
  IsIn,
} from "class-validator";

export class PurchaseGoldDto {
  @ApiProperty({
    description: "Gold package ID to purchase",
  })
  @IsNotEmpty()
  @IsString()
  packageId!: string;

  @ApiProperty({
    description: "App Store or Play Store receipt/token",
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10000)
  receipt!: string;

  @ApiProperty({
    description: "Platform: ios or android",
  })
  @IsNotEmpty()
  @IsIn(["apple", "google"])
  platform!: string;
}
