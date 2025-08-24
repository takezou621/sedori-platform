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
import { KeepaApiService } from './keepa-api.service';
import { KeepaAiService } from './keepa-ai.service';
import { PriceUpdateScheduler } from './schedulers/price-update.scheduler';
import { ApiRateLimiterService } from './rate-limiter/api-rate-limiter.service';
import { Product } from '../products/entities/product.entity';
import externalApisConfig from '../config/external-apis.config';
import aiConfig from '../config/ai.config';
import { MlScoringService } from '../ai/ml-scoring.service';
import { NlpProcessorService } from '../ai/nlp-processor.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forFeature(externalApisConfig),
    ConfigModule.forFeature(aiConfig),
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
    KeepaApiService,
    KeepaAiService,
    PriceUpdateScheduler,
    ApiRateLimiterService,
    MlScoringService,
    NlpProcessorService,
  ],
  exports: [
    MarketDataService,
    AmazonApiService,
    RakutenApiService,
    YahooApiService,
    KeepaApiService,
    KeepaAiService,
    PriceUpdateScheduler,
    ApiRateLimiterService,
    MlScoringService,
    NlpProcessorService,
  ],
})
export class ExternalApisModule {}
