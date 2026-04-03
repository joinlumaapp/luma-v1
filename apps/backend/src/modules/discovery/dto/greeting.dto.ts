import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class SendGreetingDto {
  @ApiProperty({
    description: "Target user ID to send greeting to",
  })
  @IsNotEmpty()
  @IsString()
  recipientId!: string;
}
