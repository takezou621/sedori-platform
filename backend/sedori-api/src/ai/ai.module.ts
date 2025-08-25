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
import { AiSearchController } from './ai-search.controller';
import { ProfitAnalysisController } from './profit-analysis.controller';
import { ExternalApisModule } from '../external-apis/external-apis.module';

@Module({
  imports: [
    ConfigModule.forFeature(aiConfig),
    RedisModule.forRootAsync({
      useFactory: () => ({
        type: 'single',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      }),
    }),
    ExternalApisModule,
  ],
  controllers: [
    AiSearchController,
    ProfitAnalysisController,
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