import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ActivateRelationshipDto {
  @ApiProperty({
    description: 'Match ID to convert into a relationship',
  })
  @IsNotEmpty()
  @IsString()
  matchId!: string;
}
