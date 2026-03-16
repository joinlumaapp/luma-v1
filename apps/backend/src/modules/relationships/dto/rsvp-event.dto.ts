import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export enum RsvpStatus {
  ATTENDING = "attending",
  MAYBE = "maybe",
  DECLINED = "declined",
}

export class RsvpEventDto {
  @ApiProperty({
    description: "RSVP status for the event",
    enum: RsvpStatus,
    example: "attending",
  })
  @IsEnum(RsvpStatus)
  status!: "attending" | "maybe" | "declined";
}
