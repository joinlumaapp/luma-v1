import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean } from 'class-validator';

export class ToggleVisibilityDto {
  @ApiProperty({
    description: 'Whether the relationship is visible to other users (Couples Club)',
  })
  @IsNotEmpty()
  @IsBoolean()
  isVisible!: boolean;
}
