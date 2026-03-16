import { IsArray, ValidateNested, IsUUID } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

class BulkAnswerItem {
  @ApiProperty()
  @IsUUID()
  questionId!: string;

  @ApiProperty()
  @IsUUID()
  optionId!: string;
}

export class SubmitAnswersBulkDto {
  @ApiProperty({ type: [BulkAnswerItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAnswerItem)
  answers!: BulkAnswerItem[];
}
