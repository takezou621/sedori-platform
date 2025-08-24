import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KeepaProduct, KeepaPriceAnalysis } from '../external-apis/interfaces/keepa-data.interface';

export interface ProductScore {
  asin: string;
  overallScore: number; // 0-100
  profitabilityScore: number;
  riskScore: number;
  demandScore: number;
  competitionScore: number;
  trendScore: number;
  confidenceLevel: number;
  reasoning: string[];
  recommendations: ProductRecommendation[];
}

export interface ProductRecommendation {
  type: 'buy' | 'sell' | 'watch' | 'avoid';
  priority: 'high' | 'medium' | 'low';
  reason: string;
  expectedReturn?: number;
  timeframe?: string;
  confidence: number;
}

export interface ScoringWeights {
  profitability: number;
  risk: number;
  demand: number;
  competition: number;
  trend: number;
}

@Injectable()
export class MlScoringService {
  private readonly logger = new Logger(MlScoringService.name);
  private readonly enableMl: boolean;
  private readonly confidenceThreshold: number;

  // Default scoring weights
  private readonly defaultWeights: ScoringWeights = {
    profitability: 0.35,
    risk: 0.20,
    demand: 0.25,
    competition: 0.15,
    trend: 0.05,
  };

  constructor(private readonly configService: ConfigService) {
    const aiConfig = this.configService.get('ai');
    this.enableMl = aiConfig?.features?.enableAutoScoring ?? true;
    this.confidenceThreshold = aiConfig?.prediction?.confidenceThreshold || 0.7;

    this.logger.log('ML Scoring Service initialized');
  }

  async scoreProduct(
    product: KeepaProduct,
    priceAnalysis?: KeepaPriceAnalysis,
    customWeights?: Partial<ScoringWeights>,
  ): Promise<ProductScore> {
    try {
      const weights = { ...this.defaultWeights, ...customWeights };

      // Calculate individual scores
      const profitabilityScore = this.calculateProfitabilityScore(product, priceAnalysis);
      const riskScore = this.calculateRiskScore(product, priceAnalysis);
      const demandScore = this.calculateDemandScore(product);
      const competitionScore = this.calculateCompetitionScore(product);
      const trendScore = this.calculateTrendScore(product, priceAnalysis);

      // Calculate overall weighted score
      const overallScore = Math.round(
        profitabilityScore * weights.profitability +
        (100 - riskScore) * weights.risk + // Invert risk score (lower risk = higher score)
        demandScore * weights.demand +
        competitionScore * weights.competition +
        trendScore * weights.trend
      );

      // Generate reasoning and recommendations
      const reasoning = this.generateReasoning(
        product,
        { profitabilityScore, riskScore, demandScore, competitionScore, trendScore }
      );
      const recommendations = this.generateRecommendations(
        product,
        { profitabilityScore, riskScore, demandScore, competitionScore, trendScore, overallScore }
      );

      // Calculate confidence level
      const confidenceLevel = this.calculateConfidenceLevel(product, priceAnalysis);

      return {
        asin: product.asin,
        overallScore,
        profitabilityScore,
        riskScore,
        demandScore,
        competitionScore,
        trendScore,
        confidenceLevel,
        reasoning,
        recommendations,
      };

    } catch (error) {
      this.logger.error(`Failed to score product ${product.asin}:`, error);
      return this.getFallbackScore(product);
    }
  }

  async scoreBatch(products: KeepaProduct[]): Promise<ProductScore[]> {
    this.logger.log(`Scoring batch of ${products.length} products`);
    
    const scores = await Promise.all(
      products.map(async (product) => {
        try {
          return await this.scoreProduct(product);
        } catch (error) {
          this.logger.warn(`Failed to score product ${product.asin}:`, error);
          return this.getFallbackScore(product);
        }
      })
    );

    return scores.sort((a, b) => b.overallScore - a.overallScore);
  }

