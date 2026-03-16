import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsOptional,
} from "class-validator";

export class CreateEventDto {
  @ApiProperty({ description: "Event title" })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({ description: "Event description" })
  @IsNotEmpty()
  @IsString()
  description!: string;

  @ApiProperty({ description: "Event date in ISO 8601 format" })
  @IsNotEmpty()
  @IsDateString()
  date!: string;

  @ApiProperty({ description: "Event location" })
  @IsNotEmpty()
  @IsString()
  location!: string;

  @ApiProperty({ description: "Maximum number of couples allowed (2-100)" })
  @IsInt()
  @Min(2)
  @Max(100)
  capacity!: number;

  @ApiProperty({
    description: "Optional image URL for the event",
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
