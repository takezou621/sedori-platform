import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductScoringAiService, AiProductScore } from '../product-scoring.ai';
import { KeepaApiService } from '../../external-apis/keepa-api.service';
import { MlScoringService } from '../ml-scoring.service';
import { KeepaProduct } from '../../external-apis/interfaces/keepa-data.interface';

export interface AutonomousDiscoveryConfig {
  enabled: boolean;
  minProfitScore: number;
  maxRiskScore: number;
  minDemandScore: number;
  scanIntervalHours: number;
  maxProductsPerScan: number;
  categories: string[];
  priceRanges: { min: number; max: number }[];
}

export interface DiscoveryResult {
  id: string;
  asin: string;
  productTitle: string;
  currentPrice: number;
  estimatedProfit: number;
  aiScore: AiProductScore;
  discoveredAt: Date;
  confidence: number;
  reasoning: string;
  actionRequired: 'immediate_buy' | 'research_further' | 'monitor' | 'ignore';
}

export interface DiscoverySession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'error';
  productsScanned: number;
  opportunitiesFound: number;
  results: DiscoveryResult[];
  performance: {
    scanRate: number; // products per minute
    successRate: number; // valid products / total scanned
    averageScore: number;
  };
}

@Injectable()
export class AutonomousDiscoveryService {
  private readonly logger = new Logger(AutonomousDiscoveryService.name);
  private isRunning = false;
  private currentSession: DiscoverySession | null = null;
  private discoveryHistory: DiscoverySession[] = [];
  
  private readonly defaultConfig: AutonomousDiscoveryConfig = {
    enabled: true,
    minProfitScore: 70,
    maxRiskScore: 40,
    minDemandScore: 60,
    scanIntervalHours: 2,
    maxProductsPerScan: 1000,
    categories: [
      'Electronics',
      'Home & Kitchen', 
      'Sports & Outdoors',
      'Tools & Home Improvement',
      'Toys & Games',
      'Health & Personal Care'
    ],
    priceRanges: [
      { min: 1000, max: 5000 },   // ¥10-50
      { min: 5000, max: 20000 },  // ¥50-200
      { min: 20000, max: 50000 }, // ¥200-500
    ]
  };

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    private readonly productScoringService: ProductScoringAiService,
    private readonly keepaService: KeepaApiService,
    private readonly mlScoringService: MlScoringService,
  ) {
    this.initializeDiscoverySystem();
  }

  private async initializeDiscoverySystem() {
    this.logger.log('🤖 Autonomous Product Discovery System initializing...');
    
    // Load configuration
    const config = await this.loadDiscoveryConfig();
    
    // Start initial discovery if enabled
    if (config.enabled) {
      this.logger.log('🚀 Autonomous discovery enabled - system is active');
      // Run initial scan after 5 minutes
      setTimeout(() => {
        this.runDiscoverySession();
      }, 5 * 60 * 1000);
    } else {
      this.logger.log('⏸️  Autonomous discovery disabled in configuration');
    }
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async scheduledDiscoveryRun() {
    const config = await this.loadDiscoveryConfig();
    if (config.enabled && !this.isRunning) {
      this.logger.log('⏰ Running scheduled autonomous discovery scan');
      await this.runDiscoverySession();
    }
  }

  async runDiscoverySession(): Promise<DiscoverySession> {
    if (this.isRunning) {
      throw new Error('Discovery session already running');
    }

    this.isRunning = true;
    const sessionId = `discovery_${Date.now()}`;
    const startTime = new Date();

    this.currentSession = {
      sessionId,
      startTime,
      status: 'running',
      productsScanned: 0,
      opportunitiesFound: 0,
      results: [],
      performance: {
        scanRate: 0,
        successRate: 0,
        averageScore: 0,
      }
    };

    this.logger.log(`🔍 Starting autonomous discovery session: ${sessionId}`);

    try {
      const config = await this.loadDiscoveryConfig();
      const discoveries: DiscoveryResult[] = [];

      let totalScanned = 0;
      let totalValidProducts = 0;
      let totalScore = 0;

      // Multi-phase discovery approach
      for (const category of config.categories) {
        if (totalScanned >= config.maxProductsPerScan) break;

        for (const priceRange of config.priceRanges) {
          if (totalScanned >= config.maxProductsPerScan) break;

          this.logger.debug(`🎯 Scanning category: ${category}, price range: ¥${priceRange.min/100}-¥${priceRange.max/100}`);

          // Phase 1: Pattern-based discovery
          const patternResults = await this.discoverByPatterns(category, priceRange, Math.min(100, config.maxProductsPerScan - totalScanned));
          
          // Phase 2: Trend-based discovery  
          const trendResults = await this.discoverByTrends(category, priceRange, Math.min(50, config.maxProductsPerScan - totalScanned));

          // Phase 3: Competition gap discovery
          const gapResults = await this.discoverByCompetitionGaps(category, priceRange, Math.min(50, config.maxProductsPerScan - totalScanned));

          const phaseResults = [...patternResults, ...trendResults, ...gapResults];
          
          for (const product of phaseResults) {
            if (totalScanned >= config.maxProductsPerScan) break;

            totalScanned++;
            this.currentSession.productsScanned = totalScanned;

            try {
              const score = await this.productScoringService.scoreProduct(product);
              totalScore += score.overallScore;

              // Apply discovery filters
              if (this.meetsDiscoveryThresholds(score, config)) {
                const discovery = await this.createDiscoveryResult(product, score);
                discoveries.push(discovery);
                totalValidProducts++;
                
                this.logger.log(`💎 Opportunity discovered: ${product.title} (Score: ${score.overallScore})`);
              }
            } catch (error) {
              this.logger.warn(`Failed to process product ${product.asin}:`, error);
            }
          }
        }
      }

      // Calculate performance metrics
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
      
      this.currentSession.endTime = endTime;
      this.currentSession.status = 'completed';
      this.currentSession.opportunitiesFound = discoveries.length;
      this.currentSession.results = discoveries;
      this.currentSession.performance = {
        scanRate: totalScanned / duration,
        successRate: totalValidProducts / totalScanned,
        averageScore: totalScore / totalScanned,
      };

      // Cache and store results
      await this.storeDiscoveryResults(this.currentSession);

      this.logger.log(`✅ Discovery session completed: ${discoveries.length} opportunities found from ${totalScanned} products scanned`);

      // Add to history
      this.discoveryHistory.push({ ...this.currentSession });
      if (this.discoveryHistory.length > 10) {
        this.discoveryHistory.shift(); // Keep only last 10 sessions
      }

      return this.currentSession;

    } catch (error) {
      this.logger.error('❌ Discovery session failed:', error);
      
      if (this.currentSession) {
        this.currentSession.status = 'error';
        this.currentSession.endTime = new Date();
      }
      
      throw error;
    } finally {
      this.isRunning = false;
      this.currentSession = null;
    }
  }

  private async discoverByPatterns(category: string, priceRange: { min: number; max: number }, limit: number): Promise<KeepaProduct[]> {
    // Simulate pattern-based discovery using historical success patterns
    this.logger.debug(`🧩 Pattern-based discovery for ${category}`);
    
    try {
      // This would use ML models to identify successful product patterns
      // For now, we'll use Keepa's category search with intelligent filters
      const products = await this.keepaService.searchProducts(
        '', // Empty term to get category-based results
        undefined, // Category parameter (simplified for now)
        0, // page
        Math.min(limit, 20) // perpage (max 20 for Keepa)
      );

      return products.filter(product => {
        // Pattern matching logic
        const salesRank = product.stats?.current?.[3] || 999999;
        const rating = product.stats?.rating || 0;
        const reviewCount = product.stats?.reviewCount || 0;
        
        // Look for products with good fundamentals but potential for arbitrage
        return salesRank < 100000 && rating >= 4.0 && reviewCount >= 20;
      });
    } catch (error) {
      this.logger.warn(`Pattern discovery failed for ${category}:`, error);
      return [];
    }
  }

  private async discoverByTrends(category: string, priceRange: { min: number; max: number }, limit: number): Promise<KeepaProduct[]> {
    // Simulate trend-based discovery
    this.logger.debug(`📈 Trend-based discovery for ${category}`);
    
    try {
      // This would analyze trending products and emerging categories
      const products = await this.keepaService.searchProducts(
        '', // Empty term to get category-based results
        undefined, // Category parameter (simplified for now)
        0, // page
        Math.min(limit, 20) // perpage (max 20 for Keepa)
      );

      return products.filter(product => {
        const salesRankDrops = product.stats?.salesRankDrops30 || 0;
        return salesRankDrops > 5; // Products with positive momentum
      });
    } catch (error) {
      this.logger.warn(`Trend discovery failed for ${category}:`, error);
      return [];
    }
  }

  private async discoverByCompetitionGaps(category: string, priceRange: { min: number; max: number }, limit: number): Promise<KeepaProduct[]> {
    // Simulate competition gap analysis
    this.logger.debug(`🎯 Competition gap discovery for ${category}`);
    
    try {
      // Look for products with low competition but good demand
      const products = await this.keepaService.searchProducts(
        '', // Empty term to get category-based results
        undefined, // Category parameter (simplified for now)
        0, // page
        Math.min(limit, 20) // perpage (max 20 for Keepa)
      );

      return products.filter(product => {
        // Estimate low competition based on price stability and review patterns
        const amazonPrice = product.stats?.current?.[0] || 0;
        const rating = product.stats?.rating || 0;
        
        // No direct Amazon competition and good ratings suggest arbitrage potential
        return amazonPrice === 0 && rating >= 4.0;
      });
    } catch (error) {
      this.logger.warn(`Competition gap discovery failed for ${category}:`, error);
      return [];
    }
  }

  private meetsDiscoveryThresholds(score: AiProductScore, config: AutonomousDiscoveryConfig): boolean {
    return (
      score.overallScore >= config.minProfitScore &&
      score.dimensions.risk.score <= config.maxRiskScore &&
      score.dimensions.demand.score >= config.minDemandScore &&
      score.metadata.confidence >= 0.6 // Minimum confidence threshold
    );
  }

  private async createDiscoveryResult(product: KeepaProduct, score: AiProductScore): Promise<DiscoveryResult> {
    const currentPrice = (product.stats?.current?.[1] || 0) / 100; // Third party price
    const estimatedProfit = this.calculateEstimatedProfit(product, score);
    
    let actionRequired: DiscoveryResult['actionRequired'] = 'monitor';
    
    if (score.overallScore >= 85 && score.dimensions.risk.score <= 30) {
      actionRequired = 'immediate_buy';
    } else if (score.overallScore >= 75) {
      actionRequired = 'research_further';
    } else if (score.overallScore >= 65) {
      actionRequired = 'monitor';
    } else {
      actionRequired = 'ignore';
    }

    return {
      id: `disc_${Date.now()}_${product.asin}`,
      asin: product.asin,
      productTitle: product.title || 'Unknown Product',
      currentPrice,
      estimatedProfit,
      aiScore: score,
      discoveredAt: new Date(),
      confidence: score.metadata.confidence,
      reasoning: this.generateDiscoveryReasoning(score, estimatedProfit),
      actionRequired,
    };
  }

  private calculateEstimatedProfit(product: KeepaProduct, score: AiProductScore): number {
    // Simplified profit calculation
    const currentPrice = (product.stats?.current?.[1] || 0) / 100;
    const amazonPrice = (product.stats?.current?.[0] || 0) / 100;
    
    if (amazonPrice > 0 && currentPrice > 0) {
      return Math.max(0, amazonPrice - currentPrice - (currentPrice * 0.15)); // 15% for fees/shipping
    }
    
    // Estimate based on scoring
    const profitabilityFactor = score.dimensions.profitability.score / 100;
    return currentPrice * profitabilityFactor * 0.2; // Conservative estimate
  }

  private generateDiscoveryReasoning(score: AiProductScore, profit: number): string {
    const reasons = [];
    
    if (score.dimensions.profitability.score >= 80) {
      reasons.push('高利益ポテンシャル');
    }
    if (score.dimensions.demand.score >= 80) {
      reasons.push('高需要商品');
    }
    if (score.dimensions.competition.score >= 70) {
      reasons.push('競合少数');
    }
    if (score.dimensions.risk.score <= 30) {
      reasons.push('低リスク');
    }
    if (profit > 1000) {
      reasons.push(`推定利益¥${profit.toLocaleString()}`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'AI分析により発見';
  }

  private async loadDiscoveryConfig(): Promise<AutonomousDiscoveryConfig> {
    try {
      const cached = await this.redis.get('autonomous_discovery_config');
      if (cached) {
        return { ...this.defaultConfig, ...JSON.parse(cached) };
      }
    } catch (error) {
      this.logger.warn('Failed to load discovery config from cache:', error);
    }
    return this.defaultConfig;
  }

  private async storeDiscoveryResults(session: DiscoverySession): Promise<void> {
    try {
      const key = `discovery_session:${session.sessionId}`;
      await this.redis.setex(key, 86400 * 7, JSON.stringify(session)); // Store for 7 days
      
      // Store latest results for quick access
      await this.redis.setex('latest_discovery_results', 3600, JSON.stringify(session.results));
      
      this.logger.debug(`Discovery results stored: ${key}`);
    } catch (error) {
      this.logger.error('Failed to store discovery results:', error);
    }
  }

  // Public API methods
  async getCurrentSession(): Promise<DiscoverySession | null> {
    return this.currentSession;
  }

  async getDiscoveryHistory(): Promise<DiscoverySession[]> {
    return this.discoveryHistory;
  }

  async getLatestResults(): Promise<DiscoveryResult[]> {
    try {
      const cached = await this.redis.get('latest_discovery_results');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      this.logger.warn('Failed to get latest results:', error);
      return [];
    }
  }

  async updateDiscoveryConfig(config: Partial<AutonomousDiscoveryConfig>): Promise<void> {
    const currentConfig = await this.loadDiscoveryConfig();
    const updatedConfig = { ...currentConfig, ...config };
    
    await this.redis.setex('autonomous_discovery_config', 86400 * 30, JSON.stringify(updatedConfig));
    this.logger.log('Discovery configuration updated');
  }

  async manualDiscoveryTrigger(options?: {
    category?: string;
    priceRange?: { min: number; max: number };
    maxProducts?: number;
  }): Promise<DiscoverySession> {
    this.logger.log('🚀 Manual discovery session triggered');
    
    if (options) {
      // Temporarily override config for this session
      const tempConfig = await this.loadDiscoveryConfig();
      if (options.category) {
        tempConfig.categories = [options.category];
      }
      if (options.priceRange) {
        tempConfig.priceRanges = [options.priceRange];
      }
      if (options.maxProducts) {
        tempConfig.maxProductsPerScan = options.maxProducts;
      }
      
      await this.redis.setex('temp_discovery_config', 300, JSON.stringify(tempConfig)); // 5 minutes
    }
    
    return await this.runDiscoverySession();
  }

  isDiscoveryRunning(): boolean {
    return this.isRunning;
  }

  getDiscoveryStats(): {
    totalSessions: number;
    totalProductsScanned: number;
    totalOpportunitiesFound: number;
    averageSuccessRate: number;
    lastRunTime?: Date;
  } {
    const totalSessions = this.discoveryHistory.length;
    const totalProductsScanned = this.discoveryHistory.reduce((sum, session) => sum + session.productsScanned, 0);
    const totalOpportunitiesFound = this.discoveryHistory.reduce((sum, session) => sum + session.opportunitiesFound, 0);
    const averageSuccessRate = this.discoveryHistory.length > 0 
      ? this.discoveryHistory.reduce((sum, session) => sum + session.performance.successRate, 0) / this.discoveryHistory.length
      : 0;
    const lastRunTime = this.discoveryHistory.length > 0 ? this.discoveryHistory[this.discoveryHistory.length - 1].endTime : undefined;

    return {
      totalSessions,
      totalProductsScanned,
      totalOpportunitiesFound,
      averageSuccessRate,
      lastRunTime,
    };
  }
}