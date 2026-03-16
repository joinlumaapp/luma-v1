import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsOptional, MaxLength } from "class-validator";

export class AddMemoryDto {
  @ApiProperty({
    description: "Place ID to add memory to",
  })
  @IsNotEmpty()
  @IsString()
  placeId!: string;

  @ApiProperty({
    description: "Memory text / caption",
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  text!: string;

  @ApiProperty({
    description: "Optional photo URL associated with the memory",
    required: false,
  })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
