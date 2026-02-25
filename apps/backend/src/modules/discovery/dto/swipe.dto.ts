import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export enum SwipeDirection {
  LIKE = 'like',
  PASS = 'pass',
  SUPER_LIKE = 'super_like',
}

export class SwipeDto {
  @ApiProperty({
    description: 'Target user ID being swiped on',
  })
  @IsNotEmpty()
  @IsString()
  targetUserId!: string;

  @ApiProperty({
    description: 'Swipe direction: like, pass, or super_like',
    enum: SwipeDirection,
  })
  @IsNotEmpty()
  @IsEnum(SwipeDirection)
  direction!: SwipeDirection;
}