  // Individual scoring methods
  private calculateProfitabilityScore(
    product: KeepaProduct,
    priceAnalysis?: KeepaPriceAnalysis
  ): number {
    let score = 50; // Base score

    const currentPrice = product.stats?.current?.[0] || 0;
    const amazonPrice = currentPrice / 100; // Convert from cents

    // Price range factor
    if (amazonPrice > 10000) score += 25; // High-value items often have better margins
    else if (amazonPrice > 5000) score += 15;
    else if (amazonPrice > 2000) score += 10;
    else if (amazonPrice < 500) score -= 10; // Very low-price items often have thin margins

    // Rating factor (higher rating = easier to sell = better profitability)
    const rating = product.stats?.rating;
    if (rating) {
      if (rating >= 4.5) score += 15;
      else if (rating >= 4.0) score += 10;
      else if (rating >= 3.5) score += 5;
      else if (rating < 3.0) score -= 15;
    }

    // Review count factor (social proof)
    const reviewCount = product.stats?.reviewCount || 0;
    if (reviewCount > 1000) score += 10;
    else if (reviewCount > 100) score += 5;
    else if (reviewCount < 10) score -= 10;

    // Price volatility factor (from AI analysis)
    if (priceAnalysis) {
      const volatility = priceAnalysis.analysis.volatility;
      if (volatility < 5) score += 10; // Low volatility = predictable pricing
      else if (volatility > 25) score -= 15; // High volatility = risky
    }

    // Category-based adjustments
    const categoryBonus = this.getCategoryProfitabilityBonus(product.categoryTree);
    score += categoryBonus;

    return Math.max(0, Math.min(100, score));
  }

  private calculateRiskScore(
    product: KeepaProduct,
    priceAnalysis?: KeepaPriceAnalysis
  ): number {
    let risk = 20; // Base risk

    // Price volatility risk
    if (priceAnalysis) {
      const volatility = priceAnalysis.analysis.volatility;
      if (volatility > 30) risk += 30;
      else if (volatility > 20) risk += 20;
      else if (volatility > 10) risk += 10;

      // Trend risk
      if (priceAnalysis.analysis.trend === 'falling') risk += 25;
      else if (priceAnalysis.analysis.trend === 'volatile') risk += 20;

      // Anomaly risk
      risk += Math.min(20, priceAnalysis.analysis.anomalies.length * 5);
    }

    // Sales rank stability (higher rank = higher risk)
    const salesRank = product.stats?.current?.[3] || 999999;
    if (salesRank > 100000) risk += 25;
    else if (salesRank > 50000) risk += 15;
    else if (salesRank > 10000) risk += 10;

    // Brand risk (unknown brands are riskier)
    if (!product.brand || product.brand.toLowerCase() === 'unknown') {
      risk += 15;
    }

    // Category risk
    const categoryRisk = this.getCategoryRiskFactor(product.categoryTree);
    risk += categoryRisk;

    // Competition risk (many sellers = higher risk)
    const offerCount = this.estimateOfferCount(product);
    if (offerCount > 10) risk += 15;
    else if (offerCount > 5) risk += 10;

    return Math.max(0, Math.min(100, risk));
  }

  private calculateDemandScore(product: KeepaProduct): number {
    let score = 40; // Base score

    // Sales rank (lower rank = higher demand)
    const salesRank = product.stats?.current?.[3] || 999999;
    if (salesRank < 100) score += 40;
    else if (salesRank < 1000) score += 30;
    else if (salesRank < 10000) score += 20;
    else if (salesRank < 50000) score += 10;
    else if (salesRank > 500000) score -= 20;

    // Review velocity (recent reviews indicate current demand)
    const reviewCount = product.stats?.reviewCount || 0;
    if (reviewCount > 5000) score += 20;
    else if (reviewCount > 1000) score += 15;
    else if (reviewCount > 100) score += 10;
    else if (reviewCount < 5) score -= 15;

    // Rating factor (higher rating = more demand)
    const rating = product.stats?.rating;
    if (rating) {
      if (rating >= 4.5) score += 10;
      else if (rating >= 4.0) score += 5;
      else if (rating < 3.0) score -= 15;
    }

    // Category demand
    const categoryDemand = this.getCategoryDemandScore(product.categoryTree);
    score += categoryDemand;

    // Seasonal factors
    const seasonalBonus = this.getSeasonalDemandBonus(product);
    score += seasonalBonus;

    return Math.max(0, Math.min(100, score));
  }

  private calculateCompetitionScore(product: KeepaProduct): number {
    let score = 50; // Base score (lower competition = higher score)

    // Estimate number of sellers
    const estimatedSellers = this.estimateOfferCount(product);
    if (estimatedSellers < 3) score += 30; // Low competition
    else if (estimatedSellers < 5) score += 20;
    else if (estimatedSellers < 10) score += 10;
    else if (estimatedSellers > 20) score -= 20; // High competition

    // Amazon's presence (if Amazon sells it, competition is higher)
    const amazonPrice = product.stats?.current?.[0];
    if (amazonPrice && amazonPrice > 0) score -= 15; // Amazon is competing

    // Brand factor (strong brands face different competition)
    if (this.isWellKnownBrand(product.brand)) {
      score += 10; // Branded products often have authorized sellers only
    }

    // Category competition
    const categoryCompetition = this.getCategoryCompetitionFactor(product.categoryTree);
    score -= categoryCompetition;

    // Price dispersion (high variance = low competition)
    if (product.stats) {
      const priceVariance = this.calculatePriceVariance(product);
      if (priceVariance > 0.2) score += 15; // High price variance = low competition
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateTrendScore(
    product: KeepaProduct,
    priceAnalysis?: KeepaPriceAnalysis
  ): number {
    let score = 50; // Base score

    if (priceAnalysis) {
      // Price trend
      switch (priceAnalysis.analysis.trend) {
        case 'rising':
          score += 20; // Rising prices = good trend
          break;
        case 'stable':
          score += 10; // Stable prices = predictable
          break;
        case 'falling':
          score -= 20; // Falling prices = bad trend
          break;
        case 'volatile':
          score -= 10; // Volatility = unpredictable
          break;
      }

      // Trend strength
      score += priceAnalysis.analysis.trendStrength * 10;

      // Predictions (if available)
      if (priceAnalysis.analysis.predictions.length > 0) {
        const avgPredictionConfidence = priceAnalysis.analysis.predictions
          .reduce((sum, pred) => sum + pred.probability, 0) / priceAnalysis.analysis.predictions.length;
        score += avgPredictionConfidence * 15;
      }
    }

    // Sales rank trend (would need historical data)
    const salesRankDrops30 = product.stats?.salesRankDrops30 || 0;
    if (salesRankDrops30 > 10) score += 15; // Many rank drops = increasing demand

    return Math.max(0, Math.min(100, score));
  }

  // Helper methods
  private getCategoryProfitabilityBonus(categories: any[]): number {
    if (!categories || categories.length === 0) return 0;

    const categoryName = categories[0]?.name?.toLowerCase() || '';
    
    // High-margin categories
    if (categoryName.includes('electronics') || categoryName.includes('電子機器')) return 10;
    if (categoryName.includes('beauty') || categoryName.includes('美容')) return 8;
    if (categoryName.includes('health') || categoryName.includes('健康')) return 8;
    if (categoryName.includes('automotive') || categoryName.includes('自動車')) return 6;

    // Low-margin categories
    if (categoryName.includes('books') || categoryName.includes('本')) return -5;
    if (categoryName.includes('grocery') || categoryName.includes('食品')) return -8;

    return 0;
  }

  private getCategoryRiskFactor(categories: any[]): number {
    if (!categories || categories.length === 0) return 10;

    const categoryName = categories[0]?.name?.toLowerCase() || '';
    
    // High-risk categories
    if (categoryName.includes('clothing') || categoryName.includes('服')) return 15;
    if (categoryName.includes('toys') || categoryName.includes('おもちゃ')) return 12;
    if (categoryName.includes('seasonal') || categoryName.includes('季節')) return 20;

    // Low-risk categories
    if (categoryName.includes('books') || categoryName.includes('本')) return 5;
    if (categoryName.includes('tools') || categoryName.includes('工具')) return 5;

    return 8;
  }

  private getCategoryDemandScore(categories: any[]): number {
    if (!categories || categories.length === 0) return 0;

    const categoryName = categories[0]?.name?.toLowerCase() || '';
    const month = new Date().getMonth();
    
    // Base category demand
    let score = 0;
    if (categoryName.includes('electronics') || categoryName.includes('電子機器')) score = 10;
    if (categoryName.includes('home') || categoryName.includes('家庭')) score = 8;
    if (categoryName.includes('health') || categoryName.includes('健康')) score = 8;

    // Seasonal adjustments
    if (month >= 10 && month <= 11) { // November-December
      if (categoryName.includes('toys') || categoryName.includes('おもちゃ')) score += 15;
      if (categoryName.includes('electronics') || categoryName.includes('電子機器')) score += 10;
    }

    return score;
  }

  private getCategoryCompetitionFactor(categories: any[]): number {
    if (!categories || categories.length === 0) return 15;

    const categoryName = categories[0]?.name?.toLowerCase() || '';
    
    // High-competition categories
    if (categoryName.includes('electronics') || categoryName.includes('電子機器')) return 20;
    if (categoryName.includes('clothing') || categoryName.includes('服')) return 25;
    if (categoryName.includes('beauty') || categoryName.includes('美容')) return 18;

    // Low-competition categories
    if (categoryName.includes('industrial') || categoryName.includes('産業')) return 5;
    if (categoryName.includes('specialized') || categoryName.includes('専門')) return 8;

    return 15;
  }

  private getSeasonalDemandBonus(product: KeepaProduct): number {
    const month = new Date().getMonth();
    const categoryName = product.categoryTree?.[0]?.name?.toLowerCase() || '';
    
    // Christmas season
    if (month === 11) { // December
      if (categoryName.includes('toys') || categoryName.includes('おもちゃ')) return 20;
      if (categoryName.includes('electronics') || categoryName.includes('電子機器')) return 10;
      return 5; // General Christmas boost
    }

    // Back to school
    if (month === 2 || month === 8) { // March or September
      if (categoryName.includes('books') || categoryName.includes('本')) return 15;
      if (categoryName.includes('supplies') || categoryName.includes('用品')) return 10;
    }

    // Summer season
    if (month >= 5 && month <= 7) { // June-August
      if (categoryName.includes('outdoor') || categoryName.includes('アウトドア')) return 15;
      if (categoryName.includes('sports') || categoryName.includes('スポーツ')) return 10;
    }

    return 0;
  }

  private estimateOfferCount(product: KeepaProduct): number {
    // Estimate based on available data
    let estimatedOffers = 1;

    if (product.stats?.current?.[11]) estimatedOffers += product.stats.current[11]; // New offers count
    if (product.stats?.current?.[12]) estimatedOffers += product.stats.current[12]; // Used offers count

    return Math.min(50, estimatedOffers); // Cap at 50
  }

  private isWellKnownBrand(brand?: string): boolean {
    if (!brand) return false;
    
    const wellKnownBrands = [
      'apple', 'sony', 'samsung', 'canon', 'nikon', 'panasonic',
      'nintendo', 'microsoft', 'adobe', 'nike', 'adidas'
    ];
    
    return wellKnownBrands.some(knownBrand => 
      brand.toLowerCase().includes(knownBrand)
    );
  }

  private calculatePriceVariance(product: KeepaProduct): number {
    if (!product.stats?.current) return 0;

    const prices = [
      product.stats.current[0], // Amazon price
      product.stats.current[1], // New price
      product.stats.current[2], // Used price
    ].filter(price => price > 0);

    if (prices.length < 2) return 0;

    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private generateReasoning(
    product: KeepaProduct,
    scores: { profitabilityScore: number; riskScore: number; demandScore: number; competitionScore: number; trendScore: number }
  ): string[] {
    const reasoning: string[] = [];

    // Profitability reasoning
    if (scores.profitabilityScore > 70) {
      reasoning.push('高い利益潜在性 - 価格帯と評価が良好');
    } else if (scores.profitabilityScore < 40) {
      reasoning.push('利益潜在性に注意 - 薄利または高リスク');
    }

    // Risk reasoning
    if (scores.riskScore < 30) {
      reasoning.push('低リスク - 安定した価格動向と需要');
    } else if (scores.riskScore > 60) {
      reasoning.push('高リスク - 価格変動が大きいか需要不安定');
    }

    // Demand reasoning
    if (scores.demandScore > 70) {
      reasoning.push('高需要 - 売上ランクと評価数が良好');
    } else if (scores.demandScore < 40) {
      reasoning.push('需要に注意 - 売上ランクが低いか評価が少ない');
    }

    // Competition reasoning
    if (scores.competitionScore > 70) {
      reasoning.push('競合が少ない - 参入しやすい市場');
    } else if (scores.competitionScore < 40) {
      reasoning.push('競合が多い - 価格競争に注意');
    }

    return reasoning;
  }

  private generateRecommendations(
    product: KeepaProduct,
    scores: { profitabilityScore: number; riskScore: number; demandScore: number; competitionScore: number; trendScore: number; overallScore: number }
  ): ProductRecommendation[] {
    const recommendations: ProductRecommendation[] = [];

    // Overall recommendation
    if (scores.overallScore > 75) {
      recommendations.push({
        type: 'buy',
        priority: 'high',
        reason: '総合スコアが高く、利益性と需要のバランスが良い',
        confidence: 0.85,
        timeframe: '1-2週間以内',
        expectedReturn: 15,
      });
    } else if (scores.overallScore > 60) {
      recommendations.push({
        type: 'watch',
        priority: 'medium',
        reason: '中程度のスコア - 市場動向を監視して判断',
        confidence: 0.7,
        timeframe: '1ヶ月',
      });
    } else if (scores.overallScore < 40) {
      recommendations.push({
        type: 'avoid',
        priority: 'high',
        reason: 'スコアが低く、リスクが高い',
        confidence: 0.8,
      });
    }

    // Risk-based recommendations
    if (scores.riskScore > 70) {
      recommendations.push({
        type: 'avoid',
        priority: 'high',
        reason: 'リスクレベルが高すぎる',
        confidence: 0.9,
      });
    }

    // Trend-based recommendations
    if (scores.trendScore > 70) {
      recommendations.push({
        type: 'buy',
        priority: 'medium',
        reason: '価格トレンドが良好',
        confidence: 0.75,
        timeframe: '短期間',
      });
    }

    return recommendations;
  }

  private calculateConfidenceLevel(product: KeepaProduct, priceAnalysis?: KeepaPriceAnalysis): number {
    let confidence = 0.5; // Base confidence

    // Data availability
    if (product.stats?.reviewCount && product.stats.reviewCount > 100) confidence += 0.2;
    if (product.stats?.rating && product.stats.rating > 0) confidence += 0.1;
    if (priceAnalysis && priceAnalysis.analysis.predictions.length > 0) confidence += 0.15;

    // Data quality
    if (product.stats?.current && product.stats.current.filter(val => val > 0).length > 3) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  private getFallbackScore(product: KeepaProduct): ProductScore {
    return {
      asin: product.asin,
      overallScore: 50,
      profitabilityScore: 50,
      riskScore: 50,
      demandScore: 50,
      competitionScore: 50,
      trendScore: 50,
      confidenceLevel: 0.3,
      reasoning: ['データ不足によりデフォルトスコアを使用'],
      recommendations: [{
        type: 'watch',
        priority: 'low',
        reason: 'データ不足 - より詳細な分析が必要',
        confidence: 0.3,
      }],
    };
  }
}