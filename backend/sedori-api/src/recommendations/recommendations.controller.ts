import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecommendationType, RecommendationStatus } from './entities/recommendation.entity';
import {
  RecommendationRequestDto,
  RecommendationResponseDto,
  RecommendationItemDto,
  PersonalizedRecommendationDto,
} from './dto';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'AI推奨生成' })
  @ApiResponse({
    status: 201,
    description: 'AI推奨が生成されました',
    type: RecommendationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'AI推奨機能にアクセスできません' })
  async generateRecommendations(
    @Request() req: any,
    @Body() recommendationRequestDto: RecommendationRequestDto,
  ): Promise<RecommendationResponseDto> {
    const userId = req.user.id;
    return this.recommendationsService.generateRecommendations(userId, recommendationRequestDto);
  }

  @Get('personalized')
  @ApiOperation({ summary: 'パーソナライズ推奨取得' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '推奨件数' })
  @ApiResponse({
    status: 200,
    description: 'パーソナライズされた推奨を返します',
    type: PersonalizedRecommendationDto,
  })
  @ApiResponse({ status: 403, description: 'AI推奨機能にアクセスできません' })
  async getPersonalizedRecommendations(
    @Request() req: any,
    @Query('limit') limit = 10,
  ): Promise<PersonalizedRecommendationDto> {
    const userId = req.user.id;
    return this.recommendationsService.getPersonalizedRecommendations(userId, Number(limit));
  }

  @Get('my-recommendations')
  @ApiOperation({ summary: '自分の推奨一覧取得' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'ページ番号' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '1ページあたりの件数' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: RecommendationType,
    description: '推奨タイプフィルタ',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RecommendationStatus,
    description: 'ステータスフィルタ',
  })
  @ApiResponse({
    status: 200,
    description: '推奨一覧を返します',
  })
  async getMyRecommendations(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: RecommendationType,
    @Query('status') status?: RecommendationStatus,
  ): Promise<{
    data: RecommendationItemDto[];
    pagination: any;
  }> {
    const userId = req.user.id;
    return this.recommendationsService.getUserRecommendations(
      userId,
      Number(page),
      Number(limit),
      type,
      status,
    );
  }

  @Put(':id/viewed')
  @ApiOperation({ summary: '推奨を閲覧済みとしてマーク' })
  @ApiParam({ name: 'id', description: '推奨ID' })
  @ApiResponse({
    status: 200,
    description: '推奨が閲覧済みとしてマークされました',
  })
  @ApiResponse({ status: 404, description: '推奨が見つかりません' })
  async markAsViewed(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    await this.recommendationsService.markRecommendationAsViewed(userId, id);
    return { message: '推奨が閲覧済みとしてマークされました' };
  }

  @Put(':id/clicked')
  @ApiOperation({ summary: '推奨をクリック済みとしてマーク' })
  @ApiParam({ name: 'id', description: '推奨ID' })
  @ApiResponse({
    status: 200,
    description: '推奨がクリック済みとしてマークされました',
  })
  @ApiResponse({ status: 404, description: '推奨が見つかりません' })
  async markAsClicked(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    await this.recommendationsService.markRecommendationAsClicked(userId, id);
    return { message: '推奨がクリック済みとしてマークされました' };
  }

  @Post('quick-insights')
  @ApiOperation({
    summary: 'クイック市場インサイト',
    description: '現在の市場状況と推奨アクションを即座に提供（デモ機能）',
  })
  @ApiResponse({
    status: 201,
    description: 'クイック市場インサイトを返します',
  })
  async getQuickInsights(@Request() req: any): Promise<{
    marketOverview: any;
    topRecommendations: RecommendationItemDto[];
    urgentActions: string[];
    opportunities: string[];
  }> {
    const userId = req.user.id;

    // Generate quick insights across all recommendation types
    const allTypes = [
      'product_discovery',
      'pricing_strategy',
      'inventory_optimization',
      'market_opportunity',
      'seasonal_trend',
    ] as any[];

    const quickRecommendations = [];
    
    for (const type of allTypes.slice(0, 3)) { // Get top 3 types
      const recommendations = await this.recommendationsService.generateRecommendations(userId, {
        type,
        limit: 2,
      });
      quickRecommendations.push(...recommendations.recommendations.slice(0, 2));
    }

    return {
      marketOverview: {
        condition: 'やや好調',
        trendDirection: 'up',
        confidence: 78,
        lastUpdated: new Date(),
      },
      topRecommendations: quickRecommendations,
      urgentActions: [
        '在庫切れ商品の補充',
        '競合価格のモニタリング',
        '季節商品の準備開始',
      ],
      opportunities: [
        'ゲーム機器の需要急増',
        '健康関連商品の安定需要',
        'キッチン用品の年末需要',
      ],
    };
  }
}