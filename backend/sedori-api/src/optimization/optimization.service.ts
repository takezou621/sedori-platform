import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OptimizationResult,
  OptimizationType,
  OptimizationStatus,
} from './entities/optimization-result.entity';
import { Product } from '../products/entities/product.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  OptimizationRequestDto,
  OptimizationResponseDto,
  PaginatedOptimizationResult,
} from './dto';

@Injectable()
export class OptimizationService {
  constructor(
    @InjectRepository(OptimizationResult)
    private readonly optimizationRepository: Repository<OptimizationResult>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async requestOptimization(
    userId: string,
    optimizationRequestDto: OptimizationRequestDto,
  ): Promise<OptimizationResponseDto> {
    const { productId, type, metadata } = optimizationRequestDto;

    // Verify product exists
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('商品が見つかりません');
    }

    // Check if there's already a pending/processing optimization for this product
    const existingOptimization = await this.optimizationRepository.findOne({
      where: {
        userId,
        productId,
        type,
        status: OptimizationStatus.PROCESSING,
      },
    });

    if (existingOptimization) {
      throw new BadRequestException('この商品の最適化が既に実行中です');
    }

    // Create optimization request
    const optimization = this.optimizationRepository.create({
      userId,
      productId,
      type,
      status: OptimizationStatus.PENDING,
      currentPrice: product.wholesalePrice,
      currentProfit: this.calculateCurrentProfit(product),
      currentInventory: product.stockQuantity,
      currentMarginPercentage: this.calculateMarginPercentage(product),
      metadata,
    });

    const savedOptimization = await this.optimizationRepository.save(optimization);

    // Start optimization process (async)
    this.processOptimization(savedOptimization.id).catch((error) => {
      console.error(`Optimization processing failed for ${savedOptimization.id}:`, error);
    });

    return this.mapToResponse(savedOptimization);
  }

  async getOptimizationResults(
    userId: string,
    page = 1,
    limit = 20,
    type?: OptimizationType,
  ): Promise<PaginatedOptimizationResult> {
    const queryBuilder = this.optimizationRepository.createQueryBuilder('optimization');
    queryBuilder.leftJoinAndSelect('optimization.product', 'product');
    queryBuilder.where('optimization.userId = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('optimization.type = :type', { type });
    }

    queryBuilder.orderBy('optimization.createdAt', 'DESC');

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(this.mapToResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getOptimizationById(
    userId: string,
    optimizationId: string,
  ): Promise<OptimizationResponseDto> {
    const optimization = await this.optimizationRepository.findOne({
      where: { id: optimizationId, userId },
      relations: ['product'],
    });

    if (!optimization) {
      throw new NotFoundException('最適化結果が見つかりません');
    }

    return this.mapToResponse(optimization);
  }

  private async processOptimization(optimizationId: string): Promise<void> {
    const optimization = await this.optimizationRepository.findOne({
      where: { id: optimizationId },
      relations: ['product'],
    });

    if (!optimization) {
      return;
    }

    try {
      // Update status to processing
      await this.optimizationRepository.update(optimizationId, {
        status: OptimizationStatus.PROCESSING,
      });

      // Perform optimization based on type
      const optimizedResults = await this.performOptimization(optimization);

      // Update with results
      await this.optimizationRepository.update(optimizationId, {
        status: OptimizationStatus.COMPLETED,
        ...optimizedResults,
      });
    } catch (error) {
      await this.optimizationRepository.update(optimizationId, {
        status: OptimizationStatus.FAILED,
        metadata: JSON.stringify({
          error: error.message,
          timestamp: new Date().toISOString(),
        }) as any,
      });
    }
  }

  private async performOptimization(optimization: OptimizationResult): Promise<Partial<OptimizationResult>> {
    const { type, product } = optimization;

    switch (type) {
      case OptimizationType.PRICE:
        return this.optimizePrice(product);
      case OptimizationType.INVENTORY:
        return this.optimizeInventory(product);
      case OptimizationType.PROFIT:
        return this.optimizeProfit(product);
      case OptimizationType.MARKET_TIMING:
        return this.optimizeMarketTiming(product);
      default:
        throw new Error(`Unsupported optimization type: ${type}`);
    }
  }

  private async optimizePrice(product: Product): Promise<Partial<OptimizationResult>> {
    // Simulate market analysis (in real implementation, this would call external APIs)
    const marketAnalysis = await this.analyzeMarket(product);
    
    // Calculate optimal price based on market conditions
    const currentPrice = product.wholesalePrice;
    const marketTrendMultiplier = marketAnalysis.marketTrend === 'rising' ? 1.05 : 
                                 marketAnalysis.marketTrend === 'falling' ? 0.95 : 1.0;
    
    const competitorAvgPrice = marketAnalysis.competitorPrices.reduce((sum, comp) => sum + comp.price, 0) / 
                              marketAnalysis.competitorPrices.length;
    
    const recommendedPrice = Math.max(
      currentPrice * 0.9, // Never go below 90% of current price
      Math.min(
        currentPrice * 1.2, // Never go above 120% of current price
        competitorAvgPrice * marketTrendMultiplier * (1 - marketAnalysis.priceElasticity * 0.1)
      )
    );

    const projectedProfit = (recommendedPrice - product.wholesalePrice) * (product.stockQuantity || 0);
    const projectedMarginPercentage = ((recommendedPrice - product.wholesalePrice) / recommendedPrice) * 100;

    return {
      recommendedPrice: Math.round(recommendedPrice * 100) / 100,
      projectedProfit: Math.round(projectedProfit * 100) / 100,
      projectedMarginPercentage: Math.round(projectedMarginPercentage * 100) / 100,
      marketAnalysis,
      optimizationInsights: {
        reason: `市場トレンド${marketAnalysis.marketTrend}を考慮した価格最適化`,
        confidence: marketAnalysis.demandScore * 0.8,
        potentialImpact: `利益最適化による改善予想`,
        riskFactors: [
          marketAnalysis.priceElasticity > 0.5 ? '価格感応性が高い' : '',
          marketAnalysis.competitorPrices.length < 3 ? '競合データ不足' : '',
        ].filter(Boolean),
        timeToImplement: '即座',
        expectedROI: projectedProfit > 0 ? 15 : 0,
      },
      confidenceScore: marketAnalysis.demandScore * 0.8,
    };
  }

  private async optimizeInventory(product: Product): Promise<Partial<OptimizationResult>> {
    // Get sales velocity data
    const salesVelocity = await this.calculateSalesVelocity(product);
    const demandForecast = await this.forecastDemand(product);
    
    const currentInventory = product.stockQuantity;
    const recommendedInventory = Math.max(
      Math.round(salesVelocity * 30), // At least 30 days of stock
      Math.round(demandForecast * 1.2) // 20% buffer above forecasted demand
    );

    return {
      recommendedInventory,
      optimizationInsights: {
        reason: '売上速度と需要予測に基づく在庫最適化',
        confidence: 75,
        potentialImpact: `在庫${recommendedInventory > (currentInventory || 0) ? '増加' : '減少'}により機会損失を${recommendedInventory > (currentInventory || 0) ? '削減' : '回避'}`,
        riskFactors: [
          salesVelocity < 0.1 ? '売上速度が低い' : '',
          (product.stockQuantity || 0) < 10 ? '在庫不足リスク' : '',
        ].filter(Boolean),
        timeToImplement: '1-3営業日',
        expectedROI: 15,
      },
      confidenceScore: 75,
    };
  }

  private async optimizeProfit(product: Product): Promise<Partial<OptimizationResult>> {
    // Combine price and inventory optimization for maximum profit
    const priceOptimization = await this.optimizePrice(product);
    const inventoryOptimization = await this.optimizeInventory(product);
    
    const projectedProfit = ((priceOptimization.recommendedPrice || 0) - product.wholesalePrice) * 
                          (inventoryOptimization.recommendedInventory || 0);

    return {
      recommendedPrice: priceOptimization.recommendedPrice,
      recommendedInventory: inventoryOptimization.recommendedInventory,
      projectedProfit: Math.round(projectedProfit * 100) / 100,
      projectedMarginPercentage: priceOptimization.projectedMarginPercentage,
      marketAnalysis: priceOptimization.marketAnalysis,
      optimizationInsights: {
        reason: '価格と在庫の総合最適化により利益を最大化',
        confidence: 70,
        potentialImpact: `総利益最適化による改善予想`,
        riskFactors: [
          '複数要素の変更によるリスク',
          '市場反応の不確実性',
        ],
        timeToImplement: '2-5営業日',
        expectedROI: projectedProfit > 0 ? 20 : 0,
      },
      confidenceScore: 70,
    };
  }

  private async optimizeMarketTiming(product: Product): Promise<Partial<OptimizationResult>> {
    const marketAnalysis = await this.analyzeMarket(product);
    const seasonalityFactor = marketAnalysis.seasonalityFactor;
    
    const timing = seasonalityFactor > 1.2 ? 'immediate' : 
                  seasonalityFactor > 0.8 ? 'within_week' : 'wait';

    return {
      marketAnalysis,
      optimizationInsights: {
        reason: 'seasonal trends and market conditions analysis',
        confidence: marketAnalysis.demandScore,
        potentialImpact: timing === 'immediate' ? '今すぐ売却推奨' : 
                        timing === 'within_week' ? '1週間以内に売却推奨' : '価格上昇まで待機推奨',
        riskFactors: [
          seasonalityFactor < 0.5 ? 'オフシーズン' : '',
          marketAnalysis.marketTrend === 'falling' ? '市場下落トレンド' : '',
        ].filter(Boolean),
        timeToImplement: timing,
        expectedROI: (seasonalityFactor - 1) * 100,
      },
      confidenceScore: marketAnalysis.demandScore,
    };
  }

  // Helper methods for market analysis
  private async analyzeMarket(product: Product) {
    // This is a simplified simulation - in real implementation, 
    // this would integrate with external APIs like Amazon MWS, eBay API, etc.
    return {
      competitorPrices: [
        { source: 'Amazon', price: product.wholesalePrice * 1.1, timestamp: new Date() },
        { source: '楽天', price: product.wholesalePrice * 0.95, timestamp: new Date() },
        { source: 'Yahoo!', price: product.wholesalePrice * 1.05, timestamp: new Date() },
      ],
      demandScore: Math.random() * 100, // 0-100
      seasonalityFactor: 0.8 + Math.random() * 0.4, // 0.8-1.2
      priceElasticity: Math.random() * 0.8, // 0-0.8
      marketTrend: (['rising', 'falling', 'stable'] as const)[Math.floor(Math.random() * 3)],
    };
  }

  private async calculateSalesVelocity(product: Product): Promise<number> {
    // In real implementation, this would query sales data
    return Math.random() * 2; // Units per day
  }

  private async forecastDemand(product: Product): Promise<number> {
    // In real implementation, this would use ML models
    return Math.round(Math.random() * 50 + 10); // 10-60 units
  }

  private calculateCurrentProfit(product: Product): number {
    // For sedori (reselling), we calculate profit as markup over wholesale price
    const markup = product.retailPrice || product.marketPrice || product.wholesalePrice * 1.2;
    return (markup - product.wholesalePrice) * (product.stockQuantity || 0);
  }

  private calculateMarginPercentage(product: Product): number {
    if (product.wholesalePrice === 0) return 0;
    const markup = product.retailPrice || product.marketPrice || product.wholesalePrice * 1.2;
    return ((markup - product.wholesalePrice) / markup) * 100;
  }

  private mapToResponse(optimization: OptimizationResult): OptimizationResponseDto {
    return {
      id: optimization.id,
      userId: optimization.userId,
      productId: optimization.productId,
      type: optimization.type,
      status: optimization.status,
      currentPrice: Number(optimization.currentPrice),
      currentProfit: Number(optimization.currentProfit),
      currentInventory: optimization.currentInventory,
      currentMarginPercentage: Number(optimization.currentMarginPercentage),
      recommendedPrice: optimization.recommendedPrice ? Number(optimization.recommendedPrice) : undefined,
      projectedProfit: optimization.projectedProfit ? Number(optimization.projectedProfit) : undefined,
      recommendedInventory: optimization.recommendedInventory,
      projectedMarginPercentage: optimization.projectedMarginPercentage ? Number(optimization.projectedMarginPercentage) : undefined,
      marketAnalysis: optimization.marketAnalysis,
      optimizationInsights: optimization.optimizationInsights,
      confidenceScore: optimization.confidenceScore ? Number(optimization.confidenceScore) : undefined,
      implementedAt: optimization.implementedAt,
      actualResult: optimization.actualResult ? Number(optimization.actualResult) : undefined,
      createdAt: optimization.createdAt,
      updatedAt: optimization.updatedAt,
    };
  }
}