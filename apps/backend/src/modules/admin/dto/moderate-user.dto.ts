import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export enum ModerateAction {
  BAN = "ban",
  WARN = "warn",
  VERIFY = "verify",
  UNBAN = "unban",
}

export class ModerateUserDto {
  @ApiProperty({
    description: "Action to take on the user",
    enum: ModerateAction,
    example: ModerateAction.BAN,
  })
  @IsEnum(ModerateAction)
  action!: ModerateAction;

  @ApiPropertyOptional({
    description: "Reason for the action (required for ban/warn)",
    maxLength: 500,
    example: "Uygunsuz icerik paylasimi",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
