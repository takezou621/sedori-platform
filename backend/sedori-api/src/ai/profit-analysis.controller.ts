import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ProfitPredictorAiService, ProfitPrediction } from './profit/profit-predictor.ai';
import { KeepaApiService } from '../external-apis/keepa-api.service';
import { KeepaAiService } from '../external-apis/keepa-ai.service';

// DTOs
class SingleProductProfitDto {
  asin: string;
  intendedBuyPrice?: number;
  intendedVolume?: number;
  holdingPeriod?: number;
  riskTolerance?: 'low' | 'medium' | 'high';
}

class MultipleProductComparisonDto {
  products: Array<{
    asin: string;
    intendedBuyPrice?: number;
    intendedVolume?: number;
  }>;
  budget: number;
  userPreferences?: {
    maxRiskLevel?: 'low' | 'medium' | 'high';
    minROI?: number;
    preferredCategories?: string[];
    maxHoldingPeriod?: number;
  };
}

class PortfolioOptimizationDto {
  asins: string[];
  totalBudget: number;
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  targetROI?: number;
  maxPositionsPerProduct?: number;
  diversificationLevel?: 'low' | 'medium' | 'high';
}

class ProfitScenarioAnalysisDto {
  asin: string;
  scenarios: Array<{
    name: string;
    buyPrice: number;
    sellPrice: number;
    volume: number;
    timeframe: number;
  }>;
}

class MarketTimingAnalysisDto {
  asin: string;
  analysisType: 'buy_timing' | 'sell_timing' | 'both';
  timeHorizon: number; // days
  currentPosition?: {
    quantity: number;
    averageBuyPrice: number;
  };
}

@ApiTags('AI Profit Analysis')
@ApiBearerAuth()
@Controller('ai/profit')
@UseGuards(JwtAuthGuard)
export class ProfitAnalysisController {
  private readonly logger = new Logger(ProfitAnalysisController.name);

  constructor(
    private readonly profitPredictorAiService: ProfitPredictorAiService,
    private readonly keepaApiService: KeepaApiService,
    private readonly keepaAiService: KeepaAiService,
  ) {}

