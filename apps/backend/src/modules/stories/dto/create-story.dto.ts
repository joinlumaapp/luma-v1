// DTO for story creation

import {
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export enum StoryMediaType {
  IMAGE = "image",
  VIDEO = "video",
}

export enum StoryOverlayType {
  TEXT = "text",
  STICKER = "sticker",
  DRAWING = "drawing",
}

export class StoryOverlayDto {
  @IsEnum(StoryOverlayType)
  type!: StoryOverlayType;

  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  fontSize?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  pathData?: string;

  @IsOptional()
  @IsNumber()
  brushSize?: number;

  @IsOptional()
  @IsString()
  brushColor?: string;
}

export class CreateStoryDto {
  @IsEnum(StoryMediaType)
  mediaType!: StoryMediaType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoryOverlayDto)
  overlays!: StoryOverlayDto[];
}

export class ReplyToStoryDto {
  @IsString()
  message!: string;
}
