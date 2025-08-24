import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { KeepaApiService } from './keepa-api.service';
import {
  KeepaProduct,
  KeepaPriceHistory,
  KeepaPriceAnalysis,
  KeepaAiInsights,
  SeasonalityPattern,
  PriceAnomaly,
  PricePrediction,
  ActionRecommendation,
} from './interfaces/keepa-data.interface';

@Injectable()
export class KeepaAiService {
  private readonly logger = new Logger(KeepaAiService.name);
  private readonly enableAi: boolean;
  private readonly openaiApiKey: string;
  private readonly confidenceThreshold: number;
  private readonly predictionHorizon: number;

  // Cache TTLs
  private readonly AI_ANALYSIS_CACHE_TTL = 7200; // 2 hours
  private readonly INSIGHTS_CACHE_TTL = 21600; // 6 hours
  private readonly PREDICTION_CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly keepaApiService: KeepaApiService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    const keepaConfig = this.configService.get('externalApis.keepa');
    const aiConfig = this.configService.get('ai');
    
    this.enableAi = keepaConfig?.enableAiEnhancements ?? false;
    this.openaiApiKey = aiConfig?.openai?.apiKey || '';
    this.confidenceThreshold = aiConfig?.prediction?.confidenceThreshold || 0.75;
    this.predictionHorizon = aiConfig?.prediction?.timeHorizon || 90;

