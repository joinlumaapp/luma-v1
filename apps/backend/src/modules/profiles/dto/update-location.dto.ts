import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min, Max } from "class-validator";

export class UpdateLocationDto {
  @ApiProperty({ description: "Latitude (-90 to 90)", example: 41.0082 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ description: "Longitude (-180 to 180)", example: 28.9784 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}
