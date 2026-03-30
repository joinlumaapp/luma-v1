import { IsString, IsIn, IsArray, IsOptional, MaxLength } from "class-validator";

export class CreatePostDto {
  @IsIn(["photo", "video", "text"])
  postType!: string;

  @IsString()
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @IsOptional()
  @IsString()
  videoUrl?: string | null;
}
