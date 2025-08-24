import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartsModule } from './carts/carts.module';
import { OrdersModule } from './orders/orders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchModule } from './search/search.module';
import { OptimizationModule } from './optimization/optimization.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { StorageModule } from './storage/storage.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ComplianceModule } from './compliance/compliance.module';
import { HealthModule } from './health/health.module';
import { ExternalApisModule } from './external-apis/external-apis.module';
import { AiModule } from './ai/ai.module';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig, appConfig],
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        return [
          {
            name: 'default',
            ttl: 60 * 1000,
            limit: isProduction ? 100 : 1000,
          },
        ];
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!,
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartsModule,
    OrdersModule,
    AnalyticsModule,
    SearchModule,
    OptimizationModule,
    SubscriptionsModule,
    RecommendationsModule,
    StorageModule,
    NotificationsModule,
    ComplianceModule,
    HealthModule,
    ExternalApisModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
