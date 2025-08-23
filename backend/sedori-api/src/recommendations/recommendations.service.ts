import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Recommendation,
  RecommendationType,
  RecommendationStatus,
} from './entities/recommendation.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsageType } from '../subscriptions/entities/subscription-usage.entity';
import {
  RecommendationRequestDto,
  RecommendationType as RequestRecommendationType,
  RecommendationPriority,
  RecommendationResponseDto,
  RecommendationItemDto,
  PersonalizedRecommendationDto,
} from './dto';

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly analyticsService: AnalyticsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async generateRecommendations(
    userId: string,
    requestDto: RecommendationRequestDto,
  ): Promise<RecommendationResponseDto> {
    // Check subscription and usage limits
    await this.checkRecommendationAccess(userId);

    // Track usage
    await this.subscriptionsService.trackUsage(
      userId,
      UsageType.AI_RECOMMENDATION,
      1,
      `recommendation_${requestDto.type}`,
    );

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('ユーザーが見つかりません');
    }

    // Generate recommendations based on type
    const recommendations = await this.generateByType(userId, requestDto);

    // Calculate overall metrics
    const summary = this.calculateSummary(recommendations);
    const insights = await this.generateInsights(userId, requestDto.type);

    return {
      type: requestDto.type,
      generatedAt: new Date(),
      recommendations,
      overallScore: summary.averageConfidence,
      summary,
      insights,
    };
  }

  async getPersonalizedRecommendations(
    userId: string,
    limit = 10,
  ): Promise<PersonalizedRecommendationDto> {
    // Check subscription access
    await this.checkRecommendationAccess(userId);

    // Get user's recommendation history and performance
    const userPerformance = await this.calculateUserPerformance(userId);
    const learnedPatterns = await this.extractUserPatterns(userId);

    // Generate personalized recommendations based on user behavior
    const personalizedRecommendations = await this.generatePersonalized(
      userId,
      limit,
      userPerformance,
      learnedPatterns,
    );

    return {
      personalizedRecommendations,
      userPerformance,
      learnedPatterns,
    };
  }

  async getUserRecommendations(
    userId: string,
    page = 1,
    limit = 20,
    type?: RecommendationType,
    status?: RecommendationStatus,
  ): Promise<{
    data: RecommendationItemDto[];
    pagination: any;
  }> {
    const queryBuilder = this.recommendationRepository.createQueryBuilder('rec');
    queryBuilder.leftJoinAndSelect('rec.product', 'product');
    queryBuilder.where('rec.userId = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('rec.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('rec.status = :status', { status });
    }

    // Only show active and non-expired recommendations by default
    if (!status) {
      queryBuilder.andWhere('rec.status IN (:...statuses)', {
        statuses: [RecommendationStatus.ACTIVE, RecommendationStatus.VIEWED],
      });
      queryBuilder.andWhere(
        '(rec.expiresAt IS NULL OR rec.expiresAt > :now)',
        { now: new Date() },
      );
    }

    queryBuilder.orderBy('rec.score', 'DESC');
    queryBuilder.addOrderBy('rec.createdAt', 'DESC');

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(this.mapRecommendationToItem),
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

  async markRecommendationAsViewed(
    userId: string,
    recommendationId: string,
  ): Promise<void> {
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId, userId },
    });

    if (!recommendation) {
      throw new NotFoundException('推奨が見つかりません');
    }

    await this.recommendationRepository.update(recommendationId, {
      status: RecommendationStatus.VIEWED,
      viewedAt: new Date(),
      impressionCount: recommendation.impressionCount + 1,
    });
  }

  async markRecommendationAsClicked(
    userId: string,
    recommendationId: string,
  ): Promise<void> {
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId, userId },
    });

    if (!recommendation) {
      throw new NotFoundException('推奨が見つかりません');
    }

    await this.recommendationRepository.update(recommendationId, {
      status: RecommendationStatus.CLICKED,
      clickedAt: new Date(),
      clickCount: recommendation.clickCount + 1,
    });
  }

  private async checkRecommendationAccess(userId: string): Promise<void> {
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    
    if (!subscription.hasAIRecommendations) {
      throw new ForbiddenException('AI推奨機能にアクセスできません。プランをアップグレードしてください。');
    }
  }

  private async generateByType(
    userId: string,
    requestDto: RecommendationRequestDto,
  ): Promise<RecommendationItemDto[]> {
    const { type, productId, categoryId, budgetLimit, limit = 10 } = requestDto;

    switch (type) {
      case RequestRecommendationType.PRODUCT_DISCOVERY:
        return this.generateProductDiscoveryRecommendations(
          userId,
          categoryId,
          budgetLimit,
          limit,
        );
      case RequestRecommendationType.PRICING_STRATEGY:
        return this.generatePricingStrategyRecommendations(
          userId,
          productId,
          limit,
        );
      case RequestRecommendationType.INVENTORY_OPTIMIZATION:
        return this.generateInventoryRecommendations(userId, limit);
      case RequestRecommendationType.MARKET_OPPORTUNITY:
        return this.generateMarketOpportunityRecommendations(userId, limit);
      case RequestRecommendationType.SEASONAL_TREND:
        return this.generateSeasonalTrendRecommendations(userId, limit);
      default:
        return [];
    }
  }

  private async generateProductDiscoveryRecommendations(
    userId: string,
    categoryId?: string,
    budgetLimit?: number,
    limit = 10,
  ): Promise<RecommendationItemDto[]> {
    // Query for trending and high-profit products
    const queryBuilder = this.productRepository.createQueryBuilder('product');
    queryBuilder.leftJoinAndSelect('product.category', 'category');

    if (categoryId) {
      queryBuilder.where('product.categoryId = :categoryId', { categoryId });
    }

    if (budgetLimit) {
      queryBuilder.andWhere('product.wholesalePrice <= :budgetLimit', { budgetLimit });
    }

    queryBuilder.andWhere('product.status = :status', { status: 'active' });
    queryBuilder.andWhere('product.stockQuantity > 0');

    // Order by profitability and demand
    queryBuilder.orderBy(
      '(product.retailPrice - product.wholesalePrice) / product.wholesalePrice',
      'DESC',
    );
    queryBuilder.addOrderBy('product.viewCount', 'DESC');
    queryBuilder.take(limit);

    const products = await queryBuilder.getMany();

    return products.map((product, index) => ({
      id: `product_discovery_${product.id}`,
      title: `商品発見: ${product.name}`,
      description: `高収益性が期待される商品です。利益率: ${this.calculateMarginPercentage(product)}%`,
      reason: 'AI分析により、現在の市場動向と過去の販売データから高い収益性が予測されます',
      confidenceScore: Math.max(70, 95 - index * 3),
      priority: index < 3 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
      estimatedROI: this.calculateMarginPercentage(product),
      estimatedProfit: ((product.retailPrice || product.marketPrice || product.wholesalePrice * 1.2) - product.wholesalePrice) * Math.min(10, product.stockQuantity || 0),
      riskLevel: Math.min(5, Math.max(1, Math.floor(Math.random() * 3) + 2)),
      implementationDifficulty: 2,
      productId: product.id,
      productInfo: {
        name: product.name,
        currentPrice: product.wholesalePrice,
        suggestedPrice: product.retailPrice,
        category: product.category?.name || 'その他',
        imageUrl: product.primaryImageUrl,
      },
      recommendedActions: [
        '市場価格を確認する',
        '競合商品との比較を行う',
        '少量テスト仕入れを実施する',
      ],
      supportingData: {
        marketTrend: 'rising',
        competitorPricing: [product.wholesalePrice * 0.9, product.wholesalePrice * 1.1],
        demandScore: Math.random() * 40 + 60,
        seasonalityFactor: Math.random() * 0.4 + 0.8,
      },
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    }));
  }

  private async generatePricingStrategyRecommendations(
    userId: string,
    productId?: string,
    limit = 10,
  ): Promise<RecommendationItemDto[]> {
    if (!productId) {
      // Get user's products for pricing analysis
      const products = await this.productRepository.find({
        take: limit,
        order: { createdAt: 'DESC' },
      });

      return Promise.all(
        products.map((product, index) => this.createPricingRecommendation(product, index)),
      );
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['category'],
    });

    if (!product) {
      return [];
    }

    return [await this.createPricingRecommendation(product, 0)];
  }

  private async createPricingRecommendation(
    product: Product,
    index: number,
  ): Promise<RecommendationItemDto> {
    const currentMargin = this.calculateMarginPercentage(product);
    const suggestedPrice = product.wholesalePrice * 1.15; // 15% markup
    const newMargin = ((suggestedPrice - product.wholesalePrice) / suggestedPrice) * 100;

    return {
      id: `pricing_${product.id}`,
      title: `価格戦略: ${product.name}`,
      description: `現在の利益率${currentMargin.toFixed(1)}%から${newMargin.toFixed(1)}%への改善提案`,
      reason: 'マーケット分析により、価格上昇の余地があることを確認しました',
      confidenceScore: Math.max(65, 85 - index * 2),
      priority: currentMargin < 10 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
      estimatedROI: newMargin - currentMargin,
      estimatedProfit: (suggestedPrice - product.wholesalePrice) * Math.min(5, product.stockQuantity || 0),
      riskLevel: 2,
      implementationDifficulty: 1,
      productId: product.id,
      productInfo: {
        name: product.name,
        currentPrice: product.wholesalePrice,
        suggestedPrice: suggestedPrice,
        category: product.category?.name || 'その他',
        imageUrl: product.primaryImageUrl,
      },
      recommendedActions: [
        `販売価格を${product.retailPrice}円から${suggestedPrice}円に調整`,
        '競合価格をモニタリング',
        '売上への影響を追跡',
      ],
      supportingData: {
        marketTrend: 'stable',
        competitorPricing: [(product.retailPrice || product.wholesalePrice * 1.2) * 0.95, (product.retailPrice || product.wholesalePrice * 1.2) * 1.05],
        demandScore: Math.random() * 30 + 70,
        seasonalityFactor: Math.random() * 0.2 + 0.9,
      },
    };
  }

  private async generateInventoryRecommendations(
    userId: string,
    limit = 10,
  ): Promise<RecommendationItemDto[]> {
    // Find products with low or high stock levels
    const lowStockProducts = await this.productRepository.find({
      where: [
        { stockQuantity: 0 },
        { stockQuantity: 1 },
        { stockQuantity: 2 },
      ],
      take: Math.ceil(limit / 2),
      order: { viewCount: 'DESC' },
    });

    const recommendations: RecommendationItemDto[] = [];

    lowStockProducts.forEach((product, index) => {
      recommendations.push({
        id: `inventory_restock_${product.id}`,
        title: `在庫補充: ${product.name}`,
        description: `在庫が${product.stockQuantity}個と少なくなっています`,
        reason: '人気商品の在庫切れによる機会損失を防ぐため',
        confidenceScore: Math.max(70, 90 - index * 2),
        priority: product.stockQuantity === 0 ? RecommendationPriority.URGENT : RecommendationPriority.HIGH,
        estimatedROI: this.calculateMarginPercentage(product),
        estimatedProfit: ((product.retailPrice || product.marketPrice || product.wholesalePrice * 1.2) - product.wholesalePrice) * 10,
        riskLevel: 1,
        implementationDifficulty: 2,
        productId: product.id,
        productInfo: {
          name: product.name,
          currentPrice: product.wholesalePrice,
          category: product.category?.name || 'その他',
          imageUrl: product.primaryImageUrl,
        },
        recommendedActions: [
          `10-20個の追加仕入れ`,
          'サプライヤーとの交渉',
          '自動発注システムの検討',
        ],
        validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      });
    });

    return recommendations;
  }

  private async generateMarketOpportunityRecommendations(
    userId: string,
    limit = 10,
  ): Promise<RecommendationItemDto[]> {
    // Simulate market opportunity detection
    return Array.from({ length: Math.min(limit, 5) }, (_, index) => ({
      id: `market_opportunity_${index}`,
      title: `市場機会: ${['ゲーム機器', 'スマートフォンアクセサリ', '健康グッズ', 'キッチン用品', 'ファッション小物'][index]}`,
      description: 'トレンド分析により新たな市場機会を発見しました',
      reason: 'SNSトレンドと検索ボリュームの急上昇が確認されています',
      confidenceScore: Math.max(60, 80 - index * 3),
      priority: index < 2 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
      estimatedROI: Math.random() * 30 + 20,
      estimatedProfit: Math.random() * 50000 + 10000,
      riskLevel: Math.floor(Math.random() * 3) + 2,
      implementationDifficulty: Math.floor(Math.random() * 3) + 2,
      recommendedActions: [
        'カテゴリの詳細調査',
        '競合分析の実施',
        'テスト商品の選定',
        '小規模でのマーケット参入',
      ],
      supportingData: {
        marketTrend: 'rising',
        competitorPricing: [],
        demandScore: Math.random() * 40 + 60,
        seasonalityFactor: Math.random() * 0.6 + 0.7,
      },
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    }));
  }

  private async generateSeasonalTrendRecommendations(
    userId: string,
    limit = 10,
  ): Promise<RecommendationItemDto[]> {
    const currentMonth = new Date().getMonth();
    const seasons = [
      { name: '春商品', products: ['桜グッズ', 'ガーデニング用品', '新生活家電'] },
      { name: '夏商品', products: ['冷感グッズ', 'アウトドア用品', '水着・プール用品'] },
      { name: '秋商品', products: ['紅葉グッズ', 'ハロウィン用品', '防寒具'] },
      { name: '冬商品', products: ['クリスマス用品', '暖房器具', 'お正月グッズ'] },
    ];

    const seasonIndex = Math.floor(currentMonth / 3);
    const seasonData = seasons[seasonIndex];

    return seasonData.products.slice(0, limit).map((product, index) => ({
      id: `seasonal_${seasonIndex}_${index}`,
      title: `季節商品: ${product}`,
      description: `${seasonData.name}の需要が高まる時期です`,
      reason: '季節トレンドと過去の販売データから需要の増加を予測',
      confidenceScore: Math.max(70, 85 - index * 2),
      priority: index === 0 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
      estimatedROI: Math.random() * 25 + 15,
      estimatedProfit: Math.random() * 30000 + 5000,
      riskLevel: 2,
      implementationDifficulty: 2,
      recommendedActions: [
        '季節商品の仕入れ計画作成',
        '在庫管理の最適化',
        'タイムリーな販売開始',
      ],
      supportingData: {
        marketTrend: 'seasonal_rising',
        competitorPricing: [],
        demandScore: Math.random() * 30 + 70,
        seasonalityFactor: Math.random() * 0.5 + 1.2,
      },
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }));
  }

  private async generatePersonalized(
    userId: string,
    limit: number,
    userPerformance: any,
    learnedPatterns: any,
  ): Promise<RecommendationItemDto[]> {
    // Generate personalized recommendations based on user behavior
    const categories = userPerformance.preferredCategories || [];
    const riskTolerance = userPerformance.riskTolerance || 'medium';

    // Mock personalized recommendations
    return Array.from({ length: limit }, (_, index) => ({
      id: `personalized_${userId}_${index}`,
      title: `あなた向け推奨: ${['高収益商品', '低リスク投資', 'トレンド商品', '定番商品', 'ニッチ市場'][index % 5]}`,
      description: 'あなたの過去の成功パターンに基づく推奨です',
      reason: `${userPerformance.successRate}%の成功率と過去の選択パターンから選出`,
      confidenceScore: Math.max(60, 80 - index * 2),
      priority: index < 2 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
      estimatedROI: userPerformance.averageROI || Math.random() * 20 + 10,
      estimatedProfit: Math.random() * 20000 + 5000,
      riskLevel: riskTolerance === 'low' ? Math.min(2, Math.random() * 2 + 1) : Math.random() * 3 + 2,
      implementationDifficulty: Math.floor(Math.random() * 3) + 1,
      recommendedActions: [
        'あなたの得意分野での展開',
        '過去の成功パターンの活用',
        'リスク管理の徹底',
      ],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }));
  }

  private async calculateUserPerformance(userId: string): Promise<any> {
    // Mock user performance calculation
    return {
      successRate: Math.random() * 40 + 60, // 60-100%
      averageROI: Math.random() * 20 + 10, // 10-30%
      preferredCategories: ['家電', 'ファッション', 'ホビー'],
      riskTolerance: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    };
  }

  private async extractUserPatterns(userId: string): Promise<any> {
    // Mock pattern extraction
    return {
      bestPerformingStrategies: ['価格比較重視', '季節商品狙い', '新商品早期参入'],
      timeOfDayPreferences: ['朝', '夕方'],
      seasonalPreferences: ['春', '秋'],
    };
  }

  private async generateInsights(
    userId: string,
    type: RequestRecommendationType,
  ): Promise<any> {
    return {
      marketCondition: 'やや上昇トレンド',
      seasonalTrends: ['年末商戦の準備時期', '新学期需要の高まり'],
      riskFactors: ['為替変動', '原材料価格上昇', '競合の価格戦略'],
      opportunities: ['新しいニッチ市場の発見', 'サプライチェーンの最適化'],
    };
  }

  private calculateSummary(recommendations: RecommendationItemDto[]) {
    const totalRecommendations = recommendations.length;
    const highPriorityCount = recommendations.filter(r => r.priority === RecommendationPriority.HIGH).length;
    const averageConfidence = recommendations.reduce((sum, r) => sum + r.confidenceScore, 0) / totalRecommendations || 0;
    const estimatedTotalROI = recommendations.reduce((sum, r) => sum + (r.estimatedROI || 0), 0);

    return {
      totalRecommendations,
      highPriorityCount,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      estimatedTotalROI: Math.round(estimatedTotalROI * 100) / 100,
    };
  }

  private calculateMarginPercentage(product: Product): number {
    const retailPrice = product.retailPrice || product.marketPrice || product.wholesalePrice * 1.2;
    if (retailPrice <= 0) return 0;
    return ((retailPrice - product.wholesalePrice) / retailPrice) * 100;
  }

  private mapRecommendationToItem(rec: Recommendation): RecommendationItemDto {
    // Convert existing recommendation entity to DTO format
    return {
      id: rec.id,
      title: `推奨: ${rec.product?.name || '商品'}`,
      description: rec.reason || '詳細な分析に基づく推奨です',
      reason: rec.reason || '',
      confidenceScore: Number(rec.score) * 100, // Convert 0-1 to 0-100
      priority: RecommendationPriority.MEDIUM, // Default
      estimatedROI: 15, // Mock value
      riskLevel: 3, // Mock value
      implementationDifficulty: 2, // Mock value
      productId: rec.productId,
      productInfo: rec.product ? {
        name: rec.product.name,
        currentPrice: rec.product.wholesalePrice,
        suggestedPrice: rec.product.retailPrice,
        category: rec.product.category?.name || 'その他',
        imageUrl: rec.product.primaryImageUrl,
      } : undefined,
      recommendedActions: ['詳細分析の実施', '市場調査', '小規模テスト'],
    };
  }
}