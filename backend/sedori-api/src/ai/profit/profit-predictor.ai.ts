import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { KeepaProduct, KeepaPriceHistory, KeepaPriceAnalysis } from '../../external-apis/interfaces/keepa-data.interface';

export interface ProfitPrediction {
  asin: string;
  scenarios: ProfitScenario[];
  optimalStrategy: OptimalStrategy;
  riskAssessment: RiskAssessment;
  marketFactors: MarketFactor[];
  recommendations: ProfitRecommendation[];
  metadata: {
    confidence: number;
    analysisDate: Date;
    modelVersion: string;
    dataQuality: 'high' | 'medium' | 'low';
  };
}

export interface ProfitScenario {
  name: 'conservative' | 'realistic' | 'optimistic';
  timeframe: number; // days
  buyPrice: number;
  sellPrice: number;
  volume: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  roi: number; // Return on Investment
  probability: number;
  assumptions: string[];
  risks: string[];
}

export interface OptimalStrategy {
  recommendedAction: 'buy' | 'sell' | 'hold' | 'avoid';
  optimalBuyPrice: number;
  optimalSellPrice: number;
  optimalTiming: {
    buyWindow: { start: Date; end: Date };
    sellWindow: { start: Date; end: Date };
  };
  expectedProfit: number;
  expectedROI: number;
  confidence: number;
  reasoning: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    probability: number;
    mitigation: string;
  }>;
  maxPotentialLoss: number;
  breakEvenPrice: number;
  worstCaseScenario: {
    probability: number;
    loss: number;
    description: string;
  };
}

export interface MarketFactor {
  factor: 'demand' | 'competition' | 'seasonality' | 'trend' | 'external';
  impact: number; // -100 to +100
  description: string;
  reliability: number; // 0-1
}

export interface ProfitRecommendation {
  type: 'entry' | 'exit' | 'risk_management' | 'optimization';
  action: string;
  reasoning: string;
  expectedImpact: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
}

@Injectable()
export class ProfitPredictorAiService {
  private readonly logger = new Logger(ProfitPredictorAiService.name);
  private readonly PROFIT_CACHE_TTL = 3600; // 1 hour

