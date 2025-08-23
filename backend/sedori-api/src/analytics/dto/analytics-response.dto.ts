import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsMetricsDto {
  @ApiProperty({ description: '総ページビュー数' })
  totalPageViews: number;

  @ApiProperty({ description: '総商品ビュー数' })
  totalProductViews: number;

  @ApiProperty({ description: 'ユニークユーザー数' })
  uniqueUsers: number;

  @ApiProperty({ description: '総注文数' })
  totalOrders: number;

  @ApiProperty({ description: '総売上' })
  totalRevenue: number;

  @ApiProperty({ description: '平均注文額' })
  averageOrderValue: number;

  @ApiProperty({ description: 'コンバージョン率' })
  conversionRate: number;

  @ApiProperty({ description: 'カート追加率' })
  cartAddRate: number;
}

export class TimeSeriesDataPoint {
  @ApiProperty({ description: '日時' })
  timestamp: string;

  @ApiProperty({ description: '値' })
  value: number;

  @ApiProperty({ description: '追加データ', required: false })
  metadata?: Record<string, any>;
}

export class AnalyticsTimeSeriesDto {
  @ApiProperty({ description: 'メトリクス名' })
  metric: string;

  @ApiProperty({ description: '時系列データ', type: [TimeSeriesDataPoint] })
  data: TimeSeriesDataPoint[];

  @ApiProperty({ description: '合計' })
  total: number;

  @ApiProperty({ description: '前期比較（%）' })
  changePercent?: number;
}

export class TopProductDto {
  @ApiProperty({ description: '商品ID' })
  productId: string;

  @ApiProperty({ description: '商品名' })
  productName: string;

  @ApiProperty({ description: 'ビュー数' })
  views: number;

  @ApiProperty({ description: '売上数' })
  sales: number;

  @ApiProperty({ description: '売上額' })
  revenue: number;

  @ApiProperty({ description: 'コンバージョン率' })
  conversionRate: number;
}

export class TopCategoryDto {
  @ApiProperty({ description: 'カテゴリID' })
  categoryId: string;

  @ApiProperty({ description: 'カテゴリ名' })
  categoryName: string;

  @ApiProperty({ description: 'ビュー数' })
  views: number;

  @ApiProperty({ description: '売上数' })
  sales: number;

  @ApiProperty({ description: '売上額' })
  revenue: number;
}

export class UserBehaviorDto {
  @ApiProperty({ description: 'セッション数' })
  sessions: number;

  @ApiProperty({ description: '平均セッション時間（秒）' })
  averageSessionDuration: number;

  @ApiProperty({ description: 'ページ/セッション' })
  pagesPerSession: number;

  @ApiProperty({ description: 'バウンス率' })
  bounceRate: number;

  @ApiProperty({ description: '新規ユーザー率' })
  newUserRate: number;

  @ApiProperty({ description: 'リピーター率' })
  returningUserRate: number;
}

export class AnalyticsDashboardDto {
  @ApiProperty({ description: '基本メトリクス', type: AnalyticsMetricsDto })
  metrics: AnalyticsMetricsDto;

  @ApiProperty({ description: '時系列データ', type: [AnalyticsTimeSeriesDto] })
  timeSeries: AnalyticsTimeSeriesDto[];

  @ApiProperty({ description: '人気商品', type: [TopProductDto] })
  topProducts: TopProductDto[];

  @ApiProperty({ description: '人気カテゴリ', type: [TopCategoryDto] })
  topCategories: TopCategoryDto[];

  @ApiProperty({ description: 'ユーザー行動', type: UserBehaviorDto })
  userBehavior: UserBehaviorDto;

  @ApiProperty({ description: '期間' })
  period: {
    startDate: string;
    endDate: string;
  };
}
