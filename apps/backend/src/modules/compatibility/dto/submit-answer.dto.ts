import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({
    description: 'Question ID (one of 45 locked questions)',
    example: 'q_001',
  })
  @IsNotEmpty()
  @IsString()
  questionId!: string;

  @ApiProperty({
    description: 'Selected answer option index (0-based)',
    minimum: 0,
    maximum: 4,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(4)
  answerIndex!: number;
}