  // Cost factors for Japan Amazon FBA
  private readonly costFactors = {
    amazonFeeRate: 0.15, // 15% referral fee (varies by category)
    fbaFees: {
      small: 280, // JPY
      standard: 350,
      large: 500,
    },
    shippingCosts: {
      domestic: 500, // Average domestic shipping
      international: 1500,
    },
    taxRate: 0.1, // 10% consumption tax
    currencyFluctuation: 0.03, // 3% buffer for currency risk
  };

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async predictProfit(
    asin: string,
    product: KeepaProduct,
    priceHistory: KeepaPriceHistory,
    priceAnalysis: KeepaPriceAnalysis,
    userInputs?: {
      intendedBuyPrice?: number;
      intendedVolume?: number;
      holdingPeriod?: number; // days
      riskTolerance?: 'low' | 'medium' | 'high';
    }
  ): Promise<ProfitPrediction> {
    const cacheKey = `profit-prediction:${asin}:${JSON.stringify(userInputs || {})}`;

    try {
      // Check cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for profit prediction: ${asin}`);
        return JSON.parse(cached);
      }

      this.logger.log(`Generating profit prediction for ASIN: ${asin}`);

      // Generate multiple profit scenarios
      const scenarios = this.generateProfitScenarios(product, priceHistory, priceAnalysis, userInputs);

      // Calculate optimal strategy
      const optimalStrategy = this.calculateOptimalStrategy(product, scenarios, priceAnalysis);

      // Assess risks
      const riskAssessment = this.assessProfitRisks(product, priceHistory, scenarios);

      // Identify market factors
      const marketFactors = this.identifyMarketFactors(product, priceHistory, priceAnalysis);

      // Generate recommendations
      const recommendations = this.generateProfitRecommendations(
        product, scenarios, optimalStrategy, riskAssessment
      );

      const prediction: ProfitPrediction = {
        asin,
        scenarios,
        optimalStrategy,
        riskAssessment,
        marketFactors,
        recommendations,
        metadata: {
          confidence: this.calculateOverallConfidence(scenarios, riskAssessment),
          analysisDate: new Date(),
          modelVersion: '1.0',
          dataQuality: this.assessDataQuality(product, priceHistory),
        },
      };

      // Cache the result
      await this.redis.setex(cacheKey, this.PROFIT_CACHE_TTL, JSON.stringify(prediction));

      this.logger.log(`Profit prediction completed for ${asin}`);
      return prediction;

    } catch (error) {
      this.logger.error(`Profit prediction failed for ${asin}:`, error);
      throw error;
    }
  }

  async compareProducts(
    products: Array<{
      asin: string;
      product: KeepaProduct;
      priceHistory: KeepaPriceHistory;
      priceAnalysis: KeepaPriceAnalysis;
    }>,
    budget: number,
    userPreferences?: any
  ): Promise<{
    rankings: ProductRanking[];
    portfolioSuggestion: PortfolioSuggestion;
    totalExpectedProfit: number;
    totalExpectedROI: number;
  }> {
    try {
      this.logger.log(`Comparing ${products.length} products for profit optimization`);

      // Generate predictions for all products
      const predictions = await Promise.all(
        products.map(async ({ asin, product, priceHistory, priceAnalysis }) => {
          const prediction = await this.predictProfit(asin, product, priceHistory, priceAnalysis);
          return { asin, prediction };
        })
      );

      // Rank products by expected profitability
      const rankings = this.rankProductsByProfitability(predictions, userPreferences);

      // Generate portfolio suggestion within budget
      const portfolioSuggestion = this.generatePortfolioSuggestion(rankings, budget);

      return {
        rankings,
        portfolioSuggestion,
        totalExpectedProfit: portfolioSuggestion.totalExpectedProfit,
        totalExpectedROI: portfolioSuggestion.totalExpectedROI,
      };

    } catch (error) {
      this.logger.error('Product comparison failed:', error);
      throw error;
    }
  }

  async calculateBreakEvenAnalysis(
    asin: string,
    product: KeepaProduct,
    buyPrice: number
  ): Promise<{
    breakEvenPrice: number;
    minimumSellPrice: number;
    profitAtCurrentPrice: number;
    marginOfSafety: number;
    analysis: string[];
  }> {
    try {
      const currentPrice = (product.stats?.current?.[0] || 0) / 100;
      const costs = this.calculateTotalCosts(buyPrice, product);
      const breakEvenPrice = buyPrice + costs.totalCosts;
      const minimumSellPrice = breakEvenPrice * 1.1; // 10% minimum profit
      
      const profitAtCurrentPrice = currentPrice - breakEvenPrice;
      const marginOfSafety = ((currentPrice - breakEvenPrice) / currentPrice) * 100;

      const analysis = [
        `仕入価格: ¥${buyPrice.toLocaleString()}`,
        `総コスト: ¥${costs.totalCosts.toLocaleString()}`,
        `損益分岐点: ¥${breakEvenPrice.toLocaleString()}`,
        `現在価格での利益: ¥${profitAtCurrentPrice.toLocaleString()}`,
        `安全余裕率: ${marginOfSafety.toFixed(1)}%`,
      ];

      return {
        breakEvenPrice,
        minimumSellPrice,
        profitAtCurrentPrice,
        marginOfSafety,
        analysis,
      };

    } catch (error) {
      this.logger.error(`Break-even analysis failed for ${asin}:`, error);
      throw error;
    }
  }

  // Private methods
  private generateProfitScenarios(
    product: KeepaProduct,
    priceHistory: KeepaPriceHistory,
    priceAnalysis: KeepaPriceAnalysis,
    userInputs?: any
  ): ProfitScenario[] {
    const currentPrice = (product.stats?.current?.[0] || 0) / 100;
    const avgPrice = priceHistory.amazonPrices.reduce((sum, p) => sum + p.price, 0) / 
                     priceHistory.amazonPrices.length / 100;

    const baseVolume = userInputs?.intendedVolume || 10;
    const baseBuyPrice = userInputs?.intendedBuyPrice || avgPrice * 0.8;

    const scenarios: ProfitScenario[] = [];

    // Conservative scenario
    const conservativeSellPrice = currentPrice * 0.95;
    const conservativeScenario = this.buildScenario(
      'conservative',
      30, // 30 days
      baseBuyPrice,
      conservativeSellPrice,
      baseVolume,
      product,
      0.7, // 70% probability
      ['価格が5%下落', '需要が安定', '競合が増加しない']
    );
    scenarios.push(conservativeScenario);

    // Realistic scenario
    const realisticSellPrice = currentPrice;
    const realisticScenario = this.buildScenario(
      'realistic',
      21, // 3 weeks
      baseBuyPrice,
      realisticSellPrice,
      baseVolume,
      product,
      0.6, // 60% probability
      ['現在価格で販売', '通常の需要変動', '予期される競合状況']
    );
    scenarios.push(realisticScenario);

    // Optimistic scenario
    const optimisticSellPrice = Math.max(avgPrice, currentPrice * 1.1);
    const optimisticScenario = this.buildScenario(
      'optimistic',
      14, // 2 weeks
      baseBuyPrice,
      optimisticSellPrice,
      baseVolume,
      product,
      0.3, // 30% probability
      ['価格上昇または需要増加', '季節要因が有利', '競合が減少']
    );
    scenarios.push(optimisticScenario);

    return scenarios;
  }

  private buildScenario(
    name: ProfitScenario['name'],
    timeframe: number,
    buyPrice: number,
    sellPrice: number,
    volume: number,
    product: KeepaProduct,
    probability: number,
    assumptions: string[]
  ): ProfitScenario {
    const costs = this.calculateTotalCosts(buyPrice, product);
    const grossProfit = (sellPrice - buyPrice) * volume;
    const netProfit = (sellPrice - buyPrice - costs.totalCosts) * volume;
    const profitMargin = netProfit / (sellPrice * volume);
    const roi = netProfit / (buyPrice * volume);

    const risks = this.identifyScenarioRisks(name, sellPrice, buyPrice, product);

    return {
      name,
      timeframe,
      buyPrice,
      sellPrice,
      volume,
      grossProfit,
      netProfit,
      profitMargin,
      roi,
      probability,
      assumptions,
      risks,
    };
  }

  private calculateTotalCosts(buyPrice: number, product: KeepaProduct): {
    amazonFees: number;
    fbaFees: number;
    shippingCosts: number;
    taxes: number;
    otherCosts: number;
    totalCosts: number;
  } {
    const sellPrice = buyPrice * 1.3; // Assume 30% markup for cost calculation
    
    // Amazon referral fees
    const category = product.categoryTree?.[0]?.name?.toLowerCase() || '';
    const feeRate = this.getCategoryFeeRate(category);
    const amazonFees = sellPrice * feeRate;

    // FBA fees based on product size
    const fbaFees = this.estimateFbaFees(product);

    // Shipping costs
    const shippingCosts = this.costFactors.shippingCosts.domestic;

    // Taxes
    const taxes = sellPrice * this.costFactors.taxRate;

    // Other costs (storage, returns, etc.)
    const otherCosts = sellPrice * 0.02; // 2% for miscellaneous

    const totalCosts = amazonFees + fbaFees + shippingCosts + taxes + otherCosts;

    return {
      amazonFees,
      fbaFees,
      shippingCosts,
      taxes,
      otherCosts,
      totalCosts,
    };
  }

  private calculateOptimalStrategy(
    product: KeepaProduct,
    scenarios: ProfitScenario[],
    priceAnalysis: KeepaPriceAnalysis
  ): OptimalStrategy {
    // Find the scenario with the best risk-adjusted return
    const bestScenario = scenarios.reduce((best, current) => {
      const riskAdjustedReturn = current.roi * current.probability;
      const bestRiskAdjustedReturn = best.roi * best.probability;
      return riskAdjustedReturn > bestRiskAdjustedReturn ? current : best;
    });

    const now = new Date();
    const buyWindow = {
      start: now,
      end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week
    };

    const sellWindow = {
      start: new Date(now.getTime() + bestScenario.timeframe * 24 * 60 * 60 * 1000),
      end: new Date(now.getTime() + (bestScenario.timeframe + 14) * 24 * 60 * 60 * 1000),
    };

    let recommendedAction: OptimalStrategy['recommendedAction'] = 'hold';
    const reasoning: string[] = [];

    // Determine recommended action
    if (bestScenario.netProfit > 0 && bestScenario.probability > 0.5) {
      recommendedAction = 'buy';
      reasoning.push(`${bestScenario.name}シナリオで利益が期待される`);
      reasoning.push(`期待ROI: ${(bestScenario.roi * 100).toFixed(1)}%`);
    } else if (bestScenario.netProfit < 0) {
      recommendedAction = 'avoid';
      reasoning.push('すべてのシナリオで損失が予測される');
    } else if (priceAnalysis.analysis.trend === 'falling') {
      recommendedAction = 'sell';
      reasoning.push('価格下落トレンドのため売却を推奨');
    }

    return {
      recommendedAction,
      optimalBuyPrice: bestScenario.buyPrice,
      optimalSellPrice: bestScenario.sellPrice,
      optimalTiming: { buyWindow, sellWindow },
      expectedProfit: bestScenario.netProfit,
      expectedROI: bestScenario.roi,
      confidence: bestScenario.probability,
      reasoning,
    };
  }

  private assessProfitRisks(
    product: KeepaProduct,
    priceHistory: KeepaPriceHistory,
    scenarios: ProfitScenario[]
  ): RiskAssessment {
    const riskFactors = [];

    // Price volatility risk
    const prices = priceHistory.amazonPrices.map(p => p.price);
    const volatility = this.calculateVolatility(prices);
    if (volatility > 20) {
      riskFactors.push({
        factor: '価格変動リスク',
        impact: 'high' as const,
        probability: 0.7,
        mitigation: '短期売買または損切り設定',
      });
    }

    // Competition risk
    const salesRank = product.stats?.current?.[3] || 999999;
    if (salesRank < 10000) {
      riskFactors.push({
        factor: '競合参入リスク',
        impact: 'medium' as const,
        probability: 0.8,
        mitigation: '価格競争力の維持',
      });
    }

    // Market saturation risk
    const reviewCount = product.stats?.reviewCount || 0;
    if (reviewCount > 10000 && salesRank > 50000) {
      riskFactors.push({
        factor: '市場飽和リスク',
        impact: 'medium' as const,
        probability: 0.6,
        mitigation: 'ニッチ市場への転換',
      });
    }

    // Calculate overall risk
    const highRiskCount = riskFactors.filter(r => r.impact === 'high').length;
    const mediumRiskCount = riskFactors.filter(r => r.impact === 'medium').length;
    
    let overallRisk: RiskAssessment['overallRisk'];
    if (highRiskCount > 0) {
      overallRisk = 'high';
    } else if (mediumRiskCount > 1) {
      overallRisk = 'medium';
    } else {
      overallRisk = 'low';
    }

    // Find worst case scenario
    const worstCase = scenarios.reduce((worst, current) => 
      current.netProfit < worst.netProfit ? current : worst
    );

    return {
      overallRisk,
      riskFactors,
      maxPotentialLoss: Math.abs(Math.min(0, worstCase.netProfit)),
      breakEvenPrice: scenarios[0].buyPrice + this.calculateTotalCosts(scenarios[0].buyPrice, product).totalCosts,
      worstCaseScenario: {
        probability: worstCase.probability,
        loss: Math.abs(worstCase.netProfit),
        description: `${worstCase.name}シナリオで最大損失`,
      },
    };
  }

  private identifyMarketFactors(
    product: KeepaProduct,
    priceHistory: KeepaPriceHistory,
    priceAnalysis: KeepaPriceAnalysis
  ): MarketFactor[] {
    const factors: MarketFactor[] = [];

    // Demand factor
    const salesRank = product.stats?.current?.[3] || 999999;
    let demandImpact = 0;
    if (salesRank < 1000) demandImpact = 30;
    else if (salesRank < 10000) demandImpact = 15;
    else if (salesRank > 100000) demandImpact = -20;

    factors.push({
      factor: 'demand',
      impact: demandImpact,
      description: `売上ランク${salesRank.toLocaleString()}位による需要評価`,
      reliability: 0.8,
    });

    // Competition factor
    const estimatedCompetitors = this.estimateCompetitorCount(product);
    let competitionImpact = 0;
    if (estimatedCompetitors < 3) competitionImpact = 20;
    else if (estimatedCompetitors > 15) competitionImpact = -25;
    else competitionImpact = -5 * (estimatedCompetitors - 3);

    factors.push({
      factor: 'competition',
      impact: competitionImpact,
      description: `推定${estimatedCompetitors}社の競合による影響`,
      reliability: 0.6,
    });

    // Trend factor
    const trendImpact = this.getTrendImpact(priceAnalysis.analysis.trend);
    factors.push({
      factor: 'trend',
      impact: trendImpact,
      description: `価格トレンド「${priceAnalysis.analysis.trend}」による影響`,
      reliability: 0.7,
    });

    // Seasonality factor
    const seasonalImpact = this.getSeasonalImpact(product);
    if (seasonalImpact !== 0) {
      factors.push({
        factor: 'seasonality',
        impact: seasonalImpact,
        description: '季節要因による需要変動',
        reliability: 0.8,
      });
    }

    return factors;
  }

  private generateProfitRecommendations(
    product: KeepaProduct,
    scenarios: ProfitScenario[],
    optimalStrategy: OptimalStrategy,
    riskAssessment: RiskAssessment
  ): ProfitRecommendation[] {
    const recommendations: ProfitRecommendation[] = [];

    // Entry recommendations
    if (optimalStrategy.recommendedAction === 'buy') {
      recommendations.push({
        type: 'entry',
        action: `¥${optimalStrategy.optimalBuyPrice.toLocaleString()}以下での購入`,
        reasoning: '最適な購入価格帯での仕入れにより高いROIが期待される',
        expectedImpact: `期待利益: ¥${optimalStrategy.expectedProfit.toLocaleString()}`,
        urgency: 'medium',
        confidence: optimalStrategy.confidence,
      });
    }

    // Exit recommendations
    const bestScenario = scenarios.find(s => s.name === 'realistic') || scenarios[0];
    recommendations.push({
      type: 'exit',
      action: `¥${bestScenario.sellPrice.toLocaleString()}での販売目標設定`,
      reasoning: 'リスクを考慮した適正売却価格での利益確定',
      expectedImpact: `利益率: ${(bestScenario.profitMargin * 100).toFixed(1)}%`,
      urgency: 'low',
      confidence: 0.7,
    });

    // Risk management recommendations
    if (riskAssessment.overallRisk === 'high') {
      recommendations.push({
        type: 'risk_management',
        action: '損切りラインの設定',
        reasoning: 'リスクが高いため損失限定策が必要',
        expectedImpact: `最大損失を¥${riskAssessment.maxPotentialLoss.toLocaleString()}に限定`,
        urgency: 'high',
        confidence: 0.9,
      });
    }

    // Optimization recommendations
    if (scenarios.some(s => s.roi > 0.2)) {
      recommendations.push({
        type: 'optimization',
        action: '仕入れ量の増加検討',
        reasoning: 'ROI20%超のため規模拡大による利益最大化が可能',
        expectedImpact: '総利益の大幅増加',
        urgency: 'medium',
        confidence: 0.6,
      });
    }

    return recommendations;
  }

  // Helper methods
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return (Math.sqrt(variance) / mean) * 100;
  }

  private getCategoryFeeRate(category: string): number {
    // Simplified category fee mapping
    if (category.includes('electronics')) return 0.08; // 8%
    if (category.includes('books')) return 0.15; // 15%
    if (category.includes('clothing')) return 0.17; // 17%
    return this.costFactors.amazonFeeRate; // Default 15%
  }

  private estimateFbaFees(product: KeepaProduct): number {
    // Simplified size estimation based on category and title
    const title = product.title?.toLowerCase() || '';
    if (title.includes('small') || title.includes('compact')) {
      return this.costFactors.fbaFees.small;
    } else if (title.includes('large') || title.includes('big')) {
      return this.costFactors.fbaFees.large;
    }
    return this.costFactors.fbaFees.standard;
  }

  private estimateCompetitorCount(product: KeepaProduct): number {
    let competitors = 1;
    if (product.stats?.current?.[11]) competitors += product.stats.current[11]; // New offers
    if (product.stats?.current?.[12]) competitors += product.stats.current[12]; // Used offers
    return Math.min(50, competitors);
  }

  private identifyScenarioRisks(
    scenario: ProfitScenario['name'],
    sellPrice: number,
    buyPrice: number,
    product: KeepaProduct
  ): string[] {
    const risks: string[] = [];
    const margin = (sellPrice - buyPrice) / buyPrice;

    if (scenario === 'optimistic') {
      risks.push('楽観的な価格上昇が実現しないリスク');
      risks.push('需要が期待ほど増加しないリスク');
    } else if (scenario === 'conservative') {
      risks.push('さらなる価格下落リスク');
      risks.push('競合増加による価格圧迫リスク');
    }

    if (margin < 0.2) {
      risks.push('利益率が低く、コスト増加に脆弱');
    }

    return risks;
  }

  private getTrendImpact(trend: string): number {
    switch (trend) {
      case 'rising': return 25;
      case 'stable': return 5;
      case 'falling': return -30;
      case 'volatile': return -15;
      default: return 0;
    }
  }

  private getSeasonalImpact(product: KeepaProduct): number {
    const month = new Date().getMonth();
    const category = product.categoryTree?.[0]?.name?.toLowerCase() || '';
    
    if (month === 11) { // December
      if (category.includes('toy') || category.includes('game')) return 30;
      if (category.includes('electronics')) return 15;
    }
    
    return 0;
  }

  private calculateOverallConfidence(scenarios: ProfitScenario[], riskAssessment: RiskAssessment): number {
    const avgProbability = scenarios.reduce((sum, s) => sum + s.probability, 0) / scenarios.length;
    
    // Adjust for risk level
    let riskAdjustment = 0;
    switch (riskAssessment.overallRisk) {
      case 'low': riskAdjustment = 0.1; break;
      case 'high': riskAdjustment = -0.2; break;
    }
    
    return Math.max(0.1, Math.min(1.0, avgProbability + riskAdjustment));
  }

  private assessDataQuality(product: KeepaProduct, priceHistory: KeepaPriceHistory): 'high' | 'medium' | 'low' {
    const hasStats = product.stats && Object.keys(product.stats).length > 0;
    const hasPriceHistory = priceHistory.amazonPrices && priceHistory.amazonPrices.length > 30;
    const hasReviews = (product.stats?.reviewCount || 0) > 0;
    
    if (hasStats && hasPriceHistory && hasReviews) return 'high';
    if (hasStats && hasPriceHistory) return 'medium';
    return 'low';
  }

  // Additional types for comparison methods
  private rankProductsByProfitability(predictions: any[], userPreferences?: any): ProductRanking[] {
    return predictions.map(({ asin, prediction }) => ({
      asin,
      rank: 1,
      expectedProfit: prediction.optimalStrategy.expectedProfit,
      expectedROI: prediction.optimalStrategy.expectedROI,
      riskLevel: prediction.riskAssessment.overallRisk,
      confidence: prediction.metadata.confidence,
      recommendation: prediction.optimalStrategy.recommendedAction,
    })).sort((a, b) => b.expectedROI - a.expectedROI)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  private generatePortfolioSuggestion(rankings: ProductRanking[], budget: number): PortfolioSuggestion {
    // Simplified portfolio optimization
    let totalCost = 0;
    let totalExpectedProfit = 0;
    const selectedProducts: ProductRanking[] = [];

    for (const product of rankings) {
      const estimatedCost = product.expectedProfit / (product.expectedROI || 0.1); // Rough estimation
      if (totalCost + estimatedCost <= budget && product.recommendation === 'buy') {
        selectedProducts.push(product);
        totalCost += estimatedCost;
        totalExpectedProfit += product.expectedProfit;
      }
    }

    return {
      selectedProducts,
      totalInvestment: totalCost,
      totalExpectedProfit,
      totalExpectedROI: totalCost > 0 ? totalExpectedProfit / totalCost : 0,
      riskDistribution: this.calculateRiskDistribution(selectedProducts),
    };
  }

  private calculateRiskDistribution(products: ProductRanking[]): { low: number; medium: number; high: number } {
    const distribution = { low: 0, medium: 0, high: 0 };
    products.forEach(product => {
      distribution[product.riskLevel]++;
    });
    return distribution;
  }
}

// Additional interfaces
interface ProductRanking {
  asin: string;
  rank: number;
  expectedProfit: number;
  expectedROI: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  recommendation: string;
}

interface PortfolioSuggestion {
  selectedProducts: ProductRanking[];
  totalInvestment: number;
  totalExpectedProfit: number;
  totalExpectedROI: number;
  riskDistribution: { low: number; medium: number; high: number };
}