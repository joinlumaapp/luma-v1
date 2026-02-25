import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmsProvider } from './sms.provider';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SmsProvider],
  exports: [AuthService, SmsProvider],
})
export class AuthModule {}
