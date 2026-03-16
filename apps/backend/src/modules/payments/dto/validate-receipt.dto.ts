import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsIn } from "class-validator";

export class ValidateReceiptDto {
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
