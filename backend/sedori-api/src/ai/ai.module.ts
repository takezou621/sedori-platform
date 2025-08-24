import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import aiConfig from '../config/ai.config';
import { MlScoringService } from './ml-scoring.service';
import { NlpProcessorService } from './nlp-processor.service';
import { ProductScoringAiService } from './product-scoring.ai';
import { SmartSearchService } from './search/smart-search.service';
import { PredictionEngineAiService } from './alerts/prediction-engine.ai';
import { TimingOptimizerAiService } from './alerts/timing-optimizer.ai';
import { ProfitPredictorAiService } from './profit/profit-predictor.ai';

@Module({
  imports: [
    ConfigModule.forFeature(aiConfig),
    RedisModule.forRootAsync({
      useFactory: () => ({
        type: 'single',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      }),
    }),
  ],
  providers: [
    MlScoringService,
    NlpProcessorService,
    ProductScoringAiService,
    SmartSearchService,
    PredictionEngineAiService,
    TimingOptimizerAiService,
    ProfitPredictorAiService,
  ],
  exports: [
    MlScoringService,
    NlpProcessorService,
    ProductScoringAiService,
    SmartSearchService,
    PredictionEngineAiService,
    TimingOptimizerAiService,
    ProfitPredictorAiService,
  ],
})
export class AiModule {}