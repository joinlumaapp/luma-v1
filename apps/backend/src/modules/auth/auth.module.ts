import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmsProvider, NetgsmProvider, TwilioProvider, MockSmsProvider } from './sms.provider';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SmsProvider,
    NetgsmProvider,
    TwilioProvider,
    MockSmsProvider,
  ],
  exports: [AuthService, SmsProvider],
})
export class AuthModule {}
