import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class AnswerDailyQuestionDto {
  @ApiProperty({
    description: 'The daily question ID',
    example: 'q_001',
  })
  @IsNotEmpty()
  @IsString()
  questionId!: string;

  @ApiProperty({
    description: 'Selected option ID',
    example: 'opt_001_a',
  })
  @IsNotEmpty()
  @IsString()
  optionId!: string;
}
