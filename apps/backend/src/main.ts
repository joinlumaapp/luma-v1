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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Static file serving for uploads
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Security headers
  app.use(helmet());

  // Request size limits (10mb for photo uploads)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
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
        description: 'JWT Authentication Token — obtain via /auth/verify-sms or /auth/login',
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
