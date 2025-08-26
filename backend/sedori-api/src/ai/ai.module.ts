import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ThrottlerModule } from '@nestjs/throttler';
import { ExternalApisModule } from '../external-apis/external-apis.module';
import aiConfig from '../config/ai.config';
import { MlScoringService } from './ml-scoring.service';
import { NlpProcessorService } from './nlp-processor.service';
import { ProductScoringAiService } from './product-scoring.ai';
import { SmartSearchService } from './search/smart-search.service';
import { PredictionEngineAiService } from './alerts/prediction-engine.ai';
import { TimingOptimizerAiService } from './alerts/timing-optimizer.ai';
import { ProfitPredictorAiService } from './profit/profit-predictor.ai';
// Revolutionary AI Systems
import { AutonomousDiscoveryService } from './discovery/autonomous-discovery.service';
import { AdvancedPricePredictorService } from './prediction/advanced-price-predictor.service';
import { SupplyChainOptimizerService } from './supply-chain/supply-chain-optimizer.service';
import { AdvancedPortfolioOptimizerService } from './optimization/advanced-portfolio-optimizer.service';
import { Product3DVisualizerService } from './visualization/product-3d-visualizer.service';

@Module({
  imports: [
    ConfigModule.forFeature(aiConfig),
    ThrottlerModule.forRoot([
      {
        name: 'ai-service',
        ttl: 60 * 1000, // 1 minute
        limit: 50, // 50 requests per minute per service
      },
    ]),
    RedisModule.forRootAsync({
      useFactory: () => ({
        type: 'single',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      }),
    }),
    ExternalApisModule, // Import ExternalApisModule for KeepaApiService and other dependencies
  ],
  providers: [
    // Existing AI Services
    MlScoringService,
    NlpProcessorService,
    ProductScoringAiService,
    SmartSearchService,
    PredictionEngineAiService,
    TimingOptimizerAiService,
    ProfitPredictorAiService,
    // Revolutionary AI Systems
    AutonomousDiscoveryService,
    AdvancedPricePredictorService,
    SupplyChainOptimizerService,
    AdvancedPortfolioOptimizerService,
    Product3DVisualizerService,
  ],
  exports: [
    // Existing AI Services
    MlScoringService,
    NlpProcessorService,
    ProductScoringAiService,
    SmartSearchService,
    PredictionEngineAiService,
    TimingOptimizerAiService,
    ProfitPredictorAiService,
    // Revolutionary AI Systems
    AutonomousDiscoveryService,
    AdvancedPricePredictorService,
    SupplyChainOptimizerService,
    AdvancedPortfolioOptimizerService,
    Product3DVisualizerService,
  ],
})
export class AiModule {}