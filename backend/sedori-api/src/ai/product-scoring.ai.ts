import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { KeepaProduct, KeepaPriceAnalysis } from '../external-apis/interfaces/keepa-data.interface';

export interface AiProductScore {
  asin: string;
  overallScore: number; // 0-100
  dimensions: {
    profitability: ScoringDimension;
    demand: ScoringDimension;
    competition: ScoringDimension;
    risk: ScoringDimension;
    trend: ScoringDimension;
    seasonality: ScoringDimension;
  };
  metadata: {
    confidence: number;
    modelVersion: string;
    lastUpdated: Date;
    dataQuality: 'high' | 'medium' | 'low';
  };
  insights: AiInsight[];
  recommendations: AiRecommendation[];
}

export interface ScoringDimension {
  score: number; // 0-100
  confidence: number; // 0-1
  factors: ScoringFactor[];
  explanation: string;
}

export interface ScoringFactor {
  name: string;
  impact: number; // -100 to +100
  weight: number; // 0-1
  description: string;
}

export interface AiInsight {
  type: 'opportunity' | 'warning' | 'trend' | 'market';
  severity: 'low' | 'medium' | 'high';
  message: string;
  evidence: string[];
  actionable: boolean;
}

export interface AiRecommendation {
  action: 'buy' | 'sell' | 'watch' | 'avoid' | 'research';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  reasoning: string;
  conditions?: string[];
  expectedOutcome?: string;
  timeframe?: string;
  confidence: number;
}

