import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsIn } from "class-validator";

const VALID_MBTI_TYPES = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
] as const;

const VALID_ENNEAGRAM_TYPES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
] as const;

export class UpdatePersonalityDto {
  @ApiPropertyOptional({
    description: "MBTI personality type (16 types)",
    enum: VALID_MBTI_TYPES,
    example: "INFJ",
  })
  @IsOptional()
  @IsString()
  @IsIn([...VALID_MBTI_TYPES], {
    message: "Gecerli bir MBTI tipi secin (orn: INTJ, ENFP)",
  })
  mbtiType?: string;

  @ApiPropertyOptional({
    description: "Enneagram personality type (1-9)",
    enum: VALID_ENNEAGRAM_TYPES,
    example: "4",
  })
  @IsOptional()
  @IsString()
  @IsIn([...VALID_ENNEAGRAM_TYPES], {
    message: "Gecerli bir Enneagram tipi secin (1-9)",
  })
  enneagramType?: string;
}
