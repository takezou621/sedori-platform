import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KeepaApiService } from '../../external-apis/keepa-api.service';
import { KeepaProduct, KeepaPriceHistory, KeepaAlert } from '../../external-apis/interfaces/keepa-data.interface';

export interface PredictiveAlert {
  id: string;
  asin: string;
  userId: string;
  alertType: 'price_drop' | 'price_spike' | 'demand_surge' | 'opportunity' | 'risk_warning';
  currentValue: number;
  predictedValue: number;
  confidence: number; // 0-1
  timeframe: string; // e.g., "within 7 days"
  reasoning: string[];
  actionSuggestion: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  triggersAt?: Date;
  isActive: boolean;
  metadata: {
    modelVersion: string;
    dataQuality: 'high' | 'medium' | 'low';
    historicalAccuracy?: number;
  };
}

export interface AlertPrediction {
  asin: string;
  predictions: TimestampedPrediction[];
  recommendations: PredictiveRecommendation[];
  riskFactors: RiskFactor[];
  opportunityFactors: OpportunityFactor[];
}

export interface TimestampedPrediction {
  timestamp: Date;
  priceRange: { min: number; max: number; expected: number };
  demandLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  confidence: number;
  factors: string[];
}

export interface PredictiveRecommendation {
  action: 'buy_now' | 'wait' | 'sell_now' | 'set_alert' | 'avoid';
  reason: string;
  expectedOutcome: string;
  timeWindow: string;
  confidence: number;
}

export interface RiskFactor {
  type: 'price_volatility' | 'demand_drop' | 'competition_increase' | 'market_saturation';
  severity: 'low' | 'medium' | 'high';
  probability: number;
  impact: string;
  mitigationStrategy?: string;
}

export interface OpportunityFactor {
  type: 'price_drop_incoming' | 'demand_surge_expected' | 'competition_decrease' | 'seasonal_boost';
  potential: 'low' | 'medium' | 'high';
  probability: number;
  description: string;
  actionWindow: string;
}

