import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class ReorderPhotosDto {
  @ApiProperty({
    description: 'Ordered array of photo IDs representing new order',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  photoIds!: string[];
}
