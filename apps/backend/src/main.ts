import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Static file serving for uploads
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Security headers — helmet provides baseline, SecurityHeadersMiddleware adds LUMA-specific
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // Remove X-Powered-By header
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Request size limits (10mb for photo uploads)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration with explicit allowed origins
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:8081',
  ];
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (mobile apps, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS politikasi tarafindan engellendi'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'Accept-Language',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],
    credentials: true,
    maxAge: 86400,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global exception filter — catches all unhandled exceptions
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(new RequestLoggerInterceptor());

  // Global pipes — sanitization runs before validation
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger API documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('LUMA API')
      .setDescription(
        'LUMA Premium Dating App — Backend API Documentation\n\n' +
          'Premium compatibility-based dating platform with 19 categories, ' +
          '45 questions (20 core + 25 premium), 3 intention tags, and 4 subscription tiers.\n\n' +
          'Base URL: `/api/v1`',
      )
      .setVersion('1.0.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT Authentication Token — obtain via /auth/verify-sms or /auth/login',
      })
      .addTag('Auth', 'Authentication & verification endpoints')
      .addTag('Profiles', 'User profile management, mood & voice intro')
      .addTag('Discovery', 'Feed & swipe mechanics')
      .addTag('Matches', 'Match lifecycle management')
      .addTag('Chat', 'Messaging & icebreaker games')
      .addTag('Harmony', 'Harmony Room sessions')
      .addTag('Compatibility', 'Questions & scoring, daily questions')
      .addTag('Badges', 'Achievement system')
      .addTag('Payments', 'Subscriptions, gold currency & transactions')
      .addTag('Notifications', 'Push notifications & preferences')
      .addTag('Places', 'Check-ins & shared places')
      .addTag('Relationships', 'Couples features & milestones')
      .addTag('Moderation', 'Reports & blocking')
      .addTag('Health', 'App info, feature flags & health checks')
      .addTag('Users', 'User account management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`LUMA V1 API running on: http://localhost:${port}/api/v1`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`API Docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
