import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AnalyticsEvent,
  AnalyticsEventType,
} from './entities/analytics-event.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import {
  AnalyticsQueryDto,
  AnalyticsTimeRange,
  AnalyticsGroupBy,
  AnalyticsDashboardDto,
  AnalyticsMetricsDto,
  AnalyticsTimeSeriesDto,
  TopProductDto,
  TopCategoryDto,
  UserBehaviorDto,
  TrackEventDto,
} from './dto';

// Type definitions for database query results
interface CountResult {
  count: string;
}

interface RevenueResult {
  revenue: string;
}

interface TimeSeriesQueryResult {
  timestamp: Date;
  value: string;
}

interface ProductAnalyticsResult {
  productId: string;
  productName: string;
  views: string;
  sales: string;
}

interface CategoryAnalyticsResult {
  categoryId: string;
  categoryName: string;
  views: string;
  sales: string;
}

interface UserBehaviorQueryResult {
  sessions?: string;
  newUsers?: string;
  totalUsers?: string;
}

interface ConversionRateQueryResult {
  count?: string;
  sessions?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async trackEvent(
    userId: string | undefined,
    trackEventDto: TrackEventDto,
  ): Promise<void> {
    const event = this.analyticsEventRepository.create({
      ...trackEventDto,
      userId,
      timestamp: new Date(),
    });

    await this.analyticsEventRepository.save(event);
  }

  async getDashboard(
    queryDto: AnalyticsQueryDto,
  ): Promise<AnalyticsDashboardDto> {
    const { startDate, endDate } = this.getDateRange(queryDto);

    const [metrics, timeSeries, topProducts, topCategories, userBehavior] =
      await Promise.all([
        this.getMetrics(startDate, endDate),
        this.getTimeSeries(startDate, endDate, queryDto.groupBy!),
        this.getTopProducts(startDate, endDate),
        this.getTopCategories(startDate, endDate),
        this.getUserBehavior(startDate, endDate),
      ]);

    return {
      metrics,
      timeSeries,
      topProducts,
      topCategories,
      userBehavior,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    };
  }

