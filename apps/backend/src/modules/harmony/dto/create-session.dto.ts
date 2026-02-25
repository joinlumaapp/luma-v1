import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    description: 'Match ID to create a Harmony Room session with',
  })
  @IsNotEmpty()
  @IsString()
  matchId!: string;
}
