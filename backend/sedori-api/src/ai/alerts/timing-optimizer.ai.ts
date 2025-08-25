import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { KeepaProduct, KeepaPriceHistory } from '../../external-apis/interfaces/keepa-data.interface';

export interface OptimalTiming {
  asin: string;
  buyTiming: TimingRecommendation;
  sellTiming: TimingRecommendation;
  watchPeriods: WatchPeriod[];
  riskWindows: RiskWindow[];
  metadata: {
    confidence: number;
    analysisDate: Date;
    modelVersion: string;
  };
}

export interface TimingRecommendation {
  action: 'buy' | 'sell' | 'wait' | 'monitor';
  optimalDate: Date;
  priceTarget: number;
  confidence: number;
  reasoning: string[];
  alternativeWindows: TimeWindow[];
  urgency: 'immediate' | 'soon' | 'flexible' | 'avoid';
}

export interface TimeWindow {
  startDate: Date;
  endDate: Date;
  expectedPrice: number;
  probabilityOfSuccess: number;
  description: string;
}

export interface WatchPeriod {
  startDate: Date;
  endDate: Date;
  reason: string;
  expectedEvent: string;
  monitoringFrequency: 'hourly' | 'daily' | 'weekly';
}

export interface RiskWindow {
  startDate: Date;
  endDate: Date;
  riskType: 'price_drop' | 'demand_decline' | 'competition_surge' | 'market_shift';
  severity: 'low' | 'medium' | 'high';
  probability: number;
  mitigation: string;
}

