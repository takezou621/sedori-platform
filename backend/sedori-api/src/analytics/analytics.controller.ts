import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AnalyticsQueryDto, AnalyticsDashboardDto, TrackEventDto } from './dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @ApiOperation({ summary: 'イベント追跡' })
  @ApiResponse({
    status: 201,
    description: 'イベントが記録されました',
  })
  async trackEvent(
    @Request() req: { user?: { id: string } },
    @Body() trackEventDto: TrackEventDto,
  ): Promise<{ success: boolean }> {
    const userId = req.user?.id;
    await this.analyticsService.trackEvent(userId, trackEventDto);
    return { success: true };
  }

  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'ユーザー向けアナリティクスダッシュボード取得' })
  @ApiResponse({
    status: 200,
    description: 'アナリティクスダッシュボードデータを返します',
    type: AnalyticsDashboardDto,
  })
  async getDashboard(
    @Request() req: { user: { id: string } },
    @Query() queryDto: AnalyticsQueryDto,
  ): Promise<AnalyticsDashboardDto> {
    // Filter data by user for regular users
    const userFilteredQuery = { ...queryDto, userId: req.user.id };
    return this.analyticsService.getDashboard(userFilteredQuery);
  }

  @Get('admin/dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '管理者向けアナリティクスダッシュボード取得（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: 'システム全体のアナリティクスダッシュボードデータを返します',
    type: AnalyticsDashboardDto,
  })
  async getAdminDashboard(
    @Query() queryDto: AnalyticsQueryDto,
  ): Promise<AnalyticsDashboardDto> {
    return this.analyticsService.getDashboard(queryDto);
  }

  @Get('metrics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '基本メトリクス取得（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: '基本メトリクスを返します',
  })
  async getMetrics(@Query() queryDto: AnalyticsQueryDto) {
    const dashboard = await this.analyticsService.getDashboard(queryDto);
    return {
      metrics: dashboard.metrics,
      period: dashboard.period,
    };
  }

  @Get('time-series')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '時系列データ取得（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: '時系列データを返します',
  })
  async getTimeSeries(@Query() queryDto: AnalyticsQueryDto) {
    const dashboard = await this.analyticsService.getDashboard(queryDto);
    return {
      timeSeries: dashboard.timeSeries,
      period: dashboard.period,
    };
  }

  @Get('top-products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '人気商品データ取得（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: '人気商品データを返します',
  })
  async getTopProducts(@Query() queryDto: AnalyticsQueryDto) {
    const dashboard = await this.analyticsService.getDashboard(queryDto);
    return {
      topProducts: dashboard.topProducts,
      period: dashboard.period,
    };
  }

  @Get('top-categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '人気カテゴリデータ取得（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: '人気カテゴリデータを返します',
  })
  async getTopCategories(@Query() queryDto: AnalyticsQueryDto) {
    const dashboard = await this.analyticsService.getDashboard(queryDto);
    return {
      topCategories: dashboard.topCategories,
      period: dashboard.period,
    };
  }

  @Get('user-behavior')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'ユーザー行動データ取得（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: 'ユーザー行動データを返します',
  })
  async getUserBehavior(@Query() queryDto: AnalyticsQueryDto) {
    const dashboard = await this.analyticsService.getDashboard(queryDto);
    return {
      userBehavior: dashboard.userBehavior,
      period: dashboard.period,
    };
  }

  // Real-time optimization endpoints
  @Get('realtime/metrics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'リアルタイムメトリクス取得', 
    description: '現在のアクティブユーザー、今日の注文、コンバージョン率などのリアルタイム指標'
  })
  @ApiResponse({
    status: 200,
    description: 'リアルタイムメトリクスを返します',
  })
  async getRealTimeMetrics() {
    return this.analyticsService.getRealTimeMetrics();
  }

  @Get('realtime/alerts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'パフォーマンスアラート取得',
    description: 'コンバージョン率低下、離脱率上昇などのパフォーマンス問題をリアルタイム検出'
  })
  @ApiResponse({
    status: 200,
    description: 'パフォーマンスアラート一覧を返します',
  })
  async getPerformanceAlerts() {
    return this.analyticsService.getPerformanceAlerts();
  }

  @Get('realtime/optimization-suggestions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'リアルタイム最適化提案',
    description: '現在のメトリクスを基にした即座実行可能な最適化提案をAIが生成'
  })
  @ApiResponse({
    status: 200,
    description: 'リアルタイム最適化提案を返します',
  })
  async getOptimizationSuggestions() {
    return this.analyticsService.getRealtimeOptimizationSuggestions();
  }

  @Get('realtime/dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'リアルタイム最適化ダッシュボード',
    description: 'リアルタイムメトリクス、アラート、最適化提案を統合したダッシュボード'
  })
  @ApiResponse({
    status: 200,
    description: 'リアルタイム最適化ダッシュボードを返します',
  })
  async getRealTimeDashboard() {
    const [metrics, alerts, suggestions] = await Promise.all([
      this.analyticsService.getRealTimeMetrics(),
      this.analyticsService.getPerformanceAlerts(),
      this.analyticsService.getRealtimeOptimizationSuggestions(),
    ]);

    return {
      realTimeMetrics: metrics,
      alerts,
      optimizationSuggestions: suggestions,
      dashboardUpdatedAt: new Date(),
      refreshRate: 30, // seconds
    };
  }
}
