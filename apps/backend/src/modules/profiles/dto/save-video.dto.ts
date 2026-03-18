import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Max, Min } from "class-validator";

export class SaveVideoDto {
  @ApiProperty({
    description: "URL of the uploaded video",
    example: "https://cdn.luma.app/videos/abc123.mp4",
  })
  @IsNotEmpty()
  @IsUrl()
  videoUrl!: string;

  @ApiProperty({
    description: "S3 object key for the video",
    example: "videos/user-id/1234567890.mp4",
  })
  @IsNotEmpty()
  @IsString()
  videoKey!: string;

  @ApiPropertyOptional({
    description: "URL of the video thumbnail image",
    example: "https://cdn.luma.app/thumbnails/abc123.jpg",
  })
  @IsOptional()
  @IsUrl()
  videoThumbnailUrl?: string;

  @ApiPropertyOptional({
    description: "Duration of the video in seconds",
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  videoDuration?: number;
}
