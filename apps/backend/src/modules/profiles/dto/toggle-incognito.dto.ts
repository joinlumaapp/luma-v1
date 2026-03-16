import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class ToggleIncognitoDto {
  @ApiProperty({
    description: "Enable or disable incognito mode",
    example: true,
  })
  @IsBoolean()
  enabled!: boolean;
}
