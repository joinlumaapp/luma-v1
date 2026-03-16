import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, ArrayMinSize } from "class-validator";

export class MarkReadDto {
  @ApiProperty({
    description: "Array of notification IDs to mark as read",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  notificationIds!: string[];
}
