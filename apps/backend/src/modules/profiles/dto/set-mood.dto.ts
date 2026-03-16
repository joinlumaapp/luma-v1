import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsEnum } from "class-validator";

/**
 * 6 mood types for "Bugün Ne Moddayım?" feature.
 * Moods expire after 24 hours.
 */
export enum MoodValue {
  SAKIN = "SAKIN",
  ENERJIK = "ENERJIK",
  YARATICI = "YARATICI",
  DUSUNCELI = "DUSUNCELI",
  HEYECANLI = "HEYECANLI",
  MUTLU = "MUTLU",
}

export class SetMoodDto {
  @ApiProperty({
    description: "Current mood (expires after 24h)",
    enum: MoodValue,
    example: MoodValue.ENERJIK,
  })
  @IsNotEmpty()
  @IsEnum(MoodValue)
  mood!: MoodValue;
}
