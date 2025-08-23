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
import {
  AnalyticsQueryDto,
  AnalyticsDashboardDto,
  TrackEventDto,
} from './dto';

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
    @Request() req: any,
    @Body() trackEventDto: TrackEventDto,
  ): Promise<{ success: boolean }> {
    const userId = req.user?.id;
    await this.analyticsService.trackEvent(userId, trackEventDto);
    return { success: true };
  }

  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'アナリティクスダッシュボード取得（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: 'アナリティクスダッシュボードデータを返します',
    type: AnalyticsDashboardDto,
  })
  async getDashboard(
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
}