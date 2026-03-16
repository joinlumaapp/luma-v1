import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsPhoneNumber, Length } from "class-validator";

export class VerifySmsDto {
  @ApiProperty({
    description: "Phone number in E.164 format",
    example: "+905551234567",
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber()
  phone!: string;

  @ApiProperty({
    description: "6-digit SMS verification code",
    example: "123456",
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  code!: string;
}
