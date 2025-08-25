import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SmartSearchService } from './search/smart-search.service';
import { NlpProcessorService } from './nlp-processor.service';
import { MlScoringService } from './ml-scoring.service';
import { ProductScoringAiService } from './product-scoring.ai';
import { PredictionEngineAiService } from './alerts/prediction-engine.ai';
import { ProfitPredictorAiService } from './profit/profit-predictor.ai';
import { KeepaApiService } from '../external-apis/keepa-api.service';
import { KeepaAiService } from '../external-apis/keepa-ai.service';

// DTOs
class NaturalLanguageSearchDto {
  query: string;
  conversationHistory?: string[];
  maxResults?: number;
  includeAnalysis?: boolean;
}

class VoiceSearchDto {
  audioData?: string; // Base64 encoded audio
  query?: string; // Alternative text input
  language?: 'ja' | 'en';
}

class TrendingProductsDto {
  category?: string;
  timeframe?: 'daily' | 'weekly' | 'monthly';
  minScore?: number;
  limit?: number;
}

class BatchAnalysisDto {
  asins: string[];
  analysisType: 'scoring' | 'profit' | 'prediction' | 'all';
}

class MarketIntelligenceDto {
  categories?: string[];
  timeframe?: '1h' | '24h' | '7d' | '30d';
  includeRiskAlerts?: boolean;
  generateReport?: boolean;
}