@Injectable()
export class ProductScoringAiService {
  private readonly logger = new Logger(ProductScoringAiService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MODEL_VERSION = '1.2';

  // Scoring weights - these would be learned from data in a real ML system
  private readonly scoringWeights = {
    profitability: 0.30,
    demand: 0.25,
    competition: 0.20,
    risk: 0.15,
    trend: 0.08,
    seasonality: 0.02,
  };

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async scoreProduct(
    product: KeepaProduct,
    priceAnalysis?: KeepaPriceAnalysis,
    marketContext?: any,
  ): Promise<AiProductScore> {
    const cacheKey = `ai-score:${product.asin}`;

    try {
      // Check cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for AI scoring: ${product.asin}`);
        return JSON.parse(cached);
      }

      this.logger.debug(`Starting AI scoring for product: ${product.asin}`);

      // Calculate dimensional scores
      const dimensions = {
        profitability: await this.scoreProfitability(product, priceAnalysis),
        demand: await this.scoreDemand(product),
        competition: await this.scoreCompetition(product),
        risk: await this.scoreRisk(product, priceAnalysis),
        trend: await this.scoreTrend(product, priceAnalysis),
        seasonality: await this.scoreSeasonality(product),
      };

      // Calculate overall score
      const overallScore = this.calculateOverallScore(dimensions);

      // Generate insights
      const insights = this.generateInsights(product, dimensions, priceAnalysis);

      // Generate recommendations
      const recommendations = this.generateRecommendations(product, dimensions, overallScore);

      // Assess data quality and confidence
      const dataQuality = this.assessDataQuality(product, priceAnalysis);
      const confidence = this.calculateConfidence(product, dimensions, dataQuality);

      const score: AiProductScore = {
        asin: product.asin,
        overallScore,
        dimensions,
        metadata: {
          confidence,
          modelVersion: this.MODEL_VERSION,
          lastUpdated: new Date(),
          dataQuality,
        },
        insights,
        recommendations,
      };

      // Cache the result
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(score));

      this.logger.debug(`AI scoring completed for ${product.asin}: ${overallScore}`);
      return score;

    } catch (error) {
      this.logger.error(`AI scoring failed for ${product.asin}:`, error);
      return this.getFallbackScore(product);
    }
  }

  async scoreBatch(products: KeepaProduct[]): Promise<AiProductScore[]> {
    this.logger.log(`AI batch scoring ${products.length} products`);
    
    const scores = await Promise.all(
      products.map(async (product) => {
        try {
          return await this.scoreProduct(product);
        } catch (error) {
          this.logger.warn(`Failed to score product ${product.asin}:`, error);
          return this.getFallbackScore(product);
        }
      }),
    );

    return scores;
  }

  // Dimensional scoring methods
  private async scoreProfitability(
    product: KeepaProduct,
    priceAnalysis?: KeepaPriceAnalysis,
  ): Promise<ScoringDimension> {
    const factors: ScoringFactor[] = [];
    let score = 50; // Base score

    // Current price factor
    const currentPrice = (product.stats?.current?.[0] || 0) / 100;
    if (currentPrice > 10000) {
      factors.push({
        name: '高価格商品',
        impact: 20,
        weight: 0.3,
        description: '高価格商品は一般的に高い利益率を持つ',
      });
      score += 20;
    } else if (currentPrice < 1000) {
      factors.push({
        name: '低価格商品',
        impact: -15,
        weight: 0.3,
        description: '低価格商品は利益率が薄い傾向',
      });
      score -= 15;
    }

    // Rating factor
    const rating = product.stats?.rating || 0;
    if (rating >= 4.5) {
      factors.push({
        name: '高評価',
        impact: 15,
        weight: 0.25,
        description: '高評価商品は販売しやすく利益を確保しやすい',
      });
      score += 15;
    } else if (rating < 3.0) {
      factors.push({
        name: '低評価',
        impact: -20,
        weight: 0.25,
        description: '低評価商品は販売が困難で値下げが必要になりがち',
      });
      score -= 20;
    }

    // Price volatility from AI analysis
    if (priceAnalysis) {
      const volatility = priceAnalysis.analysis.volatility;
      if (volatility < 10) {
        factors.push({
          name: '価格安定性',
          impact: 10,
          weight: 0.2,
          description: '価格が安定しており予測しやすい利益構造',
        });
        score += 10;
      } else if (volatility > 30) {
        factors.push({
          name: '価格不安定性',
          impact: -15,
          weight: 0.2,
          description: '価格変動が大きく利益予測が困難',
        });
        score -= 15;
      }
    }

    // Category-based profitability
    const categoryBonus = this.getCategoryProfitabilityScore(product.categoryTree);
    if (categoryBonus !== 0) {
      factors.push({
        name: 'カテゴリ要因',
        impact: categoryBonus,
        weight: 0.15,
        description: `${product.categoryTree?.[0]?.name}カテゴリの利益特性`,
      });
      score += categoryBonus;
    }

    // Amazon's involvement (reduces third-party profit potential)
    const amazonPrice = product.stats?.current?.[0];
    if (amazonPrice && amazonPrice > 0) {
      factors.push({
        name: 'Amazon競合',
        impact: -10,
        weight: 0.1,
        description: 'Amazonが直販しており価格競争が激しい',
      });
      score -= 10;
    }

    const finalScore = Math.max(0, Math.min(100, score));
    
    return {
      score: finalScore,
      confidence: this.calculateDimensionConfidence(factors, product),
      factors,
      explanation: this.generateProfitabilityExplanation(finalScore, factors),
    };
  }

  private async scoreDemand(product: KeepaProduct): Promise<ScoringDimension> {
    const factors: ScoringFactor[] = [];
    let score = 50; // Base score

    // Sales rank (most important demand indicator)
    const salesRank = product.stats?.current?.[3] || 999999;
    let salesRankImpact = 0;
    if (salesRank < 100) {
      salesRankImpact = 40;
    } else if (salesRank < 1000) {
      salesRankImpact = 30;
    } else if (salesRank < 10000) {
      salesRankImpact = 15;
    } else if (salesRank < 100000) {
      salesRankImpact = 5;
    } else {
      salesRankImpact = -20;
    }

    factors.push({
      name: '売上ランク',
      impact: salesRankImpact,
      weight: 0.4,
      description: `売上ランク ${salesRank.toLocaleString()}位`,
    });
    score += salesRankImpact;

    // Review count (social proof)
    const reviewCount = product.stats?.reviewCount || 0;
    let reviewImpact = 0;
    if (reviewCount > 5000) {
      reviewImpact = 20;
    } else if (reviewCount > 1000) {
      reviewImpact = 15;
    } else if (reviewCount > 100) {
      reviewImpact = 8;
    } else if (reviewCount < 10) {
      reviewImpact = -10;
    }

    factors.push({
      name: 'レビュー数',
      impact: reviewImpact,
      weight: 0.25,
      description: `${reviewCount.toLocaleString()}件のレビュー`,
    });
    score += reviewImpact;

    // Rating quality (affects conversion rate)
    const rating = product.stats?.rating || 0;
    if (rating >= 4.5) {
      factors.push({
        name: '優秀な評価',
        impact: 10,
        weight: 0.15,
        description: '高評価により高い購買転換率が期待される',
      });
      score += 10;
    } else if (rating < 3.5 && rating > 0) {
      factors.push({
        name: '評価課題',
        impact: -15,
        weight: 0.15,
        description: '低評価により需要が抑制される',
      });
      score -= 15;
    }

    // Seasonal demand factors
    const seasonalScore = this.getSeasonalDemandScore(product);
    if (seasonalScore !== 0) {
      factors.push({
        name: '季節要因',
        impact: seasonalScore,
        weight: 0.1,
        description: '季節性による需要変動',
      });
      score += seasonalScore;
    }

    // Category demand characteristics
    const categoryDemand = this.getCategoryDemandScore(product.categoryTree);
    if (categoryDemand !== 0) {
      factors.push({
        name: 'カテゴリ需要',
        impact: categoryDemand,
        weight: 0.1,
        description: `${product.categoryTree?.[0]?.name}カテゴリの需要特性`,
      });
      score += categoryDemand;
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      score: finalScore,
      confidence: this.calculateDimensionConfidence(factors, product),
      factors,
      explanation: this.generateDemandExplanation(finalScore, factors, salesRank, reviewCount),
    };
  }

  private async scoreCompetition(product: KeepaProduct): Promise<ScoringDimension> {
    const factors: ScoringFactor[] = [];
    let score = 50; // Base score (lower competition = higher score)

    // Estimate number of sellers
    const estimatedSellers = this.estimateSellerCount(product);
    let sellerImpact = 0;
    if (estimatedSellers < 3) {
      sellerImpact = 25;
    } else if (estimatedSellers < 5) {
      sellerImpact = 15;
    } else if (estimatedSellers < 10) {
      sellerImpact = 5;
    } else if (estimatedSellers > 20) {
      sellerImpact = -20;
    } else {
      sellerImpact = -10;
    }

    factors.push({
      name: '出品者数',
      impact: sellerImpact,
      weight: 0.35,
      description: `推定${estimatedSellers}人の出品者`,
    });
    score += sellerImpact;

    // Brand strength (affects competition dynamics)
    const brandStrength = this.assessBrandStrength(product.brand);
    if (brandStrength === 'strong') {
      factors.push({
        name: '強いブランド',
        impact: 15,
        weight: 0.25,
        description: '有名ブランドのため価格競争が少ない',
      });
      score += 15;
    } else if (brandStrength === 'weak') {
      factors.push({
        name: '弱いブランド',
        impact: -10,
        weight: 0.25,
        description: 'ブランド力が弱く価格競争が激しい',
      });
      score -= 10;
    }

    // Amazon's direct competition
    const amazonPrice = product.stats?.current?.[0];
    if (amazonPrice && amazonPrice > 0) {
      factors.push({
        name: 'Amazon直販',
        impact: -15,
        weight: 0.2,
        description: 'Amazonが直接販売しており競争が激しい',
      });
      score -= 15;
    } else {
      factors.push({
        name: 'Amazon非直販',
        impact: 10,
        weight: 0.2,
        description: 'Amazon非直販のため競争圧力が少ない',
      });
      score += 10;
    }

    // Category competition level
    const categoryCompetition = this.getCategoryCompetitionScore(product.categoryTree);
    if (categoryCompetition !== 0) {
      factors.push({
        name: 'カテゴリ競争',
        impact: -categoryCompetition,
        weight: 0.2,
        description: `${product.categoryTree?.[0]?.name}カテゴリの競争レベル`,
      });
      score -= categoryCompetition;
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      score: finalScore,
      confidence: this.calculateDimensionConfidence(factors, product),
      factors,
      explanation: this.generateCompetitionExplanation(finalScore, factors, estimatedSellers),
    };
  }

  private async scoreRisk(
    product: KeepaProduct,
    priceAnalysis?: KeepaPriceAnalysis,
  ): Promise<ScoringDimension> {
    const factors: ScoringFactor[] = [];
    let riskScore = 30; // Base risk (lower score = lower risk)

    // Price volatility risk
    if (priceAnalysis) {
      const volatility = priceAnalysis.analysis.volatility;
      if (volatility > 30) {
        factors.push({
          name: '高価格変動リスク',
          impact: 25,
          weight: 0.3,
          description: '価格変動が大きく損失リスクが高い',
        });
        riskScore += 25;
      } else if (volatility < 10) {
        factors.push({
          name: '価格安定性',
          impact: -10,
          weight: 0.3,
          description: '価格が安定しており予測しやすい',
        });
        riskScore -= 10;
      }

      // Trend risk
      if (priceAnalysis.analysis.trend === 'falling') {
        factors.push({
          name: '価格下落トレンド',
          impact: 20,
          weight: 0.25,
          description: '価格下落傾向により損失リスクが高い',
        });
        riskScore += 20;
      } else if (priceAnalysis.analysis.trend === 'rising') {
        factors.push({
          name: '価格上昇トレンド',
          impact: -5,
          weight: 0.25,
          description: '価格上昇傾向によりリスクが軽減',
        });
        riskScore -= 5;
      }
    }

    // Sales rank risk (high rank = high risk)
    const salesRank = product.stats?.current?.[3] || 999999;
    if (salesRank > 500000) {
      factors.push({
        name: '低需要リスク',
        impact: 25,
        weight: 0.2,
        description: '売上ランクが低く売れ残りリスクが高い',
      });
      riskScore += 25;
    } else if (salesRank < 10000) {
      factors.push({
        name: '高需要安定性',
        impact: -15,
        weight: 0.2,
        description: '売上ランクが高く安定した需要',
      });
      riskScore -= 15;
    }

    // Category risk
    const categoryRisk = this.getCategoryRiskScore(product.categoryTree);
    if (categoryRisk > 0) {
      factors.push({
        name: 'カテゴリリスク',
        impact: categoryRisk,
        weight: 0.15,
        description: `${product.categoryTree?.[0]?.name}カテゴリ固有のリスク`,
      });
      riskScore += categoryRisk;
    }

    // Brand reliability risk
    const brandRisk = this.assessBrandRisk(product.brand);
    if (brandRisk > 0) {
      factors.push({
        name: 'ブランドリスク',
        impact: brandRisk,
        weight: 0.1,
        description: 'ブランド信頼性によるリスク',
      });
      riskScore += brandRisk;
    }

    const finalScore = Math.max(0, Math.min(100, riskScore));

    return {
      score: finalScore,
      confidence: this.calculateDimensionConfidence(factors, product),
      factors,
      explanation: this.generateRiskExplanation(finalScore, factors),
    };
  }

  private async scoreTrend(
    product: KeepaProduct,
    priceAnalysis?: KeepaPriceAnalysis,
  ): Promise<ScoringDimension> {
    const factors: ScoringFactor[] = [];
    let score = 50; // Base score

    // Price trend analysis
    if (priceAnalysis) {
      const trend = priceAnalysis.analysis.trend;
      const trendStrength = priceAnalysis.analysis.trendStrength;

      switch (trend) {
        case 'rising':
          factors.push({
            name: '価格上昇トレンド',
            impact: 20,
            weight: 0.4,
            description: '価格上昇傾向で有利な市場環境',
          });
          score += 20;
          break;
        case 'stable':
          factors.push({
            name: '価格安定トレンド',
            impact: 5,
            weight: 0.4,
            description: '価格が安定しており予測しやすい',
          });
          score += 5;
          break;
        case 'falling':
          factors.push({
            name: '価格下落トレンド',
            impact: -25,
            weight: 0.4,
            description: '価格下落傾向で不利な市場環境',
          });
          score -= 25;
          break;
        case 'volatile':
          factors.push({
            name: '価格変動トレンド',
            impact: -10,
            weight: 0.4,
            description: '価格変動が大きく予測が困難',
          });
          score -= 10;
          break;
      }

      // Trend strength
      const strengthBonus = Math.floor(trendStrength * 10);
      if (strengthBonus > 0) {
        factors.push({
          name: 'トレンド強度',
          impact: strengthBonus,
          weight: 0.2,
          description: `トレンドの強度: ${(trendStrength * 100).toFixed(1)}%`,
        });
        score += strengthBonus;
      }
    }

    // Sales rank trend (if available)
    const salesRankDrops = product.stats?.salesRankDrops30 || 0;
    if (salesRankDrops > 10) {
      factors.push({
        name: '売上ランク改善',
        impact: 15,
        weight: 0.3,
        description: '最近30日で売上ランクが頻繁に改善',
      });
      score += 15;
    } else if (salesRankDrops === 0) {
      factors.push({
        name: '売上ランク停滞',
        impact: -5,
        weight: 0.3,
        description: '売上ランクに変動がない',
      });
      score -= 5;
    }

    // Seasonal trend consideration
    const seasonalTrend = this.getSeasonalTrendScore(product);
    if (seasonalTrend !== 0) {
      factors.push({
        name: '季節トレンド',
        impact: seasonalTrend,
        weight: 0.1,
        description: '季節的なトレンド要因',
      });
      score += seasonalTrend;
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      score: finalScore,
      confidence: this.calculateDimensionConfidence(factors, product),
      factors,
      explanation: this.generateTrendExplanation(finalScore, factors),
    };
  }

  private async scoreSeasonality(product: KeepaProduct): Promise<ScoringDimension> {
    const factors: ScoringFactor[] = [];
    let score = 50; // Base score

    const currentMonth = new Date().getMonth();
    const categoryName = product.categoryTree?.[0]?.name?.toLowerCase() || '';

    // Christmas/Year-end season (November-December)
    if ([10, 11].includes(currentMonth)) {
      if (categoryName.includes('toy') || categoryName.includes('おもちゃ') || 
          categoryName.includes('game') || categoryName.includes('ゲーム')) {
        factors.push({
          name: 'クリスマス商戦',
          impact: 30,
          weight: 0.4,
          description: 'おもちゃ・ゲーム商品の年末需要ピーク',
        });
        score += 30;
      } else if (categoryName.includes('electronics') || categoryName.includes('電子')) {
        factors.push({
          name: '年末商戦',
          impact: 15,
          weight: 0.4,
          description: '家電商品の年末需要増加',
        });
        score += 15;
      }
    }

    // Back-to-school season (February-March, August-September)
    if ([1, 2, 7, 8].includes(currentMonth)) {
      if (categoryName.includes('book') || categoryName.includes('本') ||
          categoryName.includes('stationery') || categoryName.includes('文房具')) {
        factors.push({
          name: '新学期シーズン',
          impact: 20,
          weight: 0.3,
          description: '書籍・文房具の新学期需要',
        });
        score += 20;
      }
    }

    // Summer season (June-August)
    if ([5, 6, 7].includes(currentMonth)) {
      if (categoryName.includes('outdoor') || categoryName.includes('sports') ||
          categoryName.includes('アウトドア') || categoryName.includes('スポーツ')) {
        factors.push({
          name: '夏季シーズン',
          impact: 25,
          weight: 0.3,
          description: 'アウトドア・スポーツ商品の夏季需要',
        });
        score += 25;
      }
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      score: finalScore,
      confidence: 0.7, // Seasonal patterns are generally reliable
      factors,
      explanation: this.generateSeasonalityExplanation(finalScore, factors),
    };
  }

  // Helper methods
  private calculateOverallScore(dimensions: any): number {
    let overallScore = 0;
    
    for (const [dimension, weight] of Object.entries(this.scoringWeights)) {
      const dimensionScore = dimensions[dimension]?.score || 50;
      const dimensionConfidence = dimensions[dimension]?.confidence || 0.5;
      
      // Weight by confidence
      const weightedScore = dimensionScore * dimensionConfidence;
      overallScore += weightedScore * weight;
    }
    
    return Math.round(Math.max(0, Math.min(100, overallScore)));
  }

  // ... [Additional helper methods would be implemented here]

  private getFallbackScore(product: KeepaProduct): AiProductScore {
    return {
      asin: product.asin,
      overallScore: 50,
      dimensions: {
        profitability: { score: 50, confidence: 0.3, factors: [], explanation: 'データ不足' },
        demand: { score: 50, confidence: 0.3, factors: [], explanation: 'データ不足' },
        competition: { score: 50, confidence: 0.3, factors: [], explanation: 'データ不足' },
        risk: { score: 50, confidence: 0.3, factors: [], explanation: 'データ不足' },
        trend: { score: 50, confidence: 0.3, factors: [], explanation: 'データ不足' },
        seasonality: { score: 50, confidence: 0.3, factors: [], explanation: 'データ不足' },
      },
      metadata: {
        confidence: 0.3,
        modelVersion: this.MODEL_VERSION,
        lastUpdated: new Date(),
        dataQuality: 'low',
      },
      insights: [{
        type: 'warning',
        severity: 'medium',
        message: 'データが不十分なため詳細な分析ができません',
        evidence: ['商品データの不足'],
        actionable: false,
      }],
      recommendations: [{
        action: 'research',
        priority: 'medium',
        reasoning: 'より多くのデータが必要です',
        confidence: 0.3,
      }],
    };
  }

  // Placeholder implementations for helper methods
  private getCategoryProfitabilityScore(categories: any[]): number { return 0; }
  private getCategoryDemandScore(categories: any[]): number { return 0; }
  private getCategoryCompetitionScore(categories: any[]): number { return 0; }
  private getCategoryRiskScore(categories: any[]): number { return 0; }
  private getSeasonalDemandScore(product: KeepaProduct): number { return 0; }
  private getSeasonalTrendScore(product: KeepaProduct): number { return 0; }
  private estimateSellerCount(product: KeepaProduct): number { return 5; }
  private assessBrandStrength(brand?: string): 'strong' | 'medium' | 'weak' { return 'medium'; }
  private assessBrandRisk(brand?: string): number { return 0; }
  private calculateDimensionConfidence(factors: any[], product: KeepaProduct): number { return 0.7; }
  private assessDataQuality(product: KeepaProduct, analysis?: any): 'high' | 'medium' | 'low' { return 'medium'; }
  private calculateConfidence(product: KeepaProduct, dimensions: any, dataQuality: string): number { return 0.7; }
  
  // Explanation generators
  private generateProfitabilityExplanation(score: number, factors: any[]): string { return `利益性スコア: ${score}`; }
  private generateDemandExplanation(score: number, factors: any[], salesRank: number, reviewCount: number): string { return `需要スコア: ${score}`; }
  private generateCompetitionExplanation(score: number, factors: any[], sellers: number): string { return `競合スコア: ${score}`; }
  private generateRiskExplanation(score: number, factors: any[]): string { return `リスクスコア: ${score}`; }
  private generateTrendExplanation(score: number, factors: any[]): string { return `トレンドスコア: ${score}`; }
  private generateSeasonalityExplanation(score: number, factors: any[]): string { return `季節性スコア: ${score}`; }
  
  private generateInsights(product: KeepaProduct, dimensions: any, analysis?: any): AiInsight[] { return []; }
  private generateRecommendations(product: KeepaProduct, dimensions: any, overallScore: number): AiRecommendation[] { return []; }
}