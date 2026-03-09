import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { WeeklyReportService } from './weekly-report.service';
import { BadgesModule } from '../badges/badges.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [BadgesModule, NotificationsModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, WeeklyReportService],
  exports: [DiscoveryService, WeeklyReportService],
})
export class DiscoveryModule {}