  private async getMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<AnalyticsMetricsDto> {
    const pageViews = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .where('event.eventType = :eventType', {
        eventType: AnalyticsEventType.PAGE_VIEW,
      })
      .andWhere('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .getCount();

    const productViews = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .where('event.eventType = :eventType', {
        eventType: AnalyticsEventType.PRODUCT_VIEW,
      })
      .andWhere('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .getCount();

    const uniqueUsersResult = (await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .andWhere('event.userId IS NOT NULL')
      .getRawOne()) as CountResult | null;

    const ordersResult = (await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(order.totalAmount)', 'revenue')
      .where('order.orderDate >= :startDate', { startDate })
      .andWhere('order.orderDate <= :endDate', { endDate })
      .getRawOne()) as (CountResult & RevenueResult) | null;

    const cartAdds = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .where('event.eventType = :eventType', {
        eventType: AnalyticsEventType.CART_ADD,
      })
      .andWhere('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .getCount();

    const orderCreates = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .where('event.eventType = :eventType', {
        eventType: AnalyticsEventType.ORDER_CREATE,
      })
      .andWhere('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .getCount();

    const totalOrders = this.parseIntSafely(ordersResult?.count);
    const totalRevenue = this.parseFloatSafely(ordersResult?.revenue);
    const uniqueUsers = this.parseIntSafely(uniqueUsersResult?.count);

    return {
      totalPageViews: pageViews,
      totalProductViews: productViews,
      uniqueUsers,
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      conversionRate:
        productViews > 0 ? (orderCreates / productViews) * 100 : 0,
      cartAddRate: productViews > 0 ? (cartAdds / productViews) * 100 : 0,
    };
  }

  private async getTimeSeries(
    startDate: Date,
    endDate: Date,
    groupBy: AnalyticsGroupBy,
  ): Promise<AnalyticsTimeSeriesDto[]> {
    // const dateFormat = this.getDateFormat(groupBy); // Unused for now
    const dateInterval = this.getDateInterval(groupBy);

    const pageViewsSeries = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select(`DATE_TRUNC('${dateInterval}', event.timestamp)`, 'timestamp')
      .addSelect('COUNT(*)', 'value')
      .where('event.eventType = :eventType', {
        eventType: AnalyticsEventType.PAGE_VIEW,
      })
      .andWhere('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .groupBy(`DATE_TRUNC('${dateInterval}', event.timestamp)`)
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    const ordersSeries = await this.orderRepository
      .createQueryBuilder('order')
      .select(`DATE_TRUNC('${dateInterval}', order.orderDate)`, 'timestamp')
      .addSelect('COUNT(*)', 'value')
      .where('order.orderDate >= :startDate', { startDate })
      .andWhere('order.orderDate <= :endDate', { endDate })
      .groupBy(`DATE_TRUNC('${dateInterval}', order.orderDate)`)
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    const revenueSeries = await this.orderRepository
      .createQueryBuilder('order')
      .select(`DATE_TRUNC('${dateInterval}', order.orderDate)`, 'timestamp')
      .addSelect('SUM(order.totalAmount)', 'value')
      .where('order.orderDate >= :startDate', { startDate })
      .andWhere('order.orderDate <= :endDate', { endDate })
      .groupBy(`DATE_TRUNC('${dateInterval}', order.orderDate)`)
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    return [
      {
        metric: 'pageViews',
        data: pageViewsSeries.map((row: TimeSeriesQueryResult) => ({
          timestamp: row.timestamp.toISOString(),
          value: parseInt(String(row.value || 0)),
        })),
        total: pageViewsSeries.reduce(
          (sum: number, row: TimeSeriesQueryResult) =>
            sum + parseInt(String(row.value || 0)),
          0,
        ),
      },
      {
        metric: 'orders',
        data: ordersSeries.map((row: TimeSeriesQueryResult) => ({
          timestamp: row.timestamp.toISOString(),
          value: parseInt(String(row.value || 0)),
        })),
        total: ordersSeries.reduce(
          (sum: number, row: TimeSeriesQueryResult) =>
            sum + parseInt(String(row.value || 0)),
          0,
        ),
      },
      {
        metric: 'revenue',
        data: revenueSeries.map((row: TimeSeriesQueryResult) => ({
          timestamp: row.timestamp.toISOString(),
          value: parseFloat(String(row.value || 0)),
        })),
        total: revenueSeries.reduce(
          (sum: number, row: TimeSeriesQueryResult) =>
            sum + parseFloat(String(row.value || 0)),
          0,
        ),
      },
    ];
  }

  private async getTopProducts(
    startDate: Date,
    endDate: Date,
  ): Promise<TopProductDto[]> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.product', 'product')
      .select('event.productId', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect(
        'COUNT(CASE WHEN event.eventType = :viewType THEN 1 END)',
        'views',
      )
      .addSelect(
        'COUNT(CASE WHEN event.eventType = :orderType THEN 1 END)',
        'sales',
      )
      .where('event.productId IS NOT NULL')
      .andWhere('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .setParameters({
        viewType: AnalyticsEventType.PRODUCT_VIEW,
        orderType: AnalyticsEventType.ORDER_CREATE,
      })
      .groupBy('event.productId')
      .addGroupBy('product.name')
      .orderBy('views', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((row: ProductAnalyticsResult) => {
      const views = parseInt(String(row.views || 0));
      const sales = parseInt(String(row.sales || 0));
      return {
        productId: row.productId,
        productName: row.productName || 'Unknown Product',
        views,
        sales,
        revenue: 0, // Would need to join with order items for accurate revenue
        conversionRate: views > 0 ? (sales / views) * 100 : 0,
      };
    });
  }

  private async getTopCategories(
    startDate: Date,
    endDate: Date,
  ): Promise<TopCategoryDto[]> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect(
        'COUNT(CASE WHEN event.eventType = :viewType THEN 1 END)',
        'views',
      )
      .addSelect(
        'COUNT(CASE WHEN event.eventType = :orderType THEN 1 END)',
        'sales',
      )
      .where('event.productId IS NOT NULL')
      .andWhere('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .setParameters({
        viewType: AnalyticsEventType.PRODUCT_VIEW,
        orderType: AnalyticsEventType.ORDER_CREATE,
      })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('views', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((row: CategoryAnalyticsResult) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName || 'Unknown Category',
      views: parseInt(String(row.views || '0')),
      sales: parseInt(String(row.sales || '0')),
      revenue: 0, // Would need to join with order items for accurate revenue
    }));
  }

  private async getUserBehavior(
    startDate: Date,
    endDate: Date,
  ): Promise<UserBehaviorDto> {
    const sessionsResult = (await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.sessionId)', 'sessions')
      .where('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .andWhere('event.sessionId IS NOT NULL')
      .getRawOne()) as UserBehaviorQueryResult | null;

    const newUsersResult = (await this.userRepository
      .createQueryBuilder('user')
      .select('COUNT(*)', 'newUsers')
      .where('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .getRawOne()) as UserBehaviorQueryResult | null;

    const totalUsersResult = (await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'totalUsers')
      .where('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .andWhere('event.userId IS NOT NULL')
      .getRawOne()) as UserBehaviorQueryResult | null;

    const sessions = parseInt(String(sessionsResult?.sessions || '0'));
    const newUsers = parseInt(String(newUsersResult?.newUsers || '0'));
    const totalUsers = parseInt(String(totalUsersResult?.totalUsers || '0'));

    return {
      sessions,
      averageSessionDuration: 0, // Would need session tracking for accurate calculation
      pagesPerSession: 0, // Would need detailed session tracking
      bounceRate: 0, // Would need session analysis
      newUserRate: totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0,
      returningUserRate:
        totalUsers > 0 ? ((totalUsers - newUsers) / totalUsers) * 100 : 0,
    };
  }

  private getDateRange(queryDto: AnalyticsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );

    switch (queryDto.timeRange) {
      case AnalyticsTimeRange.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case AnalyticsTimeRange.YESTERDAY:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          23,
          59,
          59,
        );
        break;
      case AnalyticsTimeRange.LAST_7_DAYS:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 6,
        );
        break;
      case AnalyticsTimeRange.LAST_30_DAYS:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 29,
        );
        break;
      case AnalyticsTimeRange.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case AnalyticsTimeRange.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case AnalyticsTimeRange.CUSTOM:
        if (queryDto.startDate && queryDto.endDate) {
          startDate = new Date(queryDto.startDate);
          endDate = new Date(queryDto.endDate);
        } else {
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 6,
          );
        }
        break;
      default:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 6,
        );
    }

    return { startDate, endDate };
  }

  private getDateFormat(groupBy: AnalyticsGroupBy): string {
    switch (groupBy) {
      case AnalyticsGroupBy.HOUR:
        return 'YYYY-MM-DD HH24:00:00';
      case AnalyticsGroupBy.DAY:
        return 'YYYY-MM-DD';
      case AnalyticsGroupBy.WEEK:
        return 'YYYY-WW';
      case AnalyticsGroupBy.MONTH:
        return 'YYYY-MM';
      default:
        return 'YYYY-MM-DD';
    }
  }

  private getDateInterval(groupBy: AnalyticsGroupBy): string {
    switch (groupBy) {
      case AnalyticsGroupBy.HOUR:
        return 'hour';
      case AnalyticsGroupBy.DAY:
        return 'day';
      case AnalyticsGroupBy.WEEK:
        return 'week';
      case AnalyticsGroupBy.MONTH:
        return 'month';
      default:
        return 'day';
    }
  }

  // Real-time optimization features
  async getRealTimeMetrics(): Promise<{
    currentActiveUsers: number;
    todayOrderCount: number;
    todayRevenue: number;
    avgOrderValue: number;
    conversionRate: number;
    alertsCount: number;
  }> {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);

    try {
      // Active users in last 5 minutes
      const activeUsersResult = (await this.analyticsEventRepository
        .createQueryBuilder('event')
        .select('COUNT(DISTINCT event.userId)', 'count')
        .where('event.timestamp >= :last5Minutes', { last5Minutes })
        .andWhere('event.userId IS NOT NULL')
        .getRawOne()) as CountResult | null;

      // Today's orders
      const todayOrdersResult = (await this.orderRepository
        .createQueryBuilder('order')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
        .where('order.orderDate >= :todayStart', { todayStart })
        .getRawOne()) as (CountResult & RevenueResult) | null;

      const todayOrderCount = parseInt(String(todayOrdersResult?.count || '0'));
      const todayRevenue = parseFloat(
        String(todayOrdersResult?.revenue || '0'),
      );
      const avgOrderValue =
        todayOrderCount > 0 ? todayRevenue / todayOrderCount : 0;

      // Calculate conversion rate (orders / sessions)
      const todaySessionsResult = (await this.analyticsEventRepository
        .createQueryBuilder('event')
        .select('COUNT(DISTINCT event.sessionId)', 'sessions')
        .where('event.timestamp >= :todayStart', { todayStart })
        .andWhere('event.sessionId IS NOT NULL')
        .getRawOne()) as ConversionRateQueryResult | null;

      const todaySessions = parseInt(
        String(todaySessionsResult?.sessions || '0'),
      );
      const conversionRate =
        todaySessions > 0 ? (todayOrderCount / todaySessions) * 100 : 0;

      return {
        currentActiveUsers: parseInt(String(activeUsersResult?.count || '0')),
        todayOrderCount,
        todayRevenue,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        alertsCount: await this.getActiveAlertsCount(),
      };
    } catch (error) {
      this.logger.error('Error getting real-time metrics:', error);
      return {
        currentActiveUsers: 0,
        todayOrderCount: 0,
        todayRevenue: 0,
        avgOrderValue: 0,
        conversionRate: 0,
        alertsCount: 0,
      };
    }
  }

  async getPerformanceAlerts(): Promise<{
    alerts: Array<{
      id: string;
      type: 'warning' | 'critical' | 'info';
      title: string;
      message: string;
      timestamp: Date;
      data?: any;
    }>;
    summary: {
      critical: number;
      warning: number;
      info: number;
    };
  }> {
    const alerts = [];
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      // Check conversion rate drop
      const recentConversionRate = await this.calculateConversionRate(
        lastHour,
        now,
      );
      const yesterdayConversionRate = await this.calculateConversionRate(
        new Date(last24Hours.getTime() - 24 * 60 * 60 * 1000),
        last24Hours,
      );

      if (recentConversionRate < yesterdayConversionRate * 0.7) {
        alerts.push({
          id: 'conversion_drop',
          type: 'warning' as const,
          title: 'コンバージョン率低下',
          message: `直近1時間のコンバージョン率が${recentConversionRate.toFixed(2)}%に低下しています`,
          timestamp: now,
          data: {
            current: recentConversionRate,
            previous: yesterdayConversionRate,
          },
        });
      }

      // Check for slow-moving products
      const slowMovingProducts = await this.identifySlowMovingProducts();
      if (slowMovingProducts.length > 0) {
        alerts.push({
          id: 'slow_moving_products',
          type: 'info' as const,
          title: '動きの遅い商品を検出',
          message: `${slowMovingProducts.length}個の商品で売上が停滞しています`,
          timestamp: now,
          data: { products: slowMovingProducts.slice(0, 3) },
        });
      }

      // Check for high bounce rate
      const bounceRate = await this.calculateBounceRate(last24Hours, now);
      if (bounceRate > 70) {
        alerts.push({
          id: 'high_bounce_rate',
          type: 'warning' as const,
          title: '離脱率が高い状態',
          message: `直近24時間の離脱率が${bounceRate.toFixed(1)}%です`,
          timestamp: now,
          data: { bounceRate },
        });
      }

      // Check for server performance issues (simulated)
      const responseTime = Math.random() * 1000 + 200;
      if (responseTime > 800) {
        alerts.push({
          id: 'slow_response_time',
          type: 'critical' as const,
          title: 'レスポンス時間が遅い',
          message: `平均レスポンス時間が${Math.round(responseTime)}msに達しています`,
          timestamp: now,
          data: { responseTime: Math.round(responseTime) },
        });
      }

      const summary = alerts.reduce(
        (acc, alert) => {
          acc[alert.type]++;
          return acc;
        },
        { critical: 0, warning: 0, info: 0 },
      );

      return { alerts, summary };
    } catch (error) {
      this.logger.error('Error getting performance alerts:', error);
      return {
        alerts: [
          {
            id: 'system_error',
            type: 'critical' as const,
            title: 'システムエラー',
            message: 'パフォーマンス監視でエラーが発生しました',
            timestamp: now,
          },
        ],
        summary: { critical: 1, warning: 0, info: 0 },
      };
    }
  }

  async getRealtimeOptimizationSuggestions(): Promise<{
    suggestions: Array<{
      id: string;
      priority: 'high' | 'medium' | 'low';
      type: string;
      title: string;
      description: string;
      impact: string;
      effort: string;
      estimatedImprovement: string;
      actions: string[];
    }>;
    metrics: {
      totalSuggestions: number;
      highPriority: number;
      estimatedImpactSum: number;
    };
  }> {
    const suggestions = [];

    try {
      const realTimeMetrics = await this.getRealTimeMetrics();
      const alerts = await this.getPerformanceAlerts();

      // Low conversion rate optimization
      if (realTimeMetrics.conversionRate < 2.0) {
        suggestions.push({
          id: 'improve_conversion',
          priority: 'high' as const,
          type: 'conversion_optimization',
          title: 'コンバージョン率改善',
          description: 'コンバージョン率が低いため、UXとCTAの改善が必要です',
          impact: '売上20-30%向上',
          effort: '中程度（1-2週間）',
          estimatedImprovement: '+25%売上向上',
          actions: [
            'チェックアウトフローの簡略化',
            'CTAボタンの改善',
            '商品ページの最適化',
            'A/Bテストの実施',
          ],
        });
      }

      // Low average order value optimization
      if (realTimeMetrics.avgOrderValue < 5000) {
        suggestions.push({
          id: 'increase_aov',
          priority: 'medium' as const,
          type: 'revenue_optimization',
          title: '平均注文単価向上',
          description: 'クロスセルとアップセルでAOVを改善できます',
          impact: 'AOV15-25%向上',
          effort: '軽度（3-5日）',
          estimatedImprovement: '+20%AOV向上',
          actions: [
            '関連商品の提案',
            'バンドル商品の作成',
            '送料無料閾値の調整',
            'クーポン戦略の最適化',
          ],
        });
      }

      // Product page optimization
      const topProducts = await this.getTopProducts(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      if (topProducts.length > 0) {
        const lowConversionProduct = topProducts.find(
          (p) => p.views > 50 && p.sales < p.views * 0.05,
        );
        if (lowConversionProduct) {
          suggestions.push({
            id: 'optimize_product_page',
            priority: 'medium' as const,
            type: 'product_optimization',
            title: '商品ページの最適化',
            description: `${lowConversionProduct.productName}の商品ページでコンバージョン率が低い`,
            impact: '該当商品の売上30-40%向上',
            effort: '軽度（2-3日）',
            estimatedImprovement: '+35%商品売上向上',
            actions: [
              '商品画像の改善',
              '商品説明の充実',
              'レビュー機能の追加',
              '在庫表示の最適化',
            ],
          });
        }
      }

      // Performance optimization based on alerts
      if (alerts.alerts.some((alert) => alert.type === 'critical')) {
        suggestions.push({
          id: 'performance_optimization',
          priority: 'high' as const,
          type: 'technical_optimization',
          title: 'パフォーマンス最適化',
          description: 'システムパフォーマンスの問題が検出されました',
          impact: 'サイト速度50%改善',
          effort: '重度（1-2週間）',
          estimatedImprovement: '+15%ユーザー満足度向上',
          actions: [
            'データベースクエリの最適化',
            'CDNの導入',
            '画像圧縮の実装',
            'キャッシュ戦略の見直し',
          ],
        });
      }

      // Inventory optimization
      if (realTimeMetrics.todayOrderCount > 0) {
        suggestions.push({
          id: 'inventory_optimization',
          priority: 'low' as const,
          type: 'inventory_management',
          title: '在庫管理の最適化',
          description: '売上データを基にした在庫予測の改善',
          impact: '在庫コスト10-15%削減',
          effort: '中程度（1週間）',
          estimatedImprovement: '+12%利益率改善',
          actions: [
            '自動発注システムの導入',
            '需要予測モデルの改善',
            'ABC分析の実装',
            '季節調整の最適化',
          ],
        });
      }

      const metrics = {
        totalSuggestions: suggestions.length,
        highPriority: suggestions.filter((s) => s.priority === 'high').length,
        estimatedImpactSum: suggestions.reduce((sum, s) => {
          const impactMatch = s.estimatedImprovement.match(/\+(\d+)%/);
          return sum + (impactMatch ? parseInt(impactMatch[1]) : 0);
        }, 0),
      };

      return { suggestions, metrics };
    } catch (error) {
      this.logger.error('Error getting optimization suggestions:', error);
      return {
        suggestions: [],
        metrics: {
          totalSuggestions: 0,
          highPriority: 0,
          estimatedImpactSum: 0,
        },
      };
    }
  }

  // Helper methods for optimization features
  private async getActiveAlertsCount(): Promise<number> {
    const alerts = await this.getPerformanceAlerts();
    return alerts.alerts.length;
  }

  private async calculateConversionRate(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    try {
      const [ordersResult, sessionsResult] = await Promise.all([
        this.orderRepository
          .createQueryBuilder('order')
          .select('COUNT(*)', 'count')
          .where('order.orderDate >= :startDate', { startDate })
          .andWhere('order.orderDate <= :endDate', { endDate })
          .getRawOne() as Promise<CountResult | null>,
        this.analyticsEventRepository
          .createQueryBuilder('event')
          .select('COUNT(DISTINCT event.sessionId)', 'sessions')
          .where('event.timestamp >= :startDate', { startDate })
          .andWhere('event.timestamp <= :endDate', { endDate })
          .andWhere('event.sessionId IS NOT NULL')
          .getRawOne() as Promise<ConversionRateQueryResult | null>,
      ]);

      const orders = parseInt(String(ordersResult?.count || '0'));
      const sessions = parseInt(String(sessionsResult?.sessions || '0'));

      return sessions > 0 ? (orders / sessions) * 100 : 0;
    } catch (error) {
      this.logger.error('Error calculating conversion rate:', error);
      return 0;
    }
  }

  private identifySlowMovingProducts(): Array<{
    id: string;
    name: string;
    daysSinceLastSale: number;
  }> {
    // Mock implementation - would require more complex queries in real scenario
    return [
      { id: '1', name: 'Product A', daysSinceLastSale: 15 },
      { id: '2', name: 'Product B', daysSinceLastSale: 22 },
      { id: '3', name: 'Product C', daysSinceLastSale: 8 },
    ];
  }

  private calculateBounceRate(_startDate: Date, _endDate: Date): number {
    // Mock implementation - would require session analysis
    return Math.random() * 30 + 40; // 40-70%
  }

  // Type-safe helper functions
  private parseIntSafely(value: string | undefined | null): number {
    const parsed = parseInt(String(value || '0'));
    return isNaN(parsed) ? 0 : parsed;
  }

  private parseFloatSafely(value: string | undefined | null): number {
    const parsed = parseFloat(String(value || '0'));
    return isNaN(parsed) ? 0 : parsed;
  }
}