  @Post('predict/:asin')
  @ApiOperation({ summary: '単一商品の利益予測' })
  @ApiParam({ name: 'asin', description: 'Amazon ASIN' })
  @ApiResponse({
    status: 200,
    description: '利益予測成功',
    schema: {
      type: 'object',
      properties: {
        prediction: { type: 'object' },
        summary: { type: 'object' },
        userGuidance: { type: 'array' },
      }
    }
  })
  async predictSingleProductProfit(
    @Param('asin') asin: string,
    @Body() profitDto: Omit<SingleProductProfitDto, 'asin'>,
    @GetUser() user: User,
  ) {
    if (!this.keepaApiService.isValidAsin(asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    try {
      this.logger.log(`Generating profit prediction for ${asin} by user ${user.id}`);

      // Get product data
      const [product, priceHistory] = await Promise.all([
        this.keepaApiService.getProduct(asin, true, 90),
        this.keepaApiService.getPriceHistory(asin, 90),
      ]);

      // Get AI price analysis
      const priceAnalysis = await this.keepaAiService.analyzePriceHistory(asin, 90);

      // Generate profit prediction
      const prediction = await this.profitPredictorAiService.predictProfit(
        asin,
        product,
        priceHistory,
        priceAnalysis,
        profitDto
      );

      // Generate user-friendly summary
      const summary = this.generateProfitSummary(prediction, product);

      // Generate actionable guidance
      const userGuidance = this.generateUserGuidance(prediction, profitDto);

      return {
        prediction,
        summary,
        userGuidance,
        generatedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Profit prediction failed for ${asin}:`, error);
      throw error;
    }
  }

  @Post('compare-products')
  @ApiOperation({ summary: '複数商品の利益比較分析' })
  @ApiResponse({
    status: 200,
    description: '比較分析成功',
    schema: {
      type: 'object',
      properties: {
        rankings: { type: 'array' },
        portfolioSuggestion: { type: 'object' },
        insights: { type: 'array' },
      }
    }
  })
  async compareMultipleProducts(
    @Body() comparisonDto: MultipleProductComparisonDto,
    @GetUser() user: User,
  ) {
    if (!comparisonDto.products || comparisonDto.products.length === 0) {
      throw new BadRequestException('商品リストが必要です');
    }

    if (comparisonDto.products.length > 20) {
      throw new BadRequestException('一度に比較できるのは20商品までです');
    }

    if (comparisonDto.budget <= 0) {
      throw new BadRequestException('予算は0より大きい値を設定してください');
    }

    try {
      this.logger.log(`Comparing ${comparisonDto.products.length} products for user ${user.id}`);

      // Validate all ASINs
      const invalidAsins = comparisonDto.products
        .map(p => p.asin)
        .filter(asin => !this.keepaApiService.isValidAsin(asin));

      if (invalidAsins.length > 0) {
        throw new BadRequestException(`無効なASIN: ${invalidAsins.join(', ')}`);
      }

      // Prepare product data
      const productsData = await Promise.all(
        comparisonDto.products.map(async (productDto) => {
          const [product, priceHistory] = await Promise.all([
            this.keepaApiService.getProduct(productDto.asin, true, 90),
            this.keepaApiService.getPriceHistory(productDto.asin, 90),
          ]);
          const priceAnalysis = await this.keepaAiService.analyzePriceHistory(productDto.asin, 90);

          return {
            asin: productDto.asin,
            product,
            priceHistory,
            priceAnalysis,
          };
        })
      );

      // Perform comparison
      const comparison = await this.profitPredictorAiService.compareProducts(
        productsData,
        comparisonDto.budget,
        comparisonDto.userPreferences
      );

      // Generate insights
      const insights = this.generateComparisonInsights(comparison, comparisonDto);

      return {
        ...comparison,
        insights,
        comparisonMetadata: {
          totalProductsAnalyzed: productsData.length,
          budget: comparisonDto.budget,
          generatedAt: new Date(),
        },
      };

    } catch (error) {
      this.logger.error('Product comparison failed:', error);
      throw error;
    }
  }

  @Post('optimize-portfolio')
  @ApiOperation({ summary: 'ポートフォリオ最適化' })
  @ApiResponse({
    status: 200,
    description: 'ポートフォリオ最適化成功',
    schema: {
      type: 'object',
      properties: {
        optimizedPortfolio: { type: 'object' },
        allocationStrategy: { type: 'object' },
        riskAnalysis: { type: 'object' },
      }
    }
  })
  async optimizePortfolio(
    @Body() portfolioDto: PortfolioOptimizationDto,
    @GetUser() user: User,
  ) {
    if (!portfolioDto.asins || portfolioDto.asins.length === 0) {
      throw new BadRequestException('ASINリストが必要です');
    }

    if (portfolioDto.asins.length > 50) {
      throw new BadRequestException('ポートフォリオに含められるのは50商品までです');
    }

    try {
      this.logger.log(`Optimizing portfolio for user ${user.id} with ${portfolioDto.asins.length} products`);

      // Prepare products for comparison
      const productsForComparison = portfolioDto.asins.map(asin => ({
        asin,
        intendedBuyPrice: undefined, // Will be estimated
        intendedVolume: portfolioDto.maxPositionsPerProduct || 10,
      }));

      // Get product comparison data
      const productsData = await Promise.all(
        productsForComparison.map(async (productDto) => {
          const [product, priceHistory] = await Promise.all([
            this.keepaApiService.getProduct(productDto.asin, true, 90),
            this.keepaApiService.getPriceHistory(productDto.asin, 90),
          ]);
          const priceAnalysis = await this.keepaAiService.analyzePriceHistory(productDto.asin, 90);

          return {
            asin: productDto.asin,
            product,
            priceHistory,
            priceAnalysis,
          };
        })
      );

      // Apply risk tolerance filters
      const riskFilters = this.generateRiskFilters(portfolioDto.riskTolerance);

      // Perform portfolio optimization
      const comparison = await this.profitPredictorAiService.compareProducts(
        productsData,
        portfolioDto.totalBudget,
        {
          maxRiskLevel: riskFilters.maxRiskLevel,
          minROI: portfolioDto.targetROI || riskFilters.minROI,
          diversificationLevel: portfolioDto.diversificationLevel,
        }
      );

      // Generate allocation strategy
      const allocationStrategy = this.generateAllocationStrategy(
        comparison.portfolioSuggestion,
        portfolioDto
      );

      // Perform risk analysis
      const riskAnalysis = this.analyzePortfolioRisk(
        comparison.portfolioSuggestion,
        portfolioDto.riskTolerance
      );

      return {
        optimizedPortfolio: comparison.portfolioSuggestion,
        allocationStrategy,
        riskAnalysis,
        optimizationMetadata: {
          totalBudget: portfolioDto.totalBudget,
          riskTolerance: portfolioDto.riskTolerance,
          productsAnalyzed: portfolioDto.asins.length,
          generatedAt: new Date(),
        },
      };

    } catch (error) {
      this.logger.error('Portfolio optimization failed:', error);
      throw error;
    }
  }

  @Get(':asin/break-even')
  @ApiOperation({ summary: '損益分岐点分析' })
  @ApiParam({ name: 'asin', description: 'Amazon ASIN' })
  @ApiQuery({ name: 'buyPrice', required: true, type: Number, description: '想定仕入価格' })
  @ApiResponse({
    status: 200,
    description: '損益分岐点分析成功',
    schema: {
      type: 'object',
      properties: {
        breakEvenAnalysis: { type: 'object' },
        sensitivityAnalysis: { type: 'object' },
        recommendations: { type: 'array' },
      }
    }
  })
  async getBreakEvenAnalysis(
    @Param('asin') asin: string,
    @Query('buyPrice') buyPrice: number,
    @GetUser() user: User,
  ) {
    if (!this.keepaApiService.isValidAsin(asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    if (buyPrice <= 0) {
      throw new BadRequestException('仕入価格は0より大きい値を設定してください');
    }

    try {
      this.logger.log(`Generating break-even analysis for ${asin} at ¥${buyPrice}`);

      const product = await this.keepaApiService.getProduct(asin, false, 30);

      const breakEvenAnalysis = await this.profitPredictorAiService.calculateBreakEvenAnalysis(
        asin,
        product,
        buyPrice
      );

      // Generate sensitivity analysis
      const sensitivityAnalysis = this.generateSensitivityAnalysis(
        product,
        buyPrice,
        breakEvenAnalysis
      );

      // Generate recommendations
      const recommendations = this.generateBreakEvenRecommendations(
        breakEvenAnalysis,
        sensitivityAnalysis
      );

      return {
        breakEvenAnalysis,
        sensitivityAnalysis,
        recommendations,
        analysisMetadata: {
          asin,
          buyPrice,
          generatedAt: new Date(),
        },
      };

    } catch (error) {
      this.logger.error(`Break-even analysis failed for ${asin}:`, error);
      throw error;
    }
  }

  @Post('scenario-analysis')
  @ApiOperation({ summary: 'カスタムシナリオ分析' })
  @ApiResponse({
    status: 200,
    description: 'シナリオ分析成功',
    schema: {
      type: 'object',
      properties: {
        scenarioResults: { type: 'array' },
        bestScenario: { type: 'object' },
        worstScenario: { type: 'object' },
      }
    }
  })
  async analyzeCustomScenarios(
    @Body() scenarioDto: ProfitScenarioAnalysisDto,
    @GetUser() user: User,
  ) {
    if (!this.keepaApiService.isValidAsin(scenarioDto.asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    if (!scenarioDto.scenarios || scenarioDto.scenarios.length === 0) {
      throw new BadRequestException('分析するシナリオが必要です');
    }

    try {
      this.logger.log(`Analyzing ${scenarioDto.scenarios.length} custom scenarios for ${scenarioDto.asin}`);

      const product = await this.keepaApiService.getProduct(scenarioDto.asin, false, 30);

      const scenarioResults = await Promise.all(
        scenarioDto.scenarios.map(async (scenario) => {
          const breakEven = await this.profitPredictorAiService.calculateBreakEvenAnalysis(
            scenarioDto.asin,
            product,
            scenario.buyPrice
          );

          return {
            scenarioName: scenario.name,
            buyPrice: scenario.buyPrice,
            sellPrice: scenario.sellPrice,
            volume: scenario.volume,
            timeframe: scenario.timeframe,
            expectedProfit: (scenario.sellPrice - breakEven.breakEvenPrice) * scenario.volume,
            profitMargin: (scenario.sellPrice - breakEven.breakEvenPrice) / scenario.sellPrice,
            roi: (scenario.sellPrice - scenario.buyPrice) / scenario.buyPrice,
            breakEvenPrice: breakEven.breakEvenPrice,
            marginOfSafety: breakEven.marginOfSafety,
          };
        })
      );

      const bestScenario = scenarioResults.reduce((best, current) =>
        current.expectedProfit > best.expectedProfit ? current : best
      );

      const worstScenario = scenarioResults.reduce((worst, current) =>
        current.expectedProfit < worst.expectedProfit ? current : worst
      );

      return {
        scenarioResults,
        bestScenario,
        worstScenario,
        summary: {
          totalScenarios: scenarioResults.length,
          avgExpectedProfit: scenarioResults.reduce((sum, s) => sum + s.expectedProfit, 0) / scenarioResults.length,
          profitableScenarios: scenarioResults.filter(s => s.expectedProfit > 0).length,
        },
      };

    } catch (error) {
      this.logger.error('Scenario analysis failed:', error);
      throw error;
    }
  }

  @Get(':asin/market-timing')
  @ApiOperation({ summary: '市場タイミング分析' })
  @ApiParam({ name: 'asin', description: 'Amazon ASIN' })
  @ApiQuery({ name: 'analysisType', enum: ['buy_timing', 'sell_timing', 'both'] })
  @ApiQuery({ name: 'timeHorizon', type: Number, description: '分析期間（日数）' })
  @ApiResponse({
    status: 200,
    description: '市場タイミング分析成功',
    schema: {
      type: 'object',
      properties: {
        timingAnalysis: { type: 'object' },
        optimalWindows: { type: 'array' },
        riskFactors: { type: 'array' },
      }
    }
  })
  async analyzeMarketTiming(
    @Param('asin') asin: string,
    @Query('analysisType') analysisType: 'buy_timing' | 'sell_timing' | 'both' = 'both',
    @Query('timeHorizon') timeHorizon: number = 30,
    @GetUser() user: User,
  ) {
    if (!this.keepaApiService.isValidAsin(asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    try {
      this.logger.log(`Analyzing market timing for ${asin} (${analysisType}, ${timeHorizon}d)`);

      const [product, priceHistory, priceAnalysis] = await Promise.all([
        this.keepaApiService.getProduct(asin, true, 90),
        this.keepaApiService.getPriceHistory(asin, 90),
        this.keepaAiService.analyzePriceHistory(asin, 90),
      ]);

      const timingAnalysis = {
        currentMarketConditions: {
          trend: priceAnalysis.analysis.trend,
          volatility: priceAnalysis.analysis.volatility,
          momentum: this.calculateMomentum(priceHistory),
        },
        predictions: priceAnalysis.analysis.predictions.slice(0, Math.ceil(timeHorizon / 7)),
        seasonality: priceAnalysis.analysis.seasonality,
      };

      const optimalWindows = this.identifyOptimalTimingWindows(
        analysisType,
        timingAnalysis,
        timeHorizon
      );

      const riskFactors = this.identifyTimingRiskFactors(
        product,
        priceHistory,
        priceAnalysis
      );

      return {
        timingAnalysis,
        optimalWindows,
        riskFactors,
        recommendations: this.generateTimingRecommendations(
          analysisType,
          optimalWindows,
          riskFactors
        ),
      };

    } catch (error) {
      this.logger.error('Market timing analysis failed:', error);
      throw error;
    }
  }

  // Helper methods
  private generateProfitSummary(prediction: ProfitPrediction, product: any) {
    const bestScenario = prediction.scenarios.find(s => s.name === 'realistic') || prediction.scenarios[0];
    
    return {
      productTitle: product.title,
      asin: prediction.asin,
      recommendedAction: prediction.optimalStrategy.recommendedAction,
      expectedProfit: prediction.optimalStrategy.expectedProfit,
      expectedROI: prediction.optimalStrategy.expectedROI,
      riskLevel: prediction.riskAssessment.overallRisk,
      confidence: prediction.metadata.confidence,
      keyInsights: prediction.recommendations.slice(0, 3).map(r => r.action),
      timeToProfit: bestScenario.timeframe,
    };
  }

  private generateUserGuidance(prediction: ProfitPrediction, userInputs: any): string[] {
    const guidance: string[] = [];
    
    if (prediction.optimalStrategy.recommendedAction === 'buy') {
      guidance.push(`¥${prediction.optimalStrategy.optimalBuyPrice.toLocaleString()}以下で購入を検討してください`);
      guidance.push(`目標売却価格は¥${prediction.optimalStrategy.optimalSellPrice.toLocaleString()}です`);
    }
    
    if (prediction.riskAssessment.overallRisk === 'high') {
      guidance.push('リスクが高いため、少量での取引から開始することをお勧めします');
    }
    
    prediction.recommendations
      .filter(r => r.urgency === 'high')
      .forEach(r => guidance.push(r.action));
    
    return guidance;
  }

  private generateComparisonInsights(comparison: any, inputs: MultipleProductComparisonDto): string[] {
    const insights: string[] = [];
    
    if (comparison.rankings.length > 0) {
      const bestProduct = comparison.rankings[0];
      insights.push(`最も収益性が高い商品: ${bestProduct.asin} (ROI: ${(bestProduct.expectedROI * 100).toFixed(1)}%)`);
    }
    
    const lowRiskProducts = comparison.rankings.filter((p: any) => p.riskLevel === 'low').length;
    if (lowRiskProducts > 0) {
      insights.push(`低リスク商品が${lowRiskProducts}件見つかりました`);
    }
    
    if (comparison.portfolioSuggestion.totalExpectedROI > 0.2) {
      insights.push('提案されたポートフォリオは20%を超えるROIが期待されます');
    }
    
    return insights;
  }

  private generateRiskFilters(riskTolerance: string) {
    switch (riskTolerance) {
      case 'conservative':
        return { maxRiskLevel: 'low' as const, minROI: 0.1 };
      case 'balanced':
        return { maxRiskLevel: 'medium' as const, minROI: 0.15 };
      case 'aggressive':
        return { maxRiskLevel: 'high' as const, minROI: 0.25 };
      default:
        return { maxRiskLevel: 'medium' as const, minROI: 0.15 };
    }
  }

  private generateAllocationStrategy(portfolio: any, dto: PortfolioOptimizationDto) {
    return {
      totalProducts: portfolio.selectedProducts.length,
      avgAllocationPerProduct: portfolio.totalInvestment / portfolio.selectedProducts.length,
      riskAllocation: portfolio.riskDistribution,
      recommendations: [
        '分散投資により全体リスクを軽減',
        '定期的なポートフォリオ見直しを推奨',
      ],
    };
  }

  private analyzePortfolioRisk(portfolio: any, riskTolerance: string) {
    return {
      overallRiskScore: this.calculateOverallRiskScore(portfolio.riskDistribution),
      diversificationLevel: this.calculateDiversificationLevel(portfolio.selectedProducts),
      maxDrawdown: portfolio.selectedProducts.length > 0 ? 
        Math.max(...portfolio.selectedProducts.map((p: any) => p.expectedProfit * -0.3)) : 0,
      riskMitigationSuggestions: [
        '異なるカテゴリの商品を選択して分散を図る',
        '高リスク商品の比重を調整する',
      ],
    };
  }

  private generateSensitivityAnalysis(product: any, buyPrice: number, breakEven: any) {
    const pricePoints = [-0.1, -0.05, 0, 0.05, 0.1].map(change => buyPrice * (1 + change));
    
    return {
      buyPriceSensitivity: pricePoints.map(price => ({
        buyPrice: price,
        breakEvenPrice: price * 1.3, // Simplified calculation
        profitAtCurrentPrice: (product.stats?.current?.[0] / 100 || 0) - (price * 1.3),
      })),
      sellPriceSensitivity: [0.9, 0.95, 1.0, 1.05, 1.1].map(multiplier => {
        const sellPrice = (product.stats?.current?.[0] / 100 || 0) * multiplier;
        return {
          sellPrice,
          profit: sellPrice - breakEven.breakEvenPrice,
          profitMargin: (sellPrice - breakEven.breakEvenPrice) / sellPrice,
        };
      }),
    };
  }

  private generateBreakEvenRecommendations(breakEven: any, sensitivity: any): string[] {
    const recommendations: string[] = [];
    
    if (breakEven.marginOfSafety < 10) {
      recommendations.push('安全余裕率が低いため、より低い仕入価格を検討してください');
    }
    
    if (breakEven.profitAtCurrentPrice < 0) {
      recommendations.push('現在価格では損失となるため取引を避けることをお勧めします');
    } else if (breakEven.profitAtCurrentPrice > breakEven.breakEvenPrice * 0.2) {
      recommendations.push('十分な利益率があるため取引を検討できます');
    }
    
    return recommendations;
  }

  private calculateMomentum(priceHistory: any): number {
    if (priceHistory.amazonPrices.length < 7) return 0;
    
    const recent = priceHistory.amazonPrices.slice(-7);
    const older = priceHistory.amazonPrices.slice(-14, -7);
    
    const recentAvg = recent.reduce((sum: number, p: any) => sum + p.price, 0) / recent.length;
    const olderAvg = older.reduce((sum: number, p: any) => sum + p.price, 0) / older.length;
    
    return (recentAvg - olderAvg) / olderAvg;
  }

  private identifyOptimalTimingWindows(type: string, analysis: any, horizon: number) {
    // Simplified implementation
    return [
      {
        type: 'buy',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        confidence: 0.7,
        reasoning: 'Price trend suggests favorable buying conditions',
      },
      {
        type: 'sell',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        confidence: 0.8,
        reasoning: 'Expected price peak based on historical patterns',
      },
    ].filter(w => type === 'both' || w.type === type.replace('_timing', ''));
  }

  private identifyTimingRiskFactors(product: any, priceHistory: any, analysis: any) {
    return [
      {
        factor: 'Price volatility',
        severity: analysis.analysis.volatility > 25 ? 'high' : 'medium',
        impact: 'May affect optimal timing accuracy',
      },
      {
        factor: 'Market trend',
        severity: analysis.analysis.trend === 'volatile' ? 'high' : 'low',
        impact: 'Trend changes could invalidate timing predictions',
      },
    ];
  }

  private generateTimingRecommendations(type: string, windows: any[], riskFactors: any[]): string[] {
    const recommendations: string[] = [];
    
    if (windows.length > 0) {
      const bestWindow = windows.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );
      recommendations.push(`最適な${bestWindow.type}タイミング: ${bestWindow.reasoning}`);
    }
    
    const highRiskFactors = riskFactors.filter(f => f.severity === 'high');
    if (highRiskFactors.length > 0) {
      recommendations.push('高リスク要因があるため慎重な判断が必要です');
    }
    
    return recommendations;
  }

  private calculateOverallRiskScore(distribution: any): number {
    const weights = { low: 1, medium: 2, high: 3 };
    const total = distribution.low + distribution.medium + distribution.high;
    if (total === 0) return 0;
    
    return (distribution.low * weights.low + 
            distribution.medium * weights.medium + 
            distribution.high * weights.high) / total;
  }

  private calculateDiversificationLevel(products: any[]): 'low' | 'medium' | 'high' {
    if (products.length < 3) return 'low';
    if (products.length < 7) return 'medium';
    return 'high';
  }
}