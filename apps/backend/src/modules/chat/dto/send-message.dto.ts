import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  IsUrl,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Merhaba, nasilsin?',
    maxLength: 1000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

  @ApiPropertyOptional({
    description: 'Message type',
    enum: ['TEXT', 'IMAGE'],
    default: 'TEXT',
  })
  @IsOptional()
  @IsString()
  @IsIn(['TEXT', 'IMAGE', 'GIF', 'VOICE'])
  type?: 'TEXT' | 'IMAGE' | 'GIF' | 'VOICE';

  @ApiPropertyOptional({
    description: 'Media URL for image/GIF/voice messages',
    example: 'https://cdn.luma.app/chat/image.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'Duration in seconds for voice messages',
    example: 12.5,
  })
  @IsOptional()
  mediaDuration?: number;
}
