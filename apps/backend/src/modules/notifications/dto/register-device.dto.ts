import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsEnum } from "class-validator";

export enum DevicePlatform {
  IOS = "ios",
  ANDROID = "android",
}

export class RegisterDeviceDto {
  @ApiProperty({
    description: "Push notification token (FCM or APNs)",
  })
  @IsNotEmpty()
  @IsString()
  pushToken!: string;

  @ApiProperty({
    description: "Device platform",
    enum: DevicePlatform,
  })
  @IsNotEmpty()
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;

  @ApiProperty({
    description: "Unique device identifier",
  })
  @IsNotEmpty()
  @IsString()
  deviceId!: string;
}