    this.logger.log(`Keepa AI Service initialized (AI enabled: ${this.enableAi})`);
  }

  async analyzePriceHistory(asin: string, days = 90): Promise<KeepaPriceAnalysis> {
    const cacheKey = `keepa:ai:analysis:${asin}:${days}`;

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for AI analysis: ${asin}`);
        return JSON.parse(cached);
      }

      // Get price history
      const priceHistory = await this.keepaApiService.getPriceHistory(asin, days);
      
      // Perform AI analysis
      const analysis = await this.performPriceAnalysis(priceHistory);

      // Cache result
      await this.redis.setex(cacheKey, this.AI_ANALYSIS_CACHE_TTL, JSON.stringify(analysis));

      this.logger.log(`AI analysis completed for ASIN: ${asin}`);
      return analysis;

    } catch (error) {
      this.logger.error(`AI price analysis failed for ASIN: ${asin}`, error);
      throw error;
    }
  }

  async generateProductInsights(asin: string): Promise<KeepaAiInsights> {
    const cacheKey = `keepa:ai:insights:${asin}`;

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for AI insights: ${asin}`);
        return JSON.parse(cached);
      }

      // Get product and price data
      const [product, priceAnalysis] = await Promise.all([
        this.keepaApiService.getProduct(asin),
        this.analyzePriceHistory(asin),
      ]);

      // Generate AI insights
      const insights = await this.generateInsights(product, priceAnalysis);

      // Cache result
      await this.redis.setex(cacheKey, this.INSIGHTS_CACHE_TTL, JSON.stringify(insights));

      this.logger.log(`AI insights generated for ASIN: ${asin}`);
      return insights;

    } catch (error) {
      this.logger.error(`AI insights generation failed for ASIN: ${asin}`, error);
      throw error;
    }
  }

  async searchProductsWithAi(
    query: string,
    options: {
      minProfitabilityScore?: number;
      maxRiskLevel?: 'low' | 'medium' | 'high';
      category?: number;
      priceRange?: { min: number; max: number };
      limit?: number;
    } = {},
  ): Promise<Array<KeepaProduct & { aiScore: number; aiInsights: KeepaAiInsights }>> {
    try {
      this.logger.log(`AI-enhanced search: "${query}"`);

      // First, do a regular search
      const products = await this.keepaApiService.searchProducts(
        query,
        options.category,
        0,
        options.limit || 20,
      );

      // Analyze each product with AI
      const analyzedProducts = await Promise.all(
        products.map(async (product) => {
          try {
            const insights = await this.generateProductInsights(product.asin);
            const aiScore = this.calculateCompositeAiScore(insights);

            return {
              ...product,
              aiScore,
              aiInsights: insights,
            };
          } catch (error) {
            this.logger.warn(`Failed to analyze product ${product.asin}:`, error);
            return null;
          }
        }),
      );

      // Filter out failed analyses and apply filters
      let filteredProducts = analyzedProducts.filter((p) => p !== null) as Array<
        KeepaProduct & { aiScore: number; aiInsights: KeepaAiInsights }
      >;

      // Apply AI-based filters
      if (options.minProfitabilityScore) {
        filteredProducts = filteredProducts.filter(
          (p) => p.aiInsights.profitabilityScore >= options.minProfitabilityScore!,
        );
      }

      if (options.maxRiskLevel) {
        const riskThresholds = { low: 30, medium: 60, high: 100 };
        filteredProducts = filteredProducts.filter(
          (p) => p.aiInsights.riskScore <= riskThresholds[options.maxRiskLevel!],
        );
      }

      if (options.priceRange) {
        filteredProducts = filteredProducts.filter((p) => {
          const currentPrice = p.stats?.current?.[0] || 0;
          return (
            currentPrice >= options.priceRange!.min && currentPrice <= options.priceRange!.max
          );
        });
      }

      // Sort by AI score
      filteredProducts.sort((a, b) => b.aiScore - a.aiScore);

      this.logger.log(
        `AI search completed: ${filteredProducts.length} products after filtering`,
      );
      return filteredProducts;

    } catch (error) {
      this.logger.error(`AI search failed for query: "${query}"`, error);
      throw error;
    }
  }

  async generateNaturalLanguageSummary(asin: string): Promise<string> {
    if (!this.enableAi || !this.openaiApiKey) {
      return 'AI summarization is not available. Please configure OpenAI API key.';
    }

    try {
      const [product, analysis] = await Promise.all([
        this.keepaApiService.getProduct(asin),
        this.analyzePriceHistory(asin),
      ]);

      const prompt = this.createSummaryPrompt(product, analysis);
      const summary = await this.callOpenAI(prompt, 'Generate a comprehensive market summary');

      return summary;

    } catch (error) {
      this.logger.error(`Natural language summary failed for ASIN: ${asin}`, error);
      return 'Unable to generate summary at this time.';
    }
  }

  // Private methods for AI analysis
  private async performPriceAnalysis(priceHistory: KeepaPriceHistory): Promise<KeepaPriceAnalysis> {
    const analysis: KeepaPriceAnalysis = {
      asin: priceHistory.asin,
      analysis: {
        trend: this.calculateTrend(priceHistory.amazonPrices),
        trendStrength: this.calculateTrendStrength(priceHistory.amazonPrices),
        volatility: this.calculateVolatility(priceHistory.amazonPrices),
        seasonality: this.detectSeasonality(priceHistory.amazonPrices),
        anomalies: this.detectAnomalies(priceHistory.amazonPrices),
        predictions: await this.generatePredictions(priceHistory.amazonPrices),
        insights: await this.generateAiInsights(priceHistory),
        recommendations: this.generateRecommendations(priceHistory),
      },
      metadata: {
        analyzedAt: new Date(),
        dataPoints: priceHistory.amazonPrices.length,
        confidenceScore: this.calculateConfidenceScore(priceHistory.amazonPrices),
        modelVersion: '1.0',
      },
    };

    return analysis;
  }

  private calculateTrend(prices: any[]): 'rising' | 'falling' | 'stable' | 'volatile' {
    if (prices.length < 2) return 'stable';

    const recentPrices = prices.slice(-10); // Last 10 data points
    if (recentPrices.length < 2) return 'stable';

    const firstPrice = recentPrices[0].price;
    const lastPrice = recentPrices[recentPrices.length - 1].price;
    const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;

    const volatility = this.calculateVolatility(recentPrices);

    if (volatility > 25) return 'volatile';
    if (changePercent > 5) return 'rising';
    if (changePercent < -5) return 'falling';
    return 'stable';
  }

  private calculateTrendStrength(prices: any[]): number {
    if (prices.length < 3) return 0;

    // Linear regression to calculate trend strength
    const n = prices.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    prices.forEach((point, index) => {
      const x = index;
      const y = point.price;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;

    // Normalize slope to 0-1 range
    const normalizedSlope = Math.abs(slope) / avgY;
    return Math.min(normalizedSlope, 1);
  }

  private calculateVolatility(prices: any[]): number {
    if (prices.length < 2) return 0;

    const priceValues = prices.map(p => p.price);
    const mean = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
    const variance = priceValues.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / priceValues.length;
    const standardDeviation = Math.sqrt(variance);

    // Return as percentage of mean
    return (standardDeviation / mean) * 100;
  }

  private detectSeasonality(prices: any[]): SeasonalityPattern[] {
    // Simplified seasonality detection
    // In a full implementation, this would use FFT or similar
    const patterns: SeasonalityPattern[] = [];

    if (prices.length < 52) return patterns; // Need at least a year of weekly data

    // Check for yearly patterns (simplified)
    const monthlyAverages = this.calculateMonthlyAverages(prices);
    const yearlyVariation = this.calculateVariation(monthlyAverages);

    if (yearlyVariation > 0.15) {
      patterns.push({
        period: 'yearly',
        strength: yearlyVariation,
        peakPeriods: this.findPeakPeriods(monthlyAverages),
        lowPeriods: this.findLowPeriods(monthlyAverages),
      });
    }

    return patterns;
  }

  private detectAnomalies(prices: any[]): PriceAnomaly[] {
    const anomalies: PriceAnomaly[] = [];
    
    if (prices.length < 10) return anomalies;

    const priceValues = prices.map(p => p.price);
    const mean = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
    const stdDev = Math.sqrt(
      priceValues.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / priceValues.length
    );

    prices.forEach((point, index) => {
      const zScore = Math.abs((point.price - mean) / stdDev);
      
      if (zScore > 2.5) { // Price is more than 2.5 standard deviations from mean
        anomalies.push({
          timestamp: point.timestamp,
          price: point.price,
          type: point.price > mean ? 'spike' : 'drop',
          severity: zScore > 3 ? 'high' : zScore > 2.8 ? 'medium' : 'low',
          possibleCause: this.inferAnomalyCause(point, prices, index),
        });
      }
    });

    return anomalies;
  }

  private async generatePredictions(prices: any[]): Promise<PricePrediction[]> {
    const predictions: PricePrediction[] = [];
    
    if (prices.length < 10) return predictions;

    // Simple linear trend prediction
    const trend = this.calculateTrendStrength(prices);
    const lastPrice = prices[prices.length - 1].price;
    const volatility = this.calculateVolatility(prices);

    // Generate predictions for next 30, 60, 90 days
    [30, 60, 90].forEach(days => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      // Simple trend-based prediction
      const trendMultiplier = trend * (days / 30);
      const predictedPrice = lastPrice * (1 + trendMultiplier * 0.1);

      // Confidence interval based on volatility
      const confidence = Math.max(0.1, 1 - (volatility / 100));
      const intervalWidth = lastPrice * (volatility / 100) * Math.sqrt(days / 30);

      predictions.push({
        timestamp: futureDate,
        predictedPrice,
        confidenceInterval: {
          lower: predictedPrice - intervalWidth,
          upper: predictedPrice + intervalWidth,
        },
        probability: confidence,
      });
    });

    return predictions;
  }

  private async generateInsights(product: KeepaProduct, analysis: KeepaPriceAnalysis): Promise<KeepaAiInsights> {
    const currentPrice = product.stats?.current?.[0] || 0;
    const salesRank = product.stats?.current?.[3] || 0;

    return {
      asin: product.asin,
      summary: await this.generateProductSummary(product, analysis),
      marketPosition: this.determineMarketPosition(product, salesRank),
      competitiveness: this.calculateCompetitiveness(product, analysis),
      profitabilityScore: this.calculateProfitabilityScore(product, analysis),
      riskScore: this.calculateRiskScore(product, analysis),
      demandIndicators: {
        salesRankTrend: this.analyzeSalesRankTrend(product),
        priceElasticity: this.calculatePriceElasticity(analysis),
        marketSaturation: this.assessMarketSaturation(product),
      },
      strategicRecommendations: this.generateStrategicRecommendations(product, analysis),
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    };
  }

  private calculateCompositeAiScore(insights: KeepaAiInsights): number {
    const weights = {
      profitability: 0.3,
      risk: -0.2, // Negative because lower risk is better
      competitiveness: 0.25,
      demand: 0.25,
    };

    const demandScore = this.getDemandScore(insights.demandIndicators);
    
    return Math.max(0, Math.min(100,
      insights.profitabilityScore * weights.profitability +
      insights.riskScore * weights.risk +
      insights.competitiveness * weights.competitiveness +
      demandScore * weights.demand
    ));
  }

  // Helper methods
  private async callOpenAI(prompt: string, task: string): Promise<string> {
    // This would integrate with OpenAI API
    // For now, return a placeholder
    this.logger.debug(`OpenAI request for: ${task}`);
    return `AI analysis for: ${task}. ${prompt.slice(0, 100)}...`;
  }

  private createSummaryPrompt(product: KeepaProduct, analysis: KeepaPriceAnalysis): string {
    return `Analyze this Amazon product:
Title: ${product.title}
ASIN: ${product.asin}
Current Price: ${product.stats?.current?.[0] || 'N/A'}
Sales Rank: ${product.stats?.current?.[3] || 'N/A'}
Price Trend: ${analysis.analysis.trend}
Volatility: ${analysis.analysis.volatility.toFixed(2)}%

Generate a concise market analysis summary in Japanese for sellers.`;
  }

  // Additional helper methods would be implemented here...
  private calculateMonthlyAverages(prices: any[]): number[] {
    // Implementation for monthly averages
    return [];
  }

  private calculateVariation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  private findPeakPeriods(monthlyAverages: number[]): string[] {
    // Implementation to find peak periods
    return ['December', 'July'];
  }

  private findLowPeriods(monthlyAverages: number[]): string[] {
    // Implementation to find low periods
    return ['February', 'September'];
  }

  private inferAnomalyCause(point: any, prices: any[], index: number): string | undefined {
    // Simple heuristics for anomaly causes
    const month = point.timestamp.getMonth();
    if (month === 11) return 'Year-end shopping surge';
    if (month === 6) return 'Summer bonus period';
    return undefined;
  }

  private async generateProductSummary(product: KeepaProduct, analysis: KeepaPriceAnalysis): Promise<string> {
    return `${product.title}の価格動向は${analysis.analysis.trend === 'rising' ? '上昇' : analysis.analysis.trend === 'falling' ? '下降' : '安定'}傾向。ボラティリティ${analysis.analysis.volatility.toFixed(1)}%。`;
  }

  private determineMarketPosition(product: KeepaProduct, salesRank: number): 'leader' | 'follower' | 'niche' | 'declining' {
    if (salesRank < 1000) return 'leader';
    if (salesRank < 10000) return 'follower';
    if (salesRank < 100000) return 'niche';
    return 'declining';
  }

  private calculateCompetitiveness(product: KeepaProduct, analysis: KeepaPriceAnalysis): number {
    // Simplified competitiveness calculation
    const salesRank = product.stats?.current?.[3] || 999999;
    const reviewCount = product.stats?.reviewCount || 0;
    
    let score = 50;
    if (salesRank < 1000) score += 30;
    else if (salesRank < 10000) score += 15;
    else if (salesRank > 100000) score -= 20;
    
    if (reviewCount > 1000) score += 15;
    else if (reviewCount > 100) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateProfitabilityScore(product: KeepaProduct, analysis: KeepaPriceAnalysis): number {
    // Simplified profitability calculation
    const currentPrice = product.stats?.current?.[0] || 0;
    const volatility = analysis.analysis.volatility;
    
    let score = 50;
    if (currentPrice > 3000) score += 20; // Higher price = potentially higher profit
    if (volatility < 10) score += 15; // Lower volatility = more predictable
    if (analysis.analysis.trend === 'rising') score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateRiskScore(product: KeepaProduct, analysis: KeepaPriceAnalysis): number {
    // Lower score = lower risk
    let risk = 30; // Base risk
    
    if (analysis.analysis.volatility > 20) risk += 30;
    if (analysis.analysis.trend === 'falling') risk += 20;
    if (analysis.analysis.anomalies.length > 3) risk += 15;
    
    return Math.max(0, Math.min(100, risk));
  }

  private analyzeSalesRankTrend(product: KeepaProduct): 'improving' | 'stable' | 'declining' {
    // Simplified sales rank trend analysis
    return 'stable';
  }

  private calculatePriceElasticity(analysis: KeepaPriceAnalysis): number {
    // Simplified price elasticity calculation
    return analysis.analysis.volatility / 100;
  }

  private assessMarketSaturation(product: KeepaProduct): 'low' | 'medium' | 'high' {
    const reviewCount = product.stats?.reviewCount || 0;
    if (reviewCount > 5000) return 'high';
    if (reviewCount > 500) return 'medium';
    return 'low';
  }

  private generateStrategicRecommendations(product: KeepaProduct, analysis: KeepaPriceAnalysis): string[] {
    const recommendations: string[] = [];
    
    if (analysis.analysis.trend === 'rising') {
      recommendations.push('価格上昇トレンドを活用した仕入れタイミングの最適化');
    }
    
    if (analysis.analysis.volatility < 10) {
      recommendations.push('安定した価格動向を活かした長期戦略');
    }
    
    if (analysis.analysis.predictions.length > 0) {
      recommendations.push('AI予測に基づく販売タイミング計画');
    }
    
    return recommendations;
  }

  private generateRecommendations(priceHistory: KeepaPriceHistory): ActionRecommendation[] {
    const recommendations: ActionRecommendation[] = [];
    
    if (priceHistory.amazonPrices.length === 0) return recommendations;
    
    const latestPrice = priceHistory.amazonPrices[priceHistory.amazonPrices.length - 1];
    const avgPrice = priceHistory.amazonPrices.reduce((sum, p) => sum + p.price, 0) / priceHistory.amazonPrices.length;
    
    if (latestPrice.price < avgPrice * 0.9) {
      recommendations.push({
        type: 'buy',
        reason: '現在価格が平均価格より10%以上低い',
        riskLevel: 'low',
        timeframe: 'within 7 days',
        confidence: 0.8,
      });
    }
    
    return recommendations;
  }

  private calculateConfidenceScore(prices: any[]): number {
    if (prices.length < 10) return 0.3;
    if (prices.length < 30) return 0.6;
    return 0.9;
  }

  private async generateAiInsights(priceHistory: KeepaPriceHistory): Promise<string[]> {
    const insights: string[] = [];
    
    if (priceHistory.amazonPrices.length === 0) {
      insights.push('価格データが不足しているため詳細分析ができません');
      return insights;
    }

    const recentPrices = priceHistory.amazonPrices.slice(-10);
    const avgRecentPrice = recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;
    const currentPrice = recentPrices[recentPrices.length - 1].price;

    if (currentPrice < avgRecentPrice * 0.9) {
      insights.push('現在価格が平均価格より10%以上低く、買い時の可能性があります');
    } else if (currentPrice > avgRecentPrice * 1.1) {
      insights.push('現在価格が平均価格より10%以上高く、売り時の可能性があります');
    }

    const volatility = this.calculateVolatility(recentPrices);
    if (volatility > 20) {
      insights.push('価格変動が大きいため、タイミングに注意が必要です');
    } else if (volatility < 5) {
      insights.push('価格が安定しており、予測しやすい商品です');
    }

    return insights;
  }

  private getDemandScore(demandIndicators: any): number {
    let score = 50;
    
    if (demandIndicators.salesRankTrend === 'improving') score += 20;
    if (demandIndicators.marketSaturation === 'low') score += 15;
    if (demandIndicators.priceElasticity < 0.5) score += 15;
    
    return Math.max(0, Math.min(100, score));
  }
}