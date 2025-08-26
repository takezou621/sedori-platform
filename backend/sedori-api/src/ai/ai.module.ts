import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ScheduleModule } from '@nestjs/schedule';
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
import { AutonomousDiscoveryService } from './discovery/autonomous-discovery.service';
import { AutonomousDiscoveryController } from './discovery/autonomous-discovery.controller';
import { AdvancedPricePredictorService } from './prediction/advanced-price-predictor.service';
import { AdvancedPricePredictorController } from './prediction/advanced-price-predictor.controller';
import { SupplyChainOptimizerService } from './supply-chain/supply-chain-optimizer.service';
import { SupplyChainOptimizerController } from './supply-chain/supply-chain-optimizer.controller';
import { AdvancedPortfolioOptimizerService } from './optimization/advanced-portfolio-optimizer.service';
import { AdvancedPortfolioOptimizerController } from './optimization/advanced-portfolio-optimizer.controller';
import { Product3DVisualizerService } from './visualization/product-3d-visualizer.service';
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
    ScheduleModule.forRoot(),
    ExternalApisModule,
  ],
  controllers: [
    AiSearchController,
    ProfitAnalysisController,
    AutonomousDiscoveryController,
    AdvancedPricePredictorController,
    SupplyChainOptimizerController,
    AdvancedPortfolioOptimizerController,
  ],
  providers: [
    MlScoringService,
    NlpProcessorService,
    ProductScoringAiService,
    SmartSearchService,
    PredictionEngineAiService,
    TimingOptimizerAiService,
    ProfitPredictorAiService,
    AutonomousDiscoveryService,
    AdvancedPricePredictorService,
    SupplyChainOptimizerService,
    AdvancedPortfolioOptimizerService,
    Product3DVisualizerService,
  ],
  exports: [
    MlScoringService,
    NlpProcessorService,
    ProductScoringAiService,
    SmartSearchService,
    PredictionEngineAiService,
    TimingOptimizerAiService,
    ProfitPredictorAiService,
    AutonomousDiscoveryService,
    AdvancedPricePredictorService,
    SupplyChainOptimizerService,
    AdvancedPortfolioOptimizerService,
    Product3DVisualizerService,
  ],
})
export class AiModule {}