import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifySelfieDto {
  @ApiProperty({
    description: 'Base64-encoded selfie image for identity verification',
  })
  @IsNotEmpty()
  @IsString()
  selfieImage!: string;
}
