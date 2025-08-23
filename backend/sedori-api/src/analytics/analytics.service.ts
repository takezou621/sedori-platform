import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent, AnalyticsEventType } from './entities/analytics-event.entity';
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

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async trackEvent(userId: string | undefined, trackEventDto: TrackEventDto): Promise<void> {
    const event = this.analyticsEventRepository.create({
      ...trackEventDto,
      userId,
      timestamp: new Date(),
    });

    await this.analyticsEventRepository.save(event);
  }

  async getDashboard(queryDto: AnalyticsQueryDto): Promise<AnalyticsDashboardDto> {
    const { startDate, endDate } = this.getDateRange(queryDto);

    const [
      metrics,
      timeSeries,
      topProducts,
      topCategories,
      userBehavior,
    ] = await Promise.all([
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

  private async getMetrics(startDate: Date, endDate: Date): Promise<AnalyticsMetricsDto> {
    const pageViews = await this.analyticsEventRepository.count({
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW,
        timestamp: {
          gte: startDate,
          lte: endDate,
        } as any,
      },
    });

    const productViews = await this.analyticsEventRepository.count({
      where: {
        eventType: AnalyticsEventType.PRODUCT_VIEW,
        timestamp: {
          gte: startDate,
          lte: endDate,
        } as any,
      },
    });

    const uniqueUsersResult = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .andWhere('event.userId IS NOT NULL')
      .getRawOne();

    const ordersResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(order.totalAmount)', 'revenue')
      .where('order.orderDate >= :startDate', { startDate })
      .andWhere('order.orderDate <= :endDate', { endDate })
      .getRawOne();

    const cartAdds = await this.analyticsEventRepository.count({
      where: {
        eventType: AnalyticsEventType.CART_ADD,
        timestamp: {
          gte: startDate,
          lte: endDate,
        } as any,
      },
    });

    const orderCreates = await this.analyticsEventRepository.count({
      where: {
        eventType: AnalyticsEventType.ORDER_CREATE,
        timestamp: {
          gte: startDate,
          lte: endDate,
        } as any,
      },
    });

    const totalOrders = parseInt(ordersResult?.count || '0');
    const totalRevenue = parseFloat(ordersResult?.revenue || '0');
    const uniqueUsers = parseInt(uniqueUsersResult?.count || '0');

    return {
      totalPageViews: pageViews,
      totalProductViews: productViews,
      uniqueUsers,
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      conversionRate: productViews > 0 ? (orderCreates / productViews) * 100 : 0,
      cartAddRate: productViews > 0 ? (cartAdds / productViews) * 100 : 0,
    };
  }

  private async getTimeSeries(
    startDate: Date,
    endDate: Date,
    groupBy: AnalyticsGroupBy,
  ): Promise<AnalyticsTimeSeriesDto[]> {
    const dateFormat = this.getDateFormat(groupBy);
    const dateInterval = this.getDateInterval(groupBy);

    const pageViewsSeries = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select(`DATE_TRUNC('${dateInterval}', event.timestamp)`, 'timestamp')
      .addSelect('COUNT(*)', 'value')
      .where('event.eventType = :eventType', { eventType: AnalyticsEventType.PAGE_VIEW })
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
        data: pageViewsSeries.map(row => ({
          timestamp: row.timestamp,
          value: parseInt(row.value),
        })),
        total: pageViewsSeries.reduce((sum, row) => sum + parseInt(row.value), 0),
      },
      {
        metric: 'orders',
        data: ordersSeries.map(row => ({
          timestamp: row.timestamp,
          value: parseInt(row.value),
        })),
        total: ordersSeries.reduce((sum, row) => sum + parseInt(row.value), 0),
      },
      {
        metric: 'revenue',
        data: revenueSeries.map(row => ({
          timestamp: row.timestamp,
          value: parseFloat(row.value || '0'),
        })),
        total: revenueSeries.reduce((sum, row) => sum + parseFloat(row.value || '0'), 0),
      },
    ];
  }

  private async getTopProducts(startDate: Date, endDate: Date): Promise<TopProductDto[]> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.product', 'product')
      .select('event.productId', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('COUNT(CASE WHEN event.eventType = :viewType THEN 1 END)', 'views')
      .addSelect('COUNT(CASE WHEN event.eventType = :orderType THEN 1 END)', 'sales')
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

    return result.map(row => ({
      productId: row.productId,
      productName: row.productName || 'Unknown Product',
      views: parseInt(row.views),
      sales: parseInt(row.sales),
      revenue: 0, // Would need to join with order items for accurate revenue
      conversionRate: parseInt(row.views) > 0 ? (parseInt(row.sales) / parseInt(row.views)) * 100 : 0,
    }));
  }

  private async getTopCategories(startDate: Date, endDate: Date): Promise<TopCategoryDto[]> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(CASE WHEN event.eventType = :viewType THEN 1 END)', 'views')
      .addSelect('COUNT(CASE WHEN event.eventType = :orderType THEN 1 END)', 'sales')
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

    return result.map(row => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName || 'Unknown Category',
      views: parseInt(row.views),
      sales: parseInt(row.sales),
      revenue: 0, // Would need to join with order items for accurate revenue
    }));
  }

  private async getUserBehavior(startDate: Date, endDate: Date): Promise<UserBehaviorDto> {
    const sessionsResult = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.sessionId)', 'sessions')
      .where('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .andWhere('event.sessionId IS NOT NULL')
      .getRawOne();

    const newUsersResult = await this.userRepository
      .createQueryBuilder('user')
      .select('COUNT(*)', 'newUsers')
      .where('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .getRawOne();

    const totalUsersResult = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'totalUsers')
      .where('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate })
      .andWhere('event.userId IS NOT NULL')
      .getRawOne();

    const sessions = parseInt(sessionsResult?.sessions || '0');
    const newUsers = parseInt(newUsersResult?.newUsers || '0');
    const totalUsers = parseInt(totalUsersResult?.totalUsers || '0');

    return {
      sessions,
      averageSessionDuration: 0, // Would need session tracking for accurate calculation
      pagesPerSession: 0, // Would need detailed session tracking
      bounceRate: 0, // Would need session analysis
      newUserRate: totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0,
      returningUserRate: totalUsers > 0 ? ((totalUsers - newUsers) / totalUsers) * 100 : 0,
    };
  }

  private getDateRange(queryDto: AnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (queryDto.timeRange) {
      case AnalyticsTimeRange.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case AnalyticsTimeRange.YESTERDAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case AnalyticsTimeRange.LAST_7_DAYS:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        break;
      case AnalyticsTimeRange.LAST_30_DAYS:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
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
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
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
}