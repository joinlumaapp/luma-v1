import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

/**
 * Voice introduction upload metadata.
 * Max duration: 30 seconds.
 */
export class UploadVoiceIntroDto {
  @ApiProperty({
    description: 'Duration of voice recording in seconds (max 30)',
    example: 25,
    minimum: 1,
    maximum: 30,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(30)
  durationSeconds!: number;
}
