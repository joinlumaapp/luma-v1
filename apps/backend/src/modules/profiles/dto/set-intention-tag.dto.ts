import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';

/**
 * LUMA has exactly 3 Intention Tags (LOCKED architecture).
 * Values match Prisma enum: IntentionTag
 */
export enum IntentionTagValue {
  SERIOUS_RELATIONSHIP = 'SERIOUS_RELATIONSHIP',
  EXPLORING = 'EXPLORING',
  NOT_SURE = 'NOT_SURE',
}

export class SetIntentionTagDto {
  @ApiProperty({
    description: 'User intention tag (one of 3 LOCKED options)',
    enum: IntentionTagValue,
    example: IntentionTagValue.SERIOUS_RELATIONSHIP,
  })
  @IsNotEmpty()
  @IsEnum(IntentionTagValue)
  intentionTag!: IntentionTagValue;
}
