import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { WeeklyReportService } from './weekly-report.service';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [BadgesModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, WeeklyReportService],
  exports: [DiscoveryService, WeeklyReportService],
})
export class DiscoveryModule {}
