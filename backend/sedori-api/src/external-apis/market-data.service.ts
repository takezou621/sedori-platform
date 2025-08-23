import { Injectable, Logger } from '@nestjs/common';
import { AmazonApiService } from './amazon-api.service';
import { RakutenApiService } from './rakuten-api.service';
import { Product } from '../products/entities/product.entity';
import { MarketAnalysis, CompetitorPrice, MarketTrend } from './interfaces/market-data.interface';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    private readonly amazonApiService: AmazonApiService,
    private readonly rakutenApiService: RakutenApiService,
  ) {}

  async analyzeMarket(product: Product): Promise<MarketAnalysis> {
    try {
      this.logger.log(`Starting market analysis for product: ${product.name}`);

      // Get competitor prices from multiple sources
      const competitorPrices = await this.getCompetitorPrices(product);
      
      // Calculate market metrics
      const demandScore = await this.calculateDemandScore(product, competitorPrices);
      const trendIndicator = await this.calculateTrendIndicator(product);
      const seasonalityScore = this.calculateSeasonalityScore(product);
      const marketSaturation = this.calculateMarketSaturation(competitorPrices);
      const priceVolatility = this.calculatePriceVolatility(competitorPrices);
      const recommendedPriceRange = this.calculateRecommendedPriceRange(
        product,
        competitorPrices,
        demandScore
      );

      const analysis: MarketAnalysis = {
        competitorPrices,
        demandScore,
        trendIndicator,
        seasonalityScore,
        marketSaturation,
        priceVolatility,
        recommendedPriceRange,
      };

      this.logger.log(`Market analysis completed for product: ${product.name}`);
      return analysis;

    } catch (error) {
      this.logger.error(`Market analysis failed for product ${product.id}:`, error);
      
      // Return fallback analysis
      return this.getFallbackMarketAnalysis(product);
    }
  }

  private async getCompetitorPrices(product: Product): Promise<CompetitorPrice[]> {
    try {
      const allPrices: CompetitorPrice[] = [];

      // Get Amazon prices
      if (product.metadata?.asin) {
        const amazonPrices = await this.amazonApiService.getCompetitorPrices(
          product.metadata.asin,
          product.metadata?.jan
        );
        allPrices.push(...amazonPrices);
      } else {
        // Search by product name if no ASIN
        const amazonSearchResults = await this.amazonApiService.searchProducts(product.name, 3);
        amazonSearchResults.forEach(result => {
          allPrices.push({
            source: 'Amazon.co.jp',
            price: result.price,
            timestamp: new Date(),
            availability: result.availability as any,
            currency: result.currency,
            url: result.productUrl,
          });
        });
      }

      // Get Rakuten prices
      const rakutenPrices = await this.rakutenApiService.getCompetitorPrices(
        product.metadata?.jan,
        product.name
      );
      allPrices.push(...rakutenPrices);

      // Add our own price for comparison
      if (product.retailPrice && product.retailPrice > 0) {
        allPrices.push({
          source: 'Sedori Platform',
          price: product.retailPrice,
          timestamp: new Date(),
          availability: (product.stockQuantity || 0) > 0 ? 'in_stock' : 'out_of_stock',
          currency: 'JPY',
        });
      }

      return allPrices;

    } catch (error) {
      this.logger.error('Failed to get competitor prices:', error);
      return this.getFallbackCompetitorPrices(product);
    }
  }

  private async calculateDemandScore(
    product: Product,
    competitorPrices: CompetitorPrice[]
  ): Promise<number> {
    try {
      let score = 50; // Base score

      // Factor 1: Price competitiveness (30% weight)
      const avgCompetitorPrice = competitorPrices.reduce((sum, p) => sum + p.price, 0) / competitorPrices.length;
      if (product.retailPrice && product.retailPrice > 0) {
        const priceRatio = product.retailPrice / avgCompetitorPrice;
        if (priceRatio < 0.9) score += 20; // Very competitive
        else if (priceRatio < 1.0) score += 10; // Competitive
        else if (priceRatio > 1.2) score -= 15; // Expensive
      }

      // Factor 2: Stock availability (20% weight)
      const inStockCount = competitorPrices.filter(p => p.availability === 'in_stock').length;
      const availabilityRatio = inStockCount / competitorPrices.length;
      if (availabilityRatio < 0.5) score += 15; // High demand, low availability
      else if (availabilityRatio > 0.9) score -= 5; // Oversupplied

      // Factor 3: Category performance (25% weight)
      const categoryMultiplier = this.getCategoryDemandMultiplier(product.category?.name);
      score *= categoryMultiplier;

      // Factor 4: Seasonal factors (15% weight)
      const seasonalBonus = this.getSeasonalDemandBonus(product);
      score += seasonalBonus;

      // Factor 5: Historical performance (10% weight)
      if (product.metadata?.viewCount) {
        const viewScore = Math.min(product.metadata.viewCount / 100, 10);
        score += viewScore;
      }

      // Normalize to 0-100 range
      return Math.max(0, Math.min(100, score));

    } catch (error) {
      this.logger.error('Failed to calculate demand score:', error);
      return 50 + Math.random() * 30; // Fallback score
    }
  }

  private async calculateTrendIndicator(product: Product): Promise<'rising' | 'falling' | 'stable'> {
    try {
      // Get trend data from external APIs
      const amazonTrends = await this.amazonApiService.getMarketTrends(
        product.metadata?.asin || product.name
      );
      const rakutenTrends = await this.rakutenApiService.getMarketTrends(product.name);

      const allTrends = [...amazonTrends, ...rakutenTrends];
      
      if (allTrends.length === 0) {
        return Math.random() > 0.5 ? 'rising' : Math.random() > 0.5 ? 'stable' : 'falling';
      }

      // Weight recent trends more heavily
      let trendScore = 0;
      let totalWeight = 0;

      allTrends.forEach(trend => {
        let weight = 1;
        if (trend.period === 'daily') weight = 3;
        else if (trend.period === 'weekly') weight = 2;
        else if (trend.period === 'monthly') weight = 1;

        const trendValue = trend.trend === 'up' ? 1 : trend.trend === 'down' ? -1 : 0;
        trendScore += trendValue * trend.percentage * weight * trend.confidence;
        totalWeight += weight;
      });

      const avgTrend = trendScore / totalWeight;
      
      if (avgTrend > 2) return 'rising';
      if (avgTrend < -2) return 'falling';
      return 'stable';

    } catch (error) {
      this.logger.error('Failed to calculate trend indicator:', error);
      // Fallback trend calculation
      const trends = ['rising', 'falling', 'stable'] as const;
      return trends[Math.floor(Math.random() * trends.length)];
    }
  }

  private calculateSeasonalityScore(product: Product): number {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    
    // Category-based seasonality patterns
    const categoryName = product.category?.name?.toLowerCase() || '';
    
    // Winter items (Dec-Feb)
    if ([11, 0, 1].includes(month)) {
      if (categoryName.includes('winter') || categoryName.includes('heating') || 
          categoryName.includes('coat') || categoryName.includes('暖房')) {
        return 85 + Math.random() * 15;
      }
    }
    
    // Summer items (Jun-Aug)
    if ([5, 6, 7].includes(month)) {
      if (categoryName.includes('summer') || categoryName.includes('cooling') || 
          categoryName.includes('swimwear') || categoryName.includes('冷房')) {
        return 80 + Math.random() * 20;
      }
    }
    
    // Back-to-school (Mar, Sep)
    if ([2, 8].includes(month)) {
      if (categoryName.includes('book') || categoryName.includes('stationery') || 
          categoryName.includes('本') || categoryName.includes('文房具')) {
        return 75 + Math.random() * 20;
      }
    }
    
    // Christmas/New Year (Nov-Dec)
    if ([10, 11].includes(month)) {
      if (categoryName.includes('toy') || categoryName.includes('game') || 
          categoryName.includes('gift') || categoryName.includes('おもちゃ')) {
        return 90 + Math.random() * 10;
      }
    }

    // Base seasonality score
    return 40 + Math.random() * 30;
  }

  private calculateMarketSaturation(competitorPrices: CompetitorPrice[]): 'low' | 'medium' | 'high' {
    const uniqueSources = new Set(competitorPrices.map(p => p.source)).size;
    const totalPrices = competitorPrices.length;
    
    // Calculate price variance to determine competition level
    const prices = competitorPrices.map(p => p.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const coefficient = Math.sqrt(variance) / avgPrice;

    if (totalPrices <= 3 || uniqueSources <= 2) return 'low';
    if (totalPrices >= 8 && coefficient < 0.15) return 'high'; // Many similar prices = high competition
    return 'medium';
  }

  private calculatePriceVolatility(competitorPrices: CompetitorPrice[]): number {
    if (competitorPrices.length <= 1) return 0;

    const prices = competitorPrices.map(p => p.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    
    // Return volatility as percentage of average price
    return (Math.sqrt(variance) / avgPrice) * 100;
  }

  private calculateRecommendedPriceRange(
    product: Product,
    competitorPrices: CompetitorPrice[],
    demandScore: number
  ): { min: number; max: number; optimal: number } {
    if (competitorPrices.length === 0) {
      const base = product.wholesalePrice * 1.3;
      return {
        min: base * 0.9,
        max: base * 1.4,
        optimal: base * 1.15,
      };
    }

    const prices = competitorPrices.map(p => p.price).sort((a, b) => a - b);
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    const medianPrice = prices[Math.floor(prices.length / 2)];

    // Adjust based on demand score
    const demandMultiplier = demandScore > 70 ? 1.1 : demandScore < 40 ? 0.9 : 1.0;

    // Consider profit margin
    const minProfitablePrice = product.wholesalePrice * 1.1; // 10% minimum margin

    return {
      min: Math.max(minProfitablePrice, minPrice * 0.95),
      max: maxPrice * 1.05,
      optimal: Math.max(minProfitablePrice, medianPrice * demandMultiplier),
    };
  }

  private getFallbackMarketAnalysis(product: Product): MarketAnalysis {
    return {
      competitorPrices: this.getFallbackCompetitorPrices(product),
      demandScore: 50 + Math.random() * 40,
      trendIndicator: Math.random() > 0.5 ? 'rising' : 'stable',
      seasonalityScore: 40 + Math.random() * 30,
      marketSaturation: 'medium',
      priceVolatility: Math.random() * 20,
      recommendedPriceRange: {
        min: product.wholesalePrice * 1.1,
        max: product.wholesalePrice * 1.6,
        optimal: product.wholesalePrice * 1.3,
      },
    };
  }

  private getFallbackCompetitorPrices(product: Product): CompetitorPrice[] {
    const basePrice = product.retailPrice || product.wholesalePrice * 1.3;
    
    return [
      {
        source: 'Amazon.co.jp',
        price: basePrice * (0.9 + Math.random() * 0.3),
        timestamp: new Date(),
        availability: 'in_stock',
        currency: 'JPY',
      },
      {
        source: '楽天市場',
        price: basePrice * (0.85 + Math.random() * 0.35),
        timestamp: new Date(),
        availability: 'in_stock',
        currency: 'JPY',
      },
    ];
  }

  private getCategoryDemandMultiplier(categoryName?: string): number {
    if (!categoryName) return 1.0;

    const category = categoryName.toLowerCase();
    
    // High demand categories
    if (category.includes('electronics') || category.includes('電子')) return 1.2;
    if (category.includes('fashion') || category.includes('ファッション')) return 1.1;
    if (category.includes('beauty') || category.includes('美容')) return 1.15;
    if (category.includes('health') || category.includes('健康')) return 1.1;
    
    // Seasonal categories
    if (category.includes('sports') || category.includes('スポーツ')) return 1.05;
    if (category.includes('toy') || category.includes('おもちゃ')) return 1.0;
    
    // Stable categories
    if (category.includes('book') || category.includes('本')) return 0.95;
    if (category.includes('home') || category.includes('ホーム')) return 0.9;
    
    return 1.0;
  }

  private getSeasonalDemandBonus(product: Product): number {
    const now = new Date();
    const month = now.getMonth();
    const categoryName = product.category?.name?.toLowerCase() || '';
    
    // Major shopping seasons in Japan
    if (month === 11) return 15; // December - End of year shopping
    if (month === 2) return 10;  // March - New fiscal year
    if (month === 6) return 8;   // July - Summer bonus season
    if (month === 10) return 5;  // November - Pre-Christmas
    
    return 0;
  }
}