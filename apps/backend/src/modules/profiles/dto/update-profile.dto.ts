import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
  Min,
  Max,
} from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "First name",
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "Isim en az 1 karakter olmali" })
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    description: "Birth date (ISO format)",
    example: "1998-06-15",
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    description: "Gender",
    enum: ["MALE", "FEMALE", "OTHER"],
  })
  @IsOptional()
  @IsEnum({ MALE: "MALE", FEMALE: "FEMALE", OTHER: "OTHER" })
  gender?: "MALE" | "FEMALE" | "OTHER";

  @ApiPropertyOptional({
    description: "Bio / About me text",
    minLength: 10,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: "Hakkinda yazisi en az 10 karakter olmali" })
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: "Intention tag",
    enum: ["SERIOUS_RELATIONSHIP", "EXPLORING", "NOT_SURE"],
  })
  @IsOptional()
  @IsEnum({
    SERIOUS_RELATIONSHIP: "SERIOUS_RELATIONSHIP",
    EXPLORING: "EXPLORING",
    NOT_SURE: "NOT_SURE",
  })
  intentionTag?: "SERIOUS_RELATIONSHIP" | "EXPLORING" | "NOT_SURE";

  @ApiPropertyOptional({ description: "City" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: "Country" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: "Latitude" })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude" })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: "Job title", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({ description: "Company name", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @ApiPropertyOptional({ description: "Education / School", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  education?: string;

  @ApiPropertyOptional({ description: "Height in centimeters" })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(250)
  height?: number;

  @ApiPropertyOptional({
    description: "Interests / hobbies tags",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({
    description: "Interest tags displayed on profile cards (max 10)",
    type: [String],
    example: ["Müzik", "Seyahat", "Yoga"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(30, {
    each: true,
    message: "Her etiket en fazla 30 karakter olabilir",
  })
  interestTags?: string[];
}