@Injectable()
export class TimingOptimizerAiService {
  private readonly logger = new Logger(TimingOptimizerAiService.name);
  private readonly TIMING_CACHE_TTL = 7200; // 2 hours

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async optimizeTiming(
    asin: string,
    optionsOrProduct: any,
    priceHistory?: KeepaPriceHistory,
    userPreferences?: {
      riskTolerance?: 'low' | 'medium' | 'high';
      investmentHorizon?: 'short' | 'medium' | 'long';
      profitTarget?: number;
    }
  ): Promise<OptimalTiming & { recommendations?: string[] }> {
    // Handle both signatures for compatibility
    let product: KeepaProduct;
    let actualPriceHistory: KeepaPriceHistory;
    let actualPreferences = userPreferences;

    if (priceHistory) {
      // Full signature: (asin, product, priceHistory, userPreferences)
      product = optionsOrProduct;
      actualPriceHistory = priceHistory;
    } else {
      // Simplified signature: (asin, options) - need to fetch data
      // For now, return a mock response
      return {
        asin,
        buyTiming: {
          action: 'wait',
          optimalDate: new Date(),
          priceTarget: 0,
          confidence: 0.7,
          reasoning: ['Insufficient data for detailed timing analysis'],
          alternativeWindows: [],
          urgency: 'flexible',
        },
        sellTiming: {
          action: 'monitor',
          optimalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          priceTarget: 0,
          confidence: 0.7,
          reasoning: ['Need more data for accurate sell timing'],
          alternativeWindows: [],
          urgency: 'flexible',
        },
        watchPeriods: [],
        riskWindows: [],
        metadata: {
          confidence: 0.7,
          analysisDate: new Date(),
          modelVersion: '1.0',
        },
        recommendations: ['Consider providing more product data for better analysis'],
      } as OptimalTiming & { recommendations?: string[] };
    }
    const cacheKey = `timing-optimization:${asin}:${JSON.stringify(userPreferences || {})}`;

    try {
      // Check cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for timing optimization: ${asin}`);
        return JSON.parse(cached);
      }

      this.logger.log(`Optimizing timing for ASIN: ${asin}`);

      // Analyze price patterns and trends
      const pricePatterns = this.analyzeHistoricalPatterns(priceHistory);
      
      // Generate buy timing recommendation
      const buyTiming = this.optimizeBuyTiming(product, priceHistory, pricePatterns, userPreferences);
      
      // Generate sell timing recommendation  
      const sellTiming = this.optimizeSellTiming(product, priceHistory, pricePatterns, userPreferences);
      
      // Identify optimal watch periods
      const watchPeriods = this.identifyWatchPeriods(priceHistory, pricePatterns);
      
      // Identify risk windows
      const riskWindows = this.identifyRiskWindows(product, priceHistory, pricePatterns);

      const optimalTiming: OptimalTiming = {
        asin,
        buyTiming,
        sellTiming,
        watchPeriods,
        riskWindows,
        metadata: {
          confidence: this.calculateOverallConfidence(buyTiming, sellTiming, pricePatterns),
          analysisDate: new Date(),
          modelVersion: '1.0',
        },
      };

      // Cache the result
      await this.redis.setex(cacheKey, this.TIMING_CACHE_TTL, JSON.stringify(optimalTiming));

      this.logger.log(`Timing optimization completed for ${asin}`);
      return optimalTiming;

    } catch (error) {
      this.logger.error(`Timing optimization failed for ${asin}:`, error);
      throw error;
    }
  }

  async getBulkTimingRecommendations(
    products: Array<{ asin: string; product: KeepaProduct; priceHistory: KeepaPriceHistory }>,
    userPreferences?: any
  ): Promise<OptimalTiming[]> {
    this.logger.log(`Generating bulk timing recommendations for ${products.length} products`);

    const timingPromises = products.map(async ({ asin, product, priceHistory }) => {
      try {
        return await this.optimizeTiming(asin, product, priceHistory, userPreferences);
      } catch (error) {
        this.logger.warn(`Failed to optimize timing for ${asin}:`, error);
        return null;
      }
    });

    const results = await Promise.all(timingPromises);
    return results.filter(result => result !== null) as OptimalTiming[];
  }

  async getMarketTimingInsights(category?: string): Promise<{
    bestBuyPeriods: TimeWindow[];
    bestSellPeriods: TimeWindow[];
    generalTrends: string[];
    seasonalPatterns: string[];
  }> {
    try {
      this.logger.log(`Generating market timing insights for category: ${category || 'all'}`);

      // This would analyze market-wide patterns
      // For now, provide general insights
      
      const currentMonth = new Date().getMonth();
      const bestBuyPeriods: TimeWindow[] = [];
      const bestSellPeriods: TimeWindow[] = [];

      // Generate seasonal buying periods
      if (currentMonth >= 9 && currentMonth <= 10) { // Oct-Nov
        bestBuyPeriods.push({
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          expectedPrice: 0, // Would be calculated based on data
          probabilityOfSuccess: 0.8,
          description: '年末商戦前の仕入れ最適期',
        });
      }

      // Generate seasonal selling periods
      if (currentMonth === 11) { // December
        bestSellPeriods.push({
          startDate: new Date(),
          endDate: new Date(2024, 11, 25), // Christmas
          expectedPrice: 0,
          probabilityOfSuccess: 0.85,
          description: 'クリスマス商戦での販売最適期',
        });
      }

      return {
        bestBuyPeriods,
        bestSellPeriods,
        generalTrends: [
          '年末にかけて多くのカテゴリで価格上昇傾向',
          '新学期前後（3月、9月）に文具・書籍の需要増',
          '夏期（6-8月）にアウトドア・スポーツ用品の需要増',
        ],
        seasonalPatterns: [
          'クリスマス商戦（11-12月）: おもちゃ・電子機器の需要ピーク',
          'ゴールデンウィーク前（4月）: レジャー用品の需要増',
          'ボーナス時期（6月、12月）: 高額商品の売れ行き向上',
        ],
      };

    } catch (error) {
      this.logger.error('Failed to generate market timing insights:', error);
      throw error;
    }
  }

  // Private analysis methods
  private analyzeHistoricalPatterns(priceHistory: KeepaPriceHistory): {
    cyclicalPatterns: any[];
    trendStrength: number;
    volatilityProfile: any;
    seasonalFactors: any;
  } {
    const prices = priceHistory.amazonPrices.map(p => p.price);
    
    if (prices.length < 30) {
      return {
        cyclicalPatterns: [],
        trendStrength: 0,
        volatilityProfile: { low: true, medium: false, high: false },
        seasonalFactors: {},
      };
    }

    // Analyze cyclical patterns (simplified)
    const cyclicalPatterns = this.detectCycles(prices);
    
    // Calculate trend strength
    const trendStrength = this.calculateTrendStrength(prices);
    
    // Analyze volatility profile
    const volatilityProfile = this.analyzeVolatilityProfile(prices);
    
    // Detect seasonal factors
    const seasonalFactors = this.detectSeasonalFactors(priceHistory);

    return {
      cyclicalPatterns,
      trendStrength,
      volatilityProfile,
      seasonalFactors,
    };
  }

  private optimizeBuyTiming(
    product: KeepaProduct,
    priceHistory: KeepaPriceHistory,
    patterns: any,
    userPreferences?: any
  ): TimingRecommendation {
    const currentPrice = priceHistory.amazonPrices[priceHistory.amazonPrices.length - 1]?.price || 0;
    const avgPrice = priceHistory.amazonPrices.reduce((sum, p) => sum + p.price, 0) / priceHistory.amazonPrices.length;

    let action: TimingRecommendation['action'] = 'monitor';
    let urgency: TimingRecommendation['urgency'] = 'flexible';
    let confidence = 0.5;
    const reasoning: string[] = [];
    const alternativeWindows: TimeWindow[] = [];

    // Current price analysis
    if (currentPrice < avgPrice * 0.85) {
      action = 'buy';
      urgency = 'soon';
      confidence = 0.8;
      reasoning.push('現在価格が平均価格より15%以上安い');
    } else if (currentPrice > avgPrice * 1.15) {
      action = 'wait';
      urgency = 'avoid';
      confidence = 0.7;
      reasoning.push('現在価格が平均価格より15%以上高い');
    }

    // Trend analysis
    if (patterns.trendStrength > 0.1) {
      if (action !== 'buy') {
        reasoning.push('価格上昇トレンドのため早期購入を検討');
        urgency = 'soon';
      }
    } else if (patterns.trendStrength < -0.1) {
      if (action === 'buy') {
        reasoning.push('価格下落トレンドだが現在価格が魅力的');
      } else {
        action = 'wait';
        reasoning.push('価格下落トレンドのため待機を推奨');
      }
    }

    // Risk tolerance adjustment
    if (userPreferences?.riskTolerance === 'low' && patterns.volatilityProfile.high) {
      if (action === 'buy') {
        action = 'monitor';
        reasoning.push('高ボラティリティのため慎重な監視を推奨');
      }
    }

    // Generate alternative windows
    alternativeWindows.push({
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      expectedPrice: currentPrice * 0.95,
      probabilityOfSuccess: 0.6,
      description: '1-2週間後の価格下落を期待',
    });

    return {
      action,
      optimalDate: action === 'buy' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priceTarget: action === 'buy' ? currentPrice : currentPrice * 0.9,
      confidence,
      reasoning,
      alternativeWindows,
      urgency,
    };
  }

  private optimizeSellTiming(
    product: KeepaProduct,
    priceHistory: KeepaPriceHistory,
    patterns: any,
    userPreferences?: any
  ): TimingRecommendation {
    const currentPrice = priceHistory.amazonPrices[priceHistory.amazonPrices.length - 1]?.price || 0;
    const maxPrice = Math.max(...priceHistory.amazonPrices.map(p => p.price));

    let action: TimingRecommendation['action'] = 'monitor';
    let urgency: TimingRecommendation['urgency'] = 'flexible';
    let confidence = 0.5;
    const reasoning: string[] = [];

    // Check if near historical high
    if (currentPrice > maxPrice * 0.9) {
      action = 'sell';
      urgency = 'soon';
      confidence = 0.8;
      reasoning.push('現在価格が過去最高値の90%以上');
    }

    // Trend analysis for selling
    if (patterns.trendStrength < -0.1) {
      if (action !== 'sell') {
        action = 'sell';
        urgency = 'immediate';
      }
      reasoning.push('価格下落トレンドのため早期売却を推奨');
      confidence = Math.min(1.0, confidence + 0.2);
    }

    // Seasonal considerations
    const month = new Date().getMonth();
    if (month === 11) { // December
      if (this.isSeasonalProduct(product)) {
        action = 'sell';
        urgency = 'immediate';
        reasoning.push('年末商戦での販売最適期');
        confidence = Math.min(1.0, confidence + 0.3);
      }
    }

    return {
      action,
      optimalDate: action === 'sell' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priceTarget: action === 'sell' ? currentPrice * 1.05 : currentPrice,
      confidence,
      reasoning,
      alternativeWindows: [],
      urgency,
    };
  }

  private identifyWatchPeriods(priceHistory: KeepaPriceHistory, patterns: any): WatchPeriod[] {
    const watchPeriods: WatchPeriod[] = [];
    const now = new Date();

    // High volatility periods require more frequent monitoring
    if (patterns.volatilityProfile.high) {
      watchPeriods.push({
        startDate: now,
        endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        reason: '高い価格変動性',
        expectedEvent: '価格の大幅な変動',
        monitoringFrequency: 'daily',
      });
    }

    // Seasonal events
    const month = now.getMonth();
    if (month === 10) { // November
      watchPeriods.push({
        startDate: now,
        endDate: new Date(now.getFullYear(), 11, 25),
        reason: '年末商戦期間',
        expectedEvent: 'クリスマス商戦による価格・需要変動',
        monitoringFrequency: 'daily',
      });
    }

    return watchPeriods;
  }

  private identifyRiskWindows(
    product: KeepaProduct,
    priceHistory: KeepaPriceHistory,
    patterns: any
  ): RiskWindow[] {
    const riskWindows: RiskWindow[] = [];
    const now = new Date();

    // High volatility risk
    if (patterns.volatilityProfile.high) {
      riskWindows.push({
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        riskType: 'price_drop',
        severity: 'high',
        probability: 0.7,
        mitigation: '短期間での売買を避け、長期保有戦略を検討',
      });
    }

    // Competition risk during peak seasons
    const salesRank = product.stats?.current?.[3] || 999999;
    if (salesRank < 10000 && now.getMonth() === 11) {
      riskWindows.push({
        startDate: now,
        endDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        riskType: 'competition_surge',
        severity: 'medium',
        probability: 0.8,
        mitigation: '価格競争力の維持と差別化戦略が必要',
      });
    }

    return riskWindows;
  }

  // Helper methods
  private detectCycles(prices: number[]): any[] {
    // Simplified cycle detection
    // In a real implementation, this would use FFT or similar techniques
    return [];
  }

  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 10) return 0;

    const recentPrices = prices.slice(-10);
    let trendSum = 0;
    
    for (let i = 1; i < recentPrices.length; i++) {
      const change = (recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1];
      trendSum += change;
    }
    
    return trendSum / (recentPrices.length - 1);
  }

  private analyzeVolatilityProfile(prices: number[]): { low: boolean; medium: boolean; high: boolean } {
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const volatility = (Math.sqrt(variance) / mean) * 100;

    return {
      low: volatility < 10,
      medium: volatility >= 10 && volatility < 25,
      high: volatility >= 25,
    };
  }

  private detectSeasonalFactors(priceHistory: KeepaPriceHistory): any {
    // This would analyze price patterns by month/season
    // Simplified implementation
    return {};
  }

  private calculateOverallConfidence(
    buyTiming: TimingRecommendation,
    sellTiming: TimingRecommendation,
    patterns: any
  ): number {
    const avgConfidence = (buyTiming.confidence + sellTiming.confidence) / 2;
    
    // Adjust for data quality
    if (patterns.cyclicalPatterns.length > 0) {
      return Math.min(1.0, avgConfidence + 0.1);
    }
    
    return avgConfidence;
  }

  private isSeasonalProduct(product: KeepaProduct): boolean {
    const categoryName = product.categoryTree?.[0]?.name?.toLowerCase() || '';
    const seasonalCategories = ['toy', 'game', 'gift', 'decoration', 'おもちゃ', 'ゲーム'];
    
    return seasonalCategories.some(category => categoryName.includes(category));
  }
}