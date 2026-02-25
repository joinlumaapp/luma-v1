import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, Max } from 'class-validator';

export class ExtendSessionDto {
  @ApiProperty({
    description: 'Session ID to extend',
  })
  @IsNotEmpty()
  @IsString()
  sessionId!: string;

  @ApiProperty({
    description: 'Additional minutes to extend (costs gold)',
    minimum: 5,
    maximum: 60,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(5)
  @Max(60)
  additionalMinutes!: number;
}
