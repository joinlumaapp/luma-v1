import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AppInfoController } from './app-info.controller';

@Module({
  controllers: [HealthController, AppInfoController],
})
export class HealthModule {}
