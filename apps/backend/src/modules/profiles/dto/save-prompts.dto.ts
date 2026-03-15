import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';

export class PromptItemDto {
  @ApiProperty({ description: 'Prompt question text', example: 'A perfect day for me is...' })
  @IsString()
  @MaxLength(200)
  question!: string;

  @ApiProperty({ description: 'User answer to the prompt', example: 'Exploring new coffee shops' })
  @IsString()
  @MaxLength(500)
  answer!: string;

  @ApiProperty({ description: 'Display order (0-based)', example: 0 })
  @IsInt()
  @Min(0)
  order!: number;
}

export class SavePromptsDto {
  @ApiProperty({
    description: 'Profile prompts (max 3)',
    type: [PromptItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PromptItemDto)
  prompts!: PromptItemDto[];
}
