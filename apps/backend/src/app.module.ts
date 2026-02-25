import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

// Core modules
import { PrismaModule } from './prisma/prisma.module';

// Middleware
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';

// Feature modules (Subsystems 1-19)
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { CompatibilityModule } from './modules/compatibility/compatibility.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { MatchesModule } from './modules/matches/matches.module';
import { HarmonyModule } from './modules/harmony/harmony.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { BadgesModule } from './modules/badges/badges.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PlacesModule } from './modules/places/places.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { HealthModule } from './modules/health/health.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { SearchModule } from './modules/search/search.module';
import { ChatModule } from './modules/chat/chat.module';
import { CacheModule } from './modules/cache/cache.module';

@Module({
  imports: [
    // Configuration (global)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // JWT (global — required by JwtAuthGuard used across all modules)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
        },
      }),
    }),

    // Rate limiting (global — 3-tier: burst / sustained / per-minute)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second window
        limit: 10,   // max 10 requests per second (burst protection)
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 second window
        limit: 50,   // max 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minute window
        limit: 100,  // max 100 requests per minute
      },
    ]),

    // Scheduled tasks (cron jobs)
    ScheduleModule.forRoot(),

    // Database
    PrismaModule,

    // Feature Modules — mapped to LUMA subsystems
    AuthModule,              // Subsystem 1-2: Identity & Verification
    UsersModule,             // Subsystem 1: User management
    ProfilesModule,          // Subsystem 3-4: Profile & Intention Tags
    CompatibilityModule,     // Subsystem 5-7: Questions, Scoring, Levels
    DiscoveryModule,         // Subsystem 8: Card Flow & Swiping
    MatchesModule,           // Subsystem 9: Match System
    HarmonyModule,           // Subsystem 10: Harmony Room
    RelationshipsModule,     // Subsystem 11-12: Relationship Mode & Couples Club
    BadgesModule,            // Subsystem 14: Badge & Reputation
    PaymentsModule,          // Subsystem 16-18: Packages, Gold, Monetization
    NotificationsModule,     // Push notifications
    PlacesModule,            // Subsystem 13: Discovered Places
    TasksModule,             // Cron jobs: cleanup, expiry, resets
    HealthModule,            // Health check & ping
    ModerationModule,        // Report & Block (App Store requirement)
    SearchModule,            // Elasticsearch user search
    ChatModule,              // 1-on-1 messaging
    CacheModule,             // Global Redis cache layer
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
