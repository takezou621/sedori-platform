import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { KeepaApiService } from '../../external-apis/keepa-api.service';
import { KeepaAiService } from '../../external-apis/keepa-ai.service';
import { MlScoringService } from '../ml-scoring.service';
import { NlpProcessorService, NlpSearchQuery } from '../nlp-processor.service';
import { KeepaProduct, KeepaAiInsights } from '../../external-apis/interfaces/keepa-data.interface';

export interface SmartSearchResult {
  products: EnhancedProduct[];
  searchMetadata: {
    originalQuery: string;
    parsedQuery: NlpSearchQuery;
    totalResults: number;
    processingTimeMs: number;
    suggestedRefinements: string[];
  };
  aiRecommendations: {
    topPicks: EnhancedProduct[];
    highPotential: EnhancedProduct[];
    safeChoices: EnhancedProduct[];
  };
}

export interface EnhancedProduct extends KeepaProduct {
  aiScore: number;
  mlScore: any; // ProductScore from MlScoringService
  aiInsights: KeepaAiInsights;
  searchRelevance: number;
  reasons: string[];
}

@Injectable()
export class SmartSearchService {
  private readonly logger = new Logger(SmartSearchService.name);
  private readonly SEARCH_CACHE_TTL = 1800; // 30 minutes

  constructor(
    private readonly keepaApiService: KeepaApiService,
    private readonly keepaAiService: KeepaAiService,
    private readonly mlScoringService: MlScoringService,
    private readonly nlpProcessorService: NlpProcessorService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async smartSearch(
    query: string,
    options: {
      maxResults?: number;
      includeAnalysis?: boolean;
      forceRefresh?: boolean;
    } = {},
  ): Promise<SmartSearchResult> {
    const startTime = Date.now();
    const cacheKey = `smart-search:${query}:${JSON.stringify(options)}`;

    try {
      // Check cache unless force refresh
      if (!options.forceRefresh) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit for smart search: "${query}"`);
          return JSON.parse(cached);
        }
      }

      this.logger.log(`Starting smart search: "${query}"`);

      // Parse natural language query
      const parsedQuery = await this.nlpProcessorService.parseSearchQuery(query);

      // Execute search based on parsed criteria
      const products = await this.executeSearch(parsedQuery, options.maxResults || 20);

      // Enhance products with AI analysis
      const enhancedProducts = await this.enhanceProducts(products, parsedQuery);

      // Generate AI recommendations
      const aiRecommendations = this.generateAiRecommendations(enhancedProducts);

      // Generate search refinement suggestions
      const suggestedRefinements = await this.generateRefinementSuggestions(parsedQuery, enhancedProducts);

      const result: SmartSearchResult = {
        products: enhancedProducts,
        searchMetadata: {
          originalQuery: query,
          parsedQuery,
          totalResults: enhancedProducts.length,
          processingTimeMs: Date.now() - startTime,
          suggestedRefinements,
        },
        aiRecommendations,
      };

      // Cache result
      await this.redis.setex(cacheKey, this.SEARCH_CACHE_TTL, JSON.stringify(result));

      this.logger.log(`Smart search completed: ${enhancedProducts.length} products in ${result.searchMetadata.processingTimeMs}ms`);
      return result;

    } catch (error) {
      this.logger.error(`Smart search failed for query: "${query}"`, error);
      throw error;
    }
  }

  async conversationalSearch(
    query: string,
    conversationHistory: string[] = [],
  ): Promise<SmartSearchResult & { conversationContext: string }> {
    try {
      this.logger.log(`Conversational search: "${query}"`);

      // Enhance query with conversation context
      const contextualQuery = this.buildContextualQuery(query, conversationHistory);

      // Perform smart search
      const result = await this.smartSearch(contextualQuery, { includeAnalysis: true });

      // Generate conversation context for next interaction
      const conversationContext = this.generateConversationContext(result, query);

      return {
        ...result,
        conversationContext,
      };

    } catch (error) {
      this.logger.error(`Conversational search failed: "${query}"`, error);
      throw error;
    }
  }

  async trendingProducts(options: {
    category?: string;
    timeframe?: 'daily' | 'weekly' | 'monthly';
    minScore?: number;
  } = {}): Promise<EnhancedProduct[]> {
    try {
      this.logger.log('Fetching trending products with AI analysis');

      // This would ideally integrate with trending data
      // For now, we'll simulate by searching for high-demand categories
      const trendingQuery = this.buildTrendingQuery(options);
      const result = await this.smartSearch(trendingQuery, { maxResults: 50 });

      // Filter and sort by trend indicators
      return result.products
        .filter(product => product.aiScore > (options.minScore || 70))
        .sort((a, b) => {
          const aTrend = this.calculateTrendScore(a);
          const bTrend = this.calculateTrendScore(b);
          return bTrend - aTrend;
        })
        .slice(0, 20);

    } catch (error) {
      this.logger.error('Failed to fetch trending products', error);
      throw error;
    }
  }

  // Private methods
  private async executeSearch(
    parsedQuery: NlpSearchQuery,
    maxResults: number,
  ): Promise<KeepaProduct[]> {
    const { extractedCriteria } = parsedQuery;
    let products: KeepaProduct[] = [];

    // Build search term from keywords and category
    const searchTerms = [
      ...(extractedCriteria.keywords || []),
      ...(extractedCriteria.category ? [extractedCriteria.category] : []),
    ].join(' ');

    if (searchTerms) {
      // Search with Keepa API
      products = await this.keepaApiService.searchProducts(
        searchTerms,
        undefined,
        0,
        Math.min(maxResults * 2, 50), // Get more results for filtering
      );
    }

    // Apply filters based on extracted criteria
    products = this.applySearchFilters(products, extractedCriteria);

    return products.slice(0, maxResults);
  }

  private applySearchFilters(products: KeepaProduct[], criteria: any): KeepaProduct[] {
    let filtered = products;

    // Price range filter
    if (criteria.priceRange) {
      filtered = filtered.filter(product => {
        const currentPrice = product.stats?.current?.[0] || 0;
        const priceInYen = currentPrice / 100;
        
        if (criteria.priceRange.min && priceInYen < criteria.priceRange.min) return false;
        if (criteria.priceRange.max && priceInYen > criteria.priceRange.max) return false;
        
        return true;
      });
    }

    // Sales rank filter
    if (criteria.salesRankMax) {
      filtered = filtered.filter(product => {
        const salesRank = product.stats?.current?.[3] || 999999;
        return salesRank <= criteria.salesRankMax;
      });
    }

    // Review count filter
    if (criteria.minReviews) {
      filtered = filtered.filter(product => {
        const reviewCount = product.stats?.reviewCount || 0;
        return reviewCount >= criteria.minReviews;
      });
    }

    // Rating filter
    if (criteria.minRating) {
      filtered = filtered.filter(product => {
        const rating = product.stats?.rating || 0;
        return rating >= criteria.minRating;
      });
    }

    return filtered;
  }

  private async enhanceProducts(
    products: KeepaProduct[],
    parsedQuery: NlpSearchQuery,
  ): Promise<EnhancedProduct[]> {
    const enhanced = await Promise.all(
      products.map(async (product) => {
        try {
          // Get AI insights
          const aiInsights = await this.keepaAiService.generateProductInsights(product.asin);

          // Get ML score
          const mlScore = await this.mlScoringService.scoreProduct(product);

          // Calculate search relevance
          const searchRelevance = this.calculateSearchRelevance(product, parsedQuery);

          // Generate reasons for recommendation
          const reasons = this.generateReasons(product, aiInsights, mlScore, parsedQuery);

          const enhancedProduct: EnhancedProduct = {
            ...product,
            aiScore: aiInsights.profitabilityScore,
            mlScore,
            aiInsights,
            searchRelevance,
            reasons,
          };

          return enhancedProduct;

        } catch (error) {
          this.logger.warn(`Failed to enhance product ${product.asin}:`, error);
          
          // Return basic enhanced product
          const fallbackInsights: KeepaAiInsights = {
            asin: product.asin,
            summary: '基本分析のみ利用可能',
            marketPosition: 'niche',
            competitiveness: 50,
            profitabilityScore: 50,
            riskScore: 50,
            demandIndicators: {
              salesRankTrend: 'stable',
              priceElasticity: 0.5,
              marketSaturation: 'medium',
            },
            strategicRecommendations: ['詳細なデータ収集が必要'],
            nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          };

          const fallbackMlScore = {
            overallScore: 50,
            profitabilityScore: 50,
            riskScore: 50,
            demandScore: 50,
            competitionScore: 50,
            trendScore: 50,
            confidenceLevel: 0.3,
            reasoning: ['基本分析のみ利用可能'],
            recommendations: [],
          };

          return {
            ...product,
            aiScore: 50,
            mlScore: fallbackMlScore,
            aiInsights: fallbackInsights,
            searchRelevance: 0.5,
            reasons: ['基本分析のみ利用可能'],
          };
        }
      }),
    );

    // Sort by combined score
    return enhanced.sort((a, b) => {
      const aScore = this.calculateCombinedScore(a);
      const bScore = this.calculateCombinedScore(b);
      return bScore - aScore;
    });
  }

  private calculateSearchRelevance(product: KeepaProduct, parsedQuery: NlpSearchQuery): number {
    let relevance = 0.5;

    const { extractedCriteria } = parsedQuery;
    const productText = `${product.title} ${product.brand} ${product.manufacturer}`.toLowerCase();

    // Keyword relevance
    if (extractedCriteria.keywords) {
      const matchedKeywords = extractedCriteria.keywords.filter(keyword =>
        productText.includes(keyword.toLowerCase())
      );
      relevance += (matchedKeywords.length / extractedCriteria.keywords.length) * 0.3;
    }

    // Category relevance
    if (extractedCriteria.category && product.categoryTree) {
      const categoryMatch = product.categoryTree.some(cat =>
        cat.name.toLowerCase().includes(extractedCriteria.category!.toLowerCase())
      );
      if (categoryMatch) relevance += 0.2;
    }

    // Price relevance (closer to target = higher relevance)
    if (extractedCriteria.priceRange) {
      const currentPrice = (product.stats?.current?.[0] || 0) / 100;
      if (extractedCriteria.priceRange.min && extractedCriteria.priceRange.max) {
        const targetPrice = (extractedCriteria.priceRange.min + extractedCriteria.priceRange.max) / 2;
        const priceDifference = Math.abs(currentPrice - targetPrice) / targetPrice;
        relevance += Math.max(0, (1 - priceDifference)) * 0.2;
      }
    }

    return Math.max(0, Math.min(1, relevance));
  }

  private generateReasons(
    product: KeepaProduct,
    aiInsights: KeepaAiInsights | null,
    mlScore: any,
    parsedQuery: NlpSearchQuery,
  ): string[] {
    const reasons: string[] = [];

    // Add ML-based reasons
    if (mlScore?.reasoning) {
      reasons.push(...mlScore.reasoning);
    }

    // Add AI insights reasons
    if (aiInsights) {
      if (aiInsights.profitabilityScore > 70) {
        reasons.push('AI分析により高い利益潜在性を確認');
      }
      if (aiInsights.riskScore < 30) {
        reasons.push('リスクレベルが低く安定した商品');
      }
      if (aiInsights.competitiveness > 70) {
        reasons.push('競合が少なく参入しやすい市場');
      }
    }

    // Add search-specific reasons
    const { extractedCriteria } = parsedQuery;
    if (extractedCriteria.priceRange) {
      const currentPrice = (product.stats?.current?.[0] || 0) / 100;
      if (currentPrice >= extractedCriteria.priceRange.min! && currentPrice <= extractedCriteria.priceRange.max!) {
        reasons.push('希望価格帯に合致');
      }
    }

    if (extractedCriteria.profitTarget) {
      reasons.push('利益目標達成の可能性が高い');
    }

    return reasons.slice(0, 3); // Limit to top 3 reasons
  }

  private calculateCombinedScore(product: EnhancedProduct): number {
    let score = 0;

    // AI score weight: 40%
    score += (product.aiScore || 50) * 0.4;

    // ML score weight: 30%
    score += (product.mlScore?.overallScore || 50) * 0.3;

    // Search relevance weight: 20%
    score += (product.searchRelevance || 0.5) * 100 * 0.2;

    // Sales rank boost: 10%
    const salesRank = product.stats?.current?.[3] || 999999;
    const salesRankScore = Math.max(0, 100 - Math.log10(salesRank) * 10);
    score += salesRankScore * 0.1;

    return score;
  }

  private generateAiRecommendations(products: EnhancedProduct[]): {
    topPicks: EnhancedProduct[];
    highPotential: EnhancedProduct[];
    safeChoices: EnhancedProduct[];
  } {
    const topPicks = products
      .filter(p => this.calculateCombinedScore(p) > 80)
      .slice(0, 5);

    const highPotential = products
      .filter(p => p.aiInsights?.profitabilityScore > 75 && p.aiInsights?.riskScore < 40)
      .slice(0, 5);

    const safeChoices = products
      .filter(p => p.aiInsights?.riskScore < 30 && p.mlScore?.overallScore > 60)
      .slice(0, 5);

    return { topPicks, highPotential, safeChoices };
  }

  private async generateRefinementSuggestions(
    parsedQuery: NlpSearchQuery,
    results: EnhancedProduct[],
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Suggest price range refinements
    if (!parsedQuery.extractedCriteria.priceRange && results.length > 0) {
      const prices = results.map(p => (p.stats?.current?.[0] || 0) / 100).sort((a, b) => a - b);
      const medianPrice = prices[Math.floor(prices.length / 2)];
      suggestions.push(`${Math.floor(medianPrice * 0.8)}円から${Math.floor(medianPrice * 1.2)}円の範囲で検索`);
    }

    // Suggest category refinements
    const categories = results
      .map(p => p.categoryTree?.[0]?.name)
      .filter((cat, index, arr) => cat && arr.indexOf(cat) === index)
      .slice(0, 3);
    
    categories.forEach(category => {
      suggestions.push(`${category}カテゴリに絞って検索`);
    });

    // Suggest risk level refinements
    if (!parsedQuery.extractedCriteria.riskLevel) {
      suggestions.push('低リスク商品のみで検索');
      suggestions.push('高利益・中リスク商品で検索');
    }

    return suggestions.slice(0, 5);
  }

  private buildContextualQuery(query: string, history: string[]): string {
    // Simple context building - in a real implementation, this would be more sophisticated
    const lastQuery = history[history.length - 1];
    if (lastQuery && !query.includes('カテゴリ') && lastQuery.includes('カテゴリ')) {
      // Preserve category context
      const categoryMatch = lastQuery.match(/(\w+)カテゴリ/);
      if (categoryMatch) {
        return `${query} ${categoryMatch[1]}カテゴリ`;
      }
    }
    return query;
  }

  private generateConversationContext(result: SmartSearchResult, query: string): string {
    const topProduct = result.products[0];
    const avgScore = result.products.reduce((sum, p) => sum + p.aiScore, 0) / result.products.length;
    
    return `最新検索: "${query}" - ${result.products.length}件の商品、平均AIスコア: ${avgScore.toFixed(1)}、トップ商品: ${topProduct?.title || 'なし'}`;
  }

  private buildTrendingQuery(options: any): string {
    const timeframe = options.timeframe || 'weekly';
    const category = options.category || '';
    
    return `${category} トレンド 人気 売れ筋 ${timeframe}`;
  }

  private calculateTrendScore(product: EnhancedProduct): number {
    let score = 50;

    // Sales rank trend (lower rank = higher trend)
    const salesRank = product.stats?.current?.[3] || 999999;
    if (salesRank < 1000) score += 30;
    else if (salesRank < 10000) score += 15;

    // Recent review activity
    const reviewCount = product.stats?.reviewCount || 0;
    if (reviewCount > 1000) score += 20;
    else if (reviewCount > 100) score += 10;

    // AI insights trending indicators
    if (product.aiInsights) {
      if (product.aiInsights.demandIndicators.salesRankTrend === 'improving') score += 25;
      if (product.aiInsights.marketPosition === 'leader') score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }
}