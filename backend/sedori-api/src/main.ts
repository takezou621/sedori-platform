import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS with production-ready settings
  const allowedOrigins =
    configService.get('NODE_ENV') === 'production'
      ? [
          configService.get('FRONTEND_URL', 'https://yourdomain.com'),
          configService.get('ADMIN_URL', 'https://admin.yourdomain.com'),
        ]
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3003',
        ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    maxAge: 86400, // 24 hours
  });

  // Security headers
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    if (configService.get('NODE_ENV') === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }
    next();
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Global filters and interceptors
  app.useGlobalFilters(
    new AllExceptionsFilter(configService),
    new HttpExceptionFilter(configService),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: 400,
      enableDebugMessages: configService.get('NODE_ENV') === 'development',
    }),
  );

  // API versioning (temporarily disabled)
  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  // });

  // Swagger API documentation
  if (configService.get('app.nodeEnv') === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Sedori Platform API')
      .setDescription('せどり商材紹介サービス API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);

  console.log(`🚀 Sedori API Server is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
