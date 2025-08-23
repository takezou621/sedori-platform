import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataService } from './market-data.service';
import { AmazonApiService } from './amazon-api.service';
import { RakutenApiService } from './rakuten-api.service';
import { YahooApiService } from './yahoo-api.service';
import { PriceUpdateScheduler } from './schedulers/price-update.scheduler';
import { ApiRateLimiterService } from './rate-limiter/api-rate-limiter.service';
import { Product } from '../products/entities/product.entity';
import externalApisConfig from '../config/external-apis.config';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forFeature(externalApisConfig),
    ScheduleModule.forRoot(),
    RedisModule.forRootAsync({
      useFactory: () => ({
        type: 'single',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      }),
    }),
    TypeOrmModule.forFeature([Product]),
  ],
  providers: [
    MarketDataService,
    AmazonApiService,
    RakutenApiService,
    YahooApiService,
    PriceUpdateScheduler,
    ApiRateLimiterService,
  ],
  exports: [
    MarketDataService,
    AmazonApiService,
    RakutenApiService,
    YahooApiService,
    PriceUpdateScheduler,
    ApiRateLimiterService,
  ],
})
export class ExternalApisModule {}