@Injectable()
export class PredictionEngineAiService {
  private readonly logger = new Logger(PredictionEngineAiService.name);
  private readonly PREDICTION_CACHE_TTL = 3600; // 1 hour
  private readonly ALERT_PROCESSING_INTERVAL = 300; // 5 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly keepaApiService: KeepaApiService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createPredictiveAlert(alertConfig: {
    asin: string;
    userId: string;
    alertType: PredictiveAlert['alertType'];
    targetValue?: number;
    conditions?: string[];
  }): Promise<PredictiveAlert> {
    try {
      this.logger.log(`Creating predictive alert for ASIN: ${alertConfig.asin}`);

      // Generate predictions for the product
      const predictions = await this.generateAlertPredictions(alertConfig.asin);
      
      // Create alert based on predictions
      const alert = await this.buildPredictiveAlert(alertConfig, predictions);

      // Store alert in Redis
      const alertKey = `predictive-alert:${alert.id}`;
      await this.redis.setex(alertKey, 86400, JSON.stringify(alert)); // 24 hours

      // Add to user's alert list
      const userAlertsKey = `user-alerts:${alertConfig.userId}`;
      await this.redis.sadd(userAlertsKey, alert.id);

      this.logger.log(`Created predictive alert: ${alert.id}`);
      return alert;

    } catch (error) {
      this.logger.error(`Failed to create predictive alert for ${alertConfig.asin}:`, error);
      throw error;
    }
  }

  async generatePredictions(asin: string, options?: {
    timeHorizon?: number;
    targetPrice?: number;
    priceType?: number;
  }): Promise<{
    probabilityScore?: number;
    estimatedDays?: number;
    confidence: number;
    insights: string[];
  }> {
    // Convert to the expected format for compatibility
    const alertPrediction = await this.generateAlertPredictions(asin);
    return {
      probabilityScore: 0.7, // Default probability
      estimatedDays: options?.timeHorizon || 30,
      confidence: 0.7, // Default confidence
      insights: alertPrediction.riskFactors.map(rf => rf.impact || 'Risk factor identified'),
    };
  }

  async generateAlertPredictions(asin: string): Promise<AlertPrediction> {
    const cacheKey = `alert-predictions:${asin}`;
    
    try {
      // Check cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for predictions: ${asin}`);
        return JSON.parse(cached);
      }

      this.logger.log(`Generating alert predictions for: ${asin}`);

      // Get product and price history
      const [product, priceHistory] = await Promise.all([
        this.keepaApiService.getProduct(asin, true, 180), // 6 months history
        this.keepaApiService.getPriceHistory(asin, 180),
      ]);

      // Generate time-series predictions
      const predictions = this.generateTimestampedPredictions(priceHistory);

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(product, priceHistory, predictions);

      // Identify opportunity factors
      const opportunityFactors = this.identifyOpportunityFactors(product, priceHistory, predictions);

      // Generate actionable recommendations
      const recommendations = this.generatePredictiveRecommendations(
        product, predictions, riskFactors, opportunityFactors
      );

      const alertPrediction: AlertPrediction = {
        asin,
        predictions,
        recommendations,
        riskFactors,
        opportunityFactors,
      };

      // Cache the result
      await this.redis.setex(cacheKey, this.PREDICTION_CACHE_TTL, JSON.stringify(alertPrediction));

      this.logger.log(`Generated predictions for ${asin}: ${predictions.length} timestamped predictions`);
      return alertPrediction;

    } catch (error) {
      this.logger.error(`Failed to generate predictions for ${asin}:`, error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processActiveAlerts(): Promise<void> {
    try {
      this.logger.debug('Processing active predictive alerts');

      // Get all active alert IDs
      const alertIds = await this.getAllActiveAlertIds();
      
      for (const alertId of alertIds) {
        try {
          await this.processIndividualAlert(alertId);
        } catch (error) {
          this.logger.warn(`Failed to process alert ${alertId}:`, error);
        }
      }

      this.logger.debug(`Processed ${alertIds.length} active alerts`);

    } catch (error) {
      this.logger.error('Failed to process active alerts:', error);
    }
  }

  async getUserAlerts(userId: string): Promise<PredictiveAlert[]> {
    try {
      const userAlertsKey = `user-alerts:${userId}`;
      const alertIds = await this.redis.smembers(userAlertsKey);

      const alerts = await Promise.all(
        alertIds.map(async (alertId) => {
          const alertKey = `predictive-alert:${alertId}`;
          const alertData = await this.redis.get(alertKey);
          return alertData ? JSON.parse(alertData) : null;
        })
      );

      return alerts.filter(alert => alert !== null && alert.isActive);

    } catch (error) {
      this.logger.error(`Failed to get alerts for user ${userId}:`, error);
      return [];
    }
  }

  async deactivateAlert(alertId: string): Promise<void> {
    try {
      const alertKey = `predictive-alert:${alertId}`;
      const alertData = await this.redis.get(alertKey);
      
      if (alertData) {
        const alert = JSON.parse(alertData);
        alert.isActive = false;
        await this.redis.setex(alertKey, 86400, JSON.stringify(alert));
        
        this.logger.log(`Deactivated alert: ${alertId}`);
      }

    } catch (error) {
      this.logger.error(`Failed to deactivate alert ${alertId}:`, error);
    }
  }

  // Private methods
  private async buildPredictiveAlert(
    config: any,
    predictions: AlertPrediction,
  ): Promise<PredictiveAlert> {
    const alertId = this.generateAlertId();
    const now = new Date();

    // Determine when alert should trigger based on predictions
    const triggerCondition = this.determineTriggerCondition(config, predictions);
    
    const alert: PredictiveAlert = {
      id: alertId,
      asin: config.asin,
      userId: config.userId,
      alertType: config.alertType,
      currentValue: triggerCondition.currentValue,
      predictedValue: triggerCondition.predictedValue,
      confidence: triggerCondition.confidence,
      timeframe: triggerCondition.timeframe,
      reasoning: triggerCondition.reasoning,
      actionSuggestion: triggerCondition.actionSuggestion,
      priority: triggerCondition.priority,
      createdAt: now,
      triggersAt: triggerCondition.triggersAt,
      isActive: true,
      metadata: {
        modelVersion: '1.0',
        dataQuality: this.assessPredictionDataQuality(predictions),
      },
    };

    return alert;
  }

  private generateTimestampedPredictions(priceHistory: KeepaPriceHistory): TimestampedPrediction[] {
    const predictions: TimestampedPrediction[] = [];
    const now = new Date();

    if (!priceHistory.amazonPrices || priceHistory.amazonPrices.length < 10) {
      return predictions; // Not enough data for meaningful predictions
    }

    // Generate predictions for next 30 days (weekly intervals)
    for (let days = 7; days <= 30; days += 7) {
      const predictionDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const prediction = this.generateSinglePrediction(priceHistory, days);
      
      predictions.push({
        timestamp: predictionDate,
        priceRange: prediction.priceRange,
        demandLevel: prediction.demandLevel,
        confidence: prediction.confidence,
        factors: prediction.factors,
      });
    }

    return predictions;
  }

  private generateSinglePrediction(
    priceHistory: KeepaPriceHistory, 
    daysAhead: number
  ): TimestampedPrediction {
    const prices = priceHistory.amazonPrices.map(p => p.price);
    const recentPrices = prices.slice(-30); // Last 30 data points
    
    if (recentPrices.length === 0) {
      return {
        timestamp: new Date(),
        priceRange: { min: 0, max: 0, expected: 0 },
        demandLevel: 'medium',
        confidence: 0.1,
        factors: ['データ不足'],
      };
    }

    // Simple trend-based prediction
    const currentPrice = recentPrices[recentPrices.length - 1];
    const avgPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    
    // Calculate trend
    const trend = this.calculatePriceTrend(recentPrices);
    const volatility = this.calculateVolatility(recentPrices);
    
    // Predict future price based on trend
    const trendMultiplier = trend * (daysAhead / 30); // Scale by time
    const expectedPrice = currentPrice * (1 + trendMultiplier * 0.1);
    
    // Calculate confidence interval
    const confidence = Math.max(0.3, 1 - (volatility / 100));
    const priceVariation = expectedPrice * (volatility / 100) * Math.sqrt(daysAhead / 7);
    
    return {
      timestamp: new Date(),
      priceRange: {
        min: Math.max(0, expectedPrice - priceVariation),
        max: expectedPrice + priceVariation,
        expected: expectedPrice,
      },
      demandLevel: this.estimateDemandLevel(priceHistory),
      confidence,
      factors: this.identifyPredictionFactors(trend, volatility, daysAhead),
    };
  }

  private calculatePriceTrend(prices: number[]): number {
    if (prices.length < 2) return 0;

    let trendSum = 0;
    for (let i = 1; i < prices.length; i++) {
      const change = (prices[i] - prices[i-1]) / prices[i-1];
      trendSum += change;
    }
    
    return trendSum / (prices.length - 1);
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    
    return (Math.sqrt(variance) / mean) * 100;
  }

  private estimateDemandLevel(priceHistory: KeepaPriceHistory): TimestampedPrediction['demandLevel'] {
    // This would use sales rank history if available
    // For now, return a placeholder
    return 'medium';
  }

  private identifyPredictionFactors(trend: number, volatility: number, daysAhead: number): string[] {
    const factors: string[] = [];

    if (trend > 0.02) factors.push('価格上昇トレンド');
    else if (trend < -0.02) factors.push('価格下落トレンド');
    else factors.push('価格安定トレンド');

    if (volatility > 20) factors.push('高い価格変動性');
    else if (volatility < 5) factors.push('低い価格変動性');

    if (daysAhead > 21) factors.push('長期予測の不確実性');

    return factors;
  }

  private identifyRiskFactors(
    product: KeepaProduct,
    priceHistory: KeepaPriceHistory,
    predictions: TimestampedPrediction[]
  ): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    // Price volatility risk
    const prices = priceHistory.amazonPrices.map(p => p.price);
    const volatility = this.calculateVolatility(prices);
    
    if (volatility > 25) {
      riskFactors.push({
        type: 'price_volatility',
        severity: 'high',
        probability: 0.8,
        impact: '価格変動により利益計算が困難になる可能性',
        mitigationStrategy: 'より短い期間での価格監視を推奨',
      });
    }

    // Demand risk based on sales rank
    const salesRank = product.stats?.current?.[3] || 999999;
    if (salesRank > 100000) {
      riskFactors.push({
        type: 'demand_drop',
        severity: 'medium',
        probability: 0.6,
        impact: '需要が低く売れ残りリスクが高い',
        mitigationStrategy: '価格を下げるか、より需要の高い商品を検討',
      });
    }

    // Competition increase risk
    const estimatedCompetitors = this.estimateCompetitorCount(product);
    if (estimatedCompetitors > 15) {
      riskFactors.push({
        type: 'competition_increase',
        severity: 'medium',
        probability: 0.7,
        impact: '競合が多く価格競争が激化する可能性',
        mitigationStrategy: '差別化戦略や競合分析の実施',
      });
    }

    return riskFactors;
  }

  private identifyOpportunityFactors(
    product: KeepaProduct,
    priceHistory: KeepaPriceHistory,
    predictions: TimestampedPrediction[]
  ): OpportunityFactor[] {
    const opportunities: OpportunityFactor[] = [];

    // Price drop opportunity
    const recentPrices = priceHistory.amazonPrices.slice(-7).map(p => p.price);
    const currentPrice = recentPrices[recentPrices.length - 1];
    const avgRecentPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    
    if (currentPrice < avgRecentPrice * 0.9) {
      opportunities.push({
        type: 'price_drop_incoming',
        potential: 'high',
        probability: 0.8,
        description: '現在価格が平均より10%以上低く、仕入れのチャンス',
        actionWindow: '1-2週間以内',
      });
    }

    // Seasonal opportunity
    const seasonalBoost = this.calculateSeasonalOpportunity(product);
    if (seasonalBoost > 0) {
      opportunities.push({
        type: 'seasonal_boost',
        potential: seasonalBoost > 20 ? 'high' : 'medium',
        probability: 0.7,
        description: '季節的需要増加により販売機会が拡大',
        actionWindow: '1-2ヶ月以内',
      });
    }

    return opportunities;
  }

  private generatePredictiveRecommendations(
    product: KeepaProduct,
    predictions: TimestampedPrediction[],
    riskFactors: RiskFactor[],
    opportunityFactors: OpportunityFactor[]
  ): PredictiveRecommendation[] {
    const recommendations: PredictiveRecommendation[] = [];

    // High opportunity + low risk = buy now
    const highOpportunities = opportunityFactors.filter(o => o.potential === 'high');
    const highRisks = riskFactors.filter(r => r.severity === 'high');

    if (highOpportunities.length > 0 && highRisks.length === 0) {
      recommendations.push({
        action: 'buy_now',
        reason: '高い収益機会が検出され、リスクが低い状態',
        expectedOutcome: '15-25%の利益率が期待される',
        timeWindow: '1-2週間以内',
        confidence: 0.8,
      });
    } else if (highRisks.length > 0) {
      recommendations.push({
        action: 'wait',
        reason: 'リスク要因が高く、市場状況の改善を待つ',
        expectedOutcome: 'リスクが軽減されるまで待機',
        timeWindow: '1ヶ月後に再評価',
        confidence: 0.7,
      });
    }

    // Price trend recommendations
    const futurePriceTrend = this.analyzeFuturePriceTrend(predictions);
    if (futurePriceTrend === 'rising') {
      recommendations.push({
        action: 'buy_now',
        reason: '価格上昇が予測されており、早期購入が有利',
        expectedOutcome: '価格上昇による利益増加',
        timeWindow: '1週間以内',
        confidence: 0.75,
      });
    }

    return recommendations;
  }

  private determineTriggerCondition(config: any, predictions: AlertPrediction): any {
    const currentPrice = predictions.predictions.length > 0 ? 
      predictions.predictions[0].priceRange.expected : 0;
    
    let predictedValue = currentPrice;
    let confidence = 0.5;
    let timeframe = '1週間以内';
    let reasoning = ['AI予測に基づく分析'];
    let priority: PredictiveAlert['priority'] = 'medium';
    let actionSuggestion = '市場状況を継続監視';
    
    // Customize based on alert type
    switch (config.alertType) {
      case 'price_drop':
        const dropPrediction = predictions.predictions.find(p => 
          p.priceRange.expected < currentPrice * 0.9
        );
        if (dropPrediction) {
          predictedValue = dropPrediction.priceRange.expected;
          confidence = dropPrediction.confidence;
          timeframe = '1-2週間以内';
          reasoning = ['価格下落が予測されています', ...dropPrediction.factors];
          priority = 'high';
          actionSuggestion = '価格下落前の仕入れを検討';
        }
        break;

      case 'opportunity':
        const highOpportunity = predictions.opportunityFactors.find(o => o.potential === 'high');
        if (highOpportunity) {
          confidence = highOpportunity.probability;
          timeframe = highOpportunity.actionWindow;
          reasoning = [highOpportunity.description];
          priority = 'high';
          actionSuggestion = '収益機会を活用するため早期行動を推奨';
        }
        break;
    }

    return {
      currentValue: currentPrice,
      predictedValue,
      confidence,
      timeframe,
      reasoning,
      actionSuggestion,
      priority,
      triggersAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24 hours
    };
  }

  // Helper methods
  private async getAllActiveAlertIds(): Promise<string[]> {
    const pattern = 'predictive-alert:*';
    const keys = await this.redis.keys(pattern);
    
    const activeAlertIds = [];
    for (const key of keys) {
      const alertData = await this.redis.get(key);
      if (alertData) {
        const alert = JSON.parse(alertData);
        if (alert.isActive) {
          activeAlertIds.push(alert.id);
        }
      }
    }
    
    return activeAlertIds;
  }

  private async processIndividualAlert(alertId: string): Promise<void> {
    const alertKey = `predictive-alert:${alertId}`;
    const alertData = await this.redis.get(alertKey);
    
    if (!alertData) return;

    const alert: PredictiveAlert = JSON.parse(alertData);
    
    // Check if alert conditions are met
    const shouldTrigger = await this.evaluateAlertConditions(alert);
    
    if (shouldTrigger) {
      await this.triggerAlert(alert);
    }
  }

  private async evaluateAlertConditions(alert: PredictiveAlert): Promise<boolean> {
    // This would check current market conditions against alert criteria
    // For now, return a simple time-based trigger
    return alert.triggersAt ? new Date() >= alert.triggersAt : false;
  }

  private async triggerAlert(alert: PredictiveAlert): Promise<void> {
    this.logger.log(`Triggering alert: ${alert.id} for ASIN: ${alert.asin}`);
    
    // Here you would send notifications (email, push, etc.)
    // For now, just log and update alert status
    
    alert.isActive = false; // Mark as triggered
    const alertKey = `predictive-alert:${alert.id}`;
    await this.redis.setex(alertKey, 86400, JSON.stringify(alert));
  }

  private generateAlertId(): string {
    return `pred-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private assessPredictionDataQuality(predictions: AlertPrediction): 'high' | 'medium' | 'low' {
    if (predictions.predictions.length >= 4 && 
        predictions.predictions.every(p => p.confidence > 0.7)) {
      return 'high';
    } else if (predictions.predictions.length >= 2 && 
               predictions.predictions.some(p => p.confidence > 0.5)) {
      return 'medium';
    }
    return 'low';
  }

  private estimateCompetitorCount(product: KeepaProduct): number {
    // Simplified competitor estimation
    let competitors = 1;
    if (product.stats?.current?.[11]) competitors += product.stats.current[11]; // New offers
    if (product.stats?.current?.[12]) competitors += product.stats.current[12]; // Used offers
    return Math.min(50, competitors);
  }

  private calculateSeasonalOpportunity(product: KeepaProduct): number {
    const month = new Date().getMonth();
    const categoryName = product.categoryTree?.[0]?.name?.toLowerCase() || '';
    
    // Christmas season boost
    if (month === 11 && (categoryName.includes('toy') || categoryName.includes('game'))) {
      return 30;
    }
    
    // Back to school boost
    if ((month === 2 || month === 8) && (categoryName.includes('book') || categoryName.includes('supplies'))) {
      return 20;
    }
    
    return 0;
  }

  private analyzeFuturePriceTrend(predictions: TimestampedPrediction[]): 'rising' | 'falling' | 'stable' {
    if (predictions.length < 2) return 'stable';
    
    const firstPrice = predictions[0].priceRange.expected;
    const lastPrice = predictions[predictions.length - 1].priceRange.expected;
    
    const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    if (changePercent > 5) return 'rising';
    if (changePercent < -5) return 'falling';
    return 'stable';
  }
}