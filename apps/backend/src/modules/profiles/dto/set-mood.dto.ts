import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsEnum } from "class-validator";

/**
 * 4 mood types for "Anlık Ruh Hali" feature.
 * Moods expire after 4 hours.
 */
export enum MoodValue {
  SOHBETE_ACIGIM = "sohbete_acigim",
  BUGUN_SESSIZIM = "bugun_sessizim",
  BULUSMAYA_VARIM = "bulusmaya_varim",
  KAFEDE_TAKILIYORUM = "kafede_takiliyorum",
}

export class SetMoodDto {
  @ApiProperty({
    description:
      "Current mood (expires after 4h). Send null to clear the mood.",
    enum: MoodValue,
    example: MoodValue.SOHBETE_ACIGIM,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(MoodValue, {
    message:
      "Geçersiz mood değeri. Geçerli değerler: sohbete_acigim, bugun_sessizim, bulusmaya_varim, kafede_takiliyorum",
  })
  mood!: MoodValue | null;
}