@ApiTags('AI Search & Analysis')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiSearchController {
  private readonly logger = new Logger(AiSearchController.name);

  constructor(
    private readonly smartSearchService: SmartSearchService,
    private readonly nlpProcessorService: NlpProcessorService,
    private readonly mlScoringService: MlScoringService,
    private readonly productScoringAiService: ProductScoringAiService,
    private readonly predictionEngineAiService: PredictionEngineAiService,
    private readonly profitPredictorAiService: ProfitPredictorAiService,
    private readonly keepaApiService: KeepaApiService,
    private readonly keepaAiService: KeepaAiService,
  ) {}

  @Post('search/natural-language')
  @ApiOperation({ summary: '自然言語による商品検索' })
  @ApiResponse({
    status: 200,
    description: 'AI検索成功',
    schema: {
      type: 'object',
      properties: {
        products: { type: 'array' },
        searchMetadata: { type: 'object' },
        aiRecommendations: { type: 'object' },
      }
    }
  })
  async naturalLanguageSearch(@Body() searchDto: NaturalLanguageSearchDto) {
    this.logger.log(`Natural language search: "${searchDto.query}"`);

    if (!searchDto.query || searchDto.query.trim().length === 0) {
      throw new BadRequestException('検索クエリが必要です');
    }

    return this.smartSearchService.smartSearch(searchDto.query, {
      maxResults: searchDto.maxResults || 20,
      includeAnalysis: searchDto.includeAnalysis ?? true,
      forceRefresh: false,
    });
  }

  @Post('search/conversational')
  @ApiOperation({ summary: '対話型商品検索' })
  @ApiResponse({
    status: 200,
    description: '対話型検索成功',
    schema: {
      type: 'object',
      properties: {
        products: { type: 'array' },
        searchMetadata: { type: 'object' },
        aiRecommendations: { type: 'object' },
        conversationContext: { type: 'string' },
      }
    }
  })
  async conversationalSearch(@Body() searchDto: NaturalLanguageSearchDto) {
    this.logger.log(`Conversational search: "${searchDto.query}"`);

    if (!searchDto.query || searchDto.query.trim().length === 0) {
      throw new BadRequestException('検索クエリが必要です');
    }

    return this.smartSearchService.conversationalSearch(
      searchDto.query,
      searchDto.conversationHistory || []
    );
  }

  @Post('search/voice')
  @ApiOperation({ summary: '音声による商品検索' })
  @ApiResponse({
    status: 200,
    description: '音声検索成功',
    schema: {
      type: 'object',
      properties: {
        transcribedText: { type: 'string' },
        searchResults: { type: 'object' },
      }
    }
  })
  async voiceSearch(@Body() voiceDto: VoiceSearchDto) {
    this.logger.log('Processing voice search request');

    // For now, we'll use the text query if audio processing isn't implemented
    const searchQuery = voiceDto.query || 'デフォルト検索'; // Fallback

    if (voiceDto.audioData) {
      // TODO: Implement speech-to-text processing
      // This would integrate with services like Google Speech-to-Text or AWS Transcribe
      this.logger.warn('Audio processing not yet implemented, using text fallback');
    }

    const searchResults = await this.smartSearchService.smartSearch(searchQuery, {
      maxResults: 10,
      includeAnalysis: true,
    });

    return {
      transcribedText: searchQuery,
      searchResults,
      audioProcessed: !!voiceDto.audioData,
    };
  }

  @Get('trending')
  @ApiOperation({ summary: 'トレンド商品取得' })
  @ApiQuery({ name: 'category', required: false, description: 'カテゴリフィルター' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['daily', 'weekly', 'monthly'] })
  @ApiQuery({ name: 'minScore', required: false, type: Number, description: '最小AIスコア' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '取得件数' })
  @ApiResponse({
    status: 200,
    description: 'トレンド商品取得成功',
    schema: {
      type: 'array',
      items: { type: 'object' }
    }
  })
  async getTrendingProducts(
    @Query('category') category?: string,
    @Query('timeframe') timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly',
    @Query('minScore') minScore: number = 70,
    @Query('limit') limit: number = 20,
  ) {
    this.logger.log(`Getting trending products: category=${category}, timeframe=${timeframe}`);

    return this.smartSearchService.trendingProducts({
      category,
      timeframe,
      minScore,
    });
  }

  @Get('search-suggestions')
  @ApiOperation({ summary: '検索候補生成' })
  @ApiQuery({ name: 'partialQuery', required: true, description: '部分検索クエリ' })
  @ApiResponse({
    status: 200,
    description: '検索候補生成成功',
    schema: {
      type: 'array',
      items: { type: 'string' }
    }
  })
  async getSearchSuggestions(@Query('partialQuery') partialQuery: string) {
    if (!partialQuery || partialQuery.trim().length < 2) {
      return [];
    }

    return this.nlpProcessorService.generateSearchSuggestions(partialQuery);
  }

  @Post('analyze/batch')
  @ApiOperation({ summary: '複数商品一括AI分析' })
  @ApiResponse({
    status: 200,
    description: '一括分析成功',
    schema: {
      type: 'object',
      properties: {
        analyses: { type: 'array' },
        summary: { type: 'object' },
        recommendations: { type: 'array' },
      }
    }
  })
  async batchAnalysis(@Body() batchDto: BatchAnalysisDto) {
    this.logger.log(`Batch analysis for ${batchDto.asins.length} products`);

    if (!batchDto.asins || batchDto.asins.length === 0) {
      throw new BadRequestException('ASINリストが必要です');
    }

    if (batchDto.asins.length > 50) {
      throw new BadRequestException('一度に分析できるのは50商品までです');
    }

    // Validate ASINs
    const invalidAsins = batchDto.asins.filter(
      asin => !this.keepaApiService.isValidAsin(asin)
    );

    if (invalidAsins.length > 0) {
      throw new BadRequestException(`無効なASIN: ${invalidAsins.join(', ')}`);
    }

    // Get product data
    const products = await this.keepaApiService.getMultipleProducts(batchDto.asins, true, 90);
    
    const analyses = [];
    const summary = {
      totalProducts: products.length,
      averageScores: {},
      recommendations: [],
      riskAlerts: [],
    };

    for (const product of products) {
      try {
        let analysis: any = { asin: product.asin };

        switch (batchDto.analysisType) {
          case 'scoring':
            const mlScore = await this.mlScoringService.scoreProduct(product);
            analysis.mlScore = mlScore;
            break;

          case 'profit':
            const priceHistory = await this.keepaApiService.getPriceHistory(product.asin, 90);
            const priceAnalysis = await this.keepaAiService.analyzePriceHistory(product.asin, 90);
            const profitPrediction = await this.profitPredictorAiService.predictProfit(
              product.asin, product, priceHistory, priceAnalysis
            );
            analysis.profitPrediction = profitPrediction;
            break;

          case 'prediction':
            const predictions = await this.predictionEngineAiService.generatePredictions(
              product.asin, { timeHorizon: 30 }
            );
            analysis.predictions = predictions;
            break;

          case 'all':
            // Comprehensive analysis
            const [mlScoreAll, priceHistoryAll, priceAnalysisAll] = await Promise.all([
              this.mlScoringService.scoreProduct(product),
              this.keepaApiService.getPriceHistory(product.asin, 90),
              this.keepaAiService.analyzePriceHistory(product.asin, 90),
            ]);
            
            const [profitPredictionAll, predictionsAll, aiInsights] = await Promise.all([
              this.profitPredictorAiService.predictProfit(
                product.asin, product, priceHistoryAll, priceAnalysisAll
              ),
              this.predictionEngineAiService.generatePredictions(
                product.asin, { timeHorizon: 30 }
              ),
              this.keepaAiService.generateProductInsights(product.asin),
            ]);
            
            analysis = {
              asin: product.asin,
              mlScore: mlScoreAll,
              profitPrediction: profitPredictionAll,
              predictions: predictionsAll,
              aiInsights,
              priceAnalysis: priceAnalysisAll,
            };
            break;
        }

        analyses.push(analysis);
      } catch (error) {
        this.logger.warn(`Analysis failed for ${product.asin}:`, error);
        analyses.push({
          asin: product.asin,
          error: 'Analysis failed',
          message: error.message,
        });
      }
    }

    // Generate summary
    const successfulAnalyses = analyses.filter(a => !a.error);
    if (successfulAnalyses.length > 0) {
      // Calculate averages and generate insights
      summary.totalProducts = successfulAnalyses.length;
      
      // Add more summary logic based on analysis type
      if (batchDto.analysisType === 'scoring' || batchDto.analysisType === 'all') {
        const scores = successfulAnalyses
          .map(a => a.mlScore?.overallScore || a.aiInsights?.profitabilityScore)
          .filter(Boolean);
        
        if (scores.length > 0) {
          summary.averageScores = {
            overall: scores.reduce((sum, score) => sum + score, 0) / scores.length,
            top: Math.max(...scores),
            bottom: Math.min(...scores),
          };
        }
      }
    }

    return {
      analyses,
      summary,
      processedAt: new Date(),
    };
  }

  @Get('market-intelligence')
  @ApiOperation({ summary: 'AI市場インテリジェンス' })
  @ApiQuery({ name: 'categories', required: false, description: 'カテゴリフィルター（カンマ区切り）' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['1h', '24h', '7d', '30d'] })
  @ApiQuery({ name: 'includeRiskAlerts', required: false, type: Boolean })
  @ApiQuery({ name: 'generateReport', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: '市場インテリジェンス取得成功',
    schema: {
      type: 'object',
      properties: {
        overallTrends: { type: 'object' },
        topOpportunities: { type: 'array' },
        riskAlerts: { type: 'array' },
        marketReports: { type: 'array' },
      }
    }
  })
  async getMarketIntelligence(
    @Query('categories') categories?: string,
    @Query('timeframe') timeframe: '1h' | '24h' | '7d' | '30d' = '24h',
    @Query('includeRiskAlerts') includeRiskAlerts: boolean = true,
    @Query('generateReport') generateReport: boolean = true,
  ) {
    this.logger.log('Generating market intelligence');

    // For now, we'll create a mock response
    // In a real implementation, this would aggregate data from multiple sources
    const marketIntelligence = {
      overallTrends: {
        priceDirection: 'up' as const,
        volatilityLevel: 'medium' as const,
        seasonalFactors: ['年末商戦前', 'ブラックフライデー効果'],
        generatedAt: new Date(),
      },
      topOpportunities: await this.getTopOpportunities(categories?.split(','), 10),
      riskAlerts: includeRiskAlerts ? await this.getRiskAlerts(timeframe) : [],
      marketReports: generateReport ? await this.generateMarketReports(timeframe) : [],
    };

    return marketIntelligence;
  }

  @Get('nlp/parse')
  @ApiOperation({ summary: 'NLP検索クエリ解析' })
  @ApiQuery({ name: 'query', required: true, description: '解析する検索クエリ' })
  @ApiResponse({
    status: 200,
    description: 'NLP解析成功',
    schema: {
      type: 'object',
      properties: {
        originalQuery: { type: 'string' },
        extractedCriteria: { type: 'object' },
        confidence: { type: 'number' },
        parsedIntent: { type: 'object' },
      }
    }
  })
  async parseNlpQuery(@Query('query') query: string) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('解析するクエリが必要です');
    }

    return this.nlpProcessorService.parseSearchQuery(query);
  }

  // Helper methods
  private async getTopOpportunities(categories?: string[], limit = 10) {
    // This would implement actual opportunity detection logic
    // For now, return mock data
    const mockOpportunities = [
      {
        asin: 'B08N5WRWNW',
        title: 'ワイヤレス充電器',
        opportunityScore: 95,
        reason: '需要急増中',
      },
    ];

    return mockOpportunities.slice(0, limit);
  }

  private async getRiskAlerts(timeframe: string) {
    // This would implement actual risk detection logic
    return [
      {
        type: 'price_volatility',
        severity: 'medium' as const,
        affectedProducts: ['B07XJ8C8F7'],
        recommendation: '価格変動が大きい商品の監視を強化してください',
        detectedAt: new Date(),
      },
    ];
  }

  private async generateMarketReports(timeframe: string) {
    // This would generate actual AI reports
    return [
      {
        title: `${timeframe}市場分析レポート`,
        summary: 'AIによる市場分析結果のサマリー',
        keyInsights: [
          'エレクトロニクス分野で成長継続',
          '価格競争が激化している分野の特定',
          '新規参入機会のある市場セグメント',
        ],
        generatedAt: new Date(),
      },
    ];
  }
}