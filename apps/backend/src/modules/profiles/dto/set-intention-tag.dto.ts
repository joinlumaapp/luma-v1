import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsEnum } from "class-validator";

/**
 * LUMA has exactly 5 Hedefler (LOCKED architecture).
 * Values match Prisma enum: IntentionTag
 */
export enum IntentionTagValue {
  EVLENMEK = "EVLENMEK",
  ILISKI = "ILISKI",
  SOHBET_ARKADAS = "SOHBET_ARKADAS",
  KULTUR = "KULTUR",
  DUNYA_GEZME = "DUNYA_GEZME",
}

export class SetIntentionTagDto {
  @ApiProperty({
    description: "User intention tag (one of 5 LOCKED Hedefler)",
    enum: IntentionTagValue,
    example: IntentionTagValue.EVLENMEK,
  })
  @IsNotEmpty()
  @IsEnum(IntentionTagValue)
  intentionTag!: IntentionTagValue;
}
