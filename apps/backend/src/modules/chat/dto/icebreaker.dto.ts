import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
} from "class-validator";

/**
 * 3 Icebreaker game types (LOCKED).
 */
export enum IcebreakerGameType {
  THIS_OR_THAT = "THIS_OR_THAT",
  TWO_TRUTHS_ONE_LIE = "TWO_TRUTHS_ONE_LIE",
  RAPID_FIRE = "RAPID_FIRE",
}

export class StartIcebreakerDto {
  @ApiProperty({
    description: "Type of icebreaker game to start",
    enum: IcebreakerGameType,
    example: IcebreakerGameType.THIS_OR_THAT,
  })
  @IsNotEmpty()
  @IsEnum(IcebreakerGameType)
  gameType!: IcebreakerGameType;
}

export class SubmitIcebreakerAnswerDto {
  @ApiProperty({
    description: "Session ID of the icebreaker game",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsNotEmpty()
  @IsString()
  sessionId!: string;

  @ApiProperty({
    description: "Question ID being answered",
    example: "q1",
  })
  @IsNotEmpty()
  @IsString()
  questionId!: string;

  @ApiProperty({
    description: "Selected answer value",
    example: "A",
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  answer!: string;
}

export class SubmitTwoTruthsDto {
  @ApiProperty({
    description: "Array of 3 statements (2 truths, 1 lie)",
    type: [String],
    example: ["Istanbul'da dogdum", "Piyano calarim", "Uzaya gittim"],
  })
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  statements!: string[];

  @ApiProperty({
    description: "Index of the lie (0, 1, or 2)",
    example: 2,
  })
  @IsNotEmpty()
  lieIndex!: number;
}

export class GuessLieDto {
  @ApiProperty({
    description:
      "Index of the statement the user thinks is the lie (0, 1, or 2)",
    example: 2,
  })
  @IsNotEmpty()
  guessIndex!: number;
}
