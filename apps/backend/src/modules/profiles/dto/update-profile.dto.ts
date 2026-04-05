import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsInt,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
  Min,
  Max,
  ValidateIf,
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

  @ApiPropertyOptional({ description: 'Last name', minLength: 1, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Soyisim en az 1 karakter olmali' })
  @MaxLength(50)
  lastName?: string;

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
  @ValidateIf((o) => o.bio !== undefined && o.bio !== null && o.bio !== "")
  @MinLength(10, { message: "Hakkinda yazisi en az 10 karakter olmali" })
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: "Intention tag",
    enum: ["SERIOUS_RELATIONSHIP", "EXPLORING", "NOT_SURE", "MARRIAGE", "FRIENDSHIP", "LEARN_CULTURES", "TRAVEL"],
  })
  @IsOptional()
  @IsString()
  intentionTag?: string;

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

  @ApiPropertyOptional({ description: "Education / School", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  education?: string;

  @ApiPropertyOptional({ description: "Height in centimeters" })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  height?: number;

  @ApiPropertyOptional({ description: "Smoking status", maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  smoking?: string;

  @ApiPropertyOptional({ description: "Drinking status", maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  drinking?: string;

  @ApiPropertyOptional({ description: "Exercise frequency", maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  exercise?: string;

  @ApiPropertyOptional({ description: "Zodiac sign", maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zodiacSign?: string;

  @ApiPropertyOptional({ description: "Religion", maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  religion?: string;

  @ApiPropertyOptional({ description: "Children status", maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  children?: string;

  @ApiPropertyOptional({ description: "Weight in kg" })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(300)
  weight?: number;

  @ApiPropertyOptional({ description: "Sexual orientation", maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  sexualOrientation?: string;

  @ApiPropertyOptional({ description: "Education level", maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  educationLevel?: string;

  @ApiPropertyOptional({ description: "Marital status", maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  maritalStatus?: string;

  @ApiPropertyOptional({ description: "Pets status", maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  pets?: string;

  @ApiPropertyOptional({ description: "Life values", maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  lifeValues?: string;

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
