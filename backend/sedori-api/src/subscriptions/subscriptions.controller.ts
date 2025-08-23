import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { SubscriptionPlan } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsageType } from './entities/subscription-usage.entity';
import {
  SubscriptionRequestDto,
  SubscriptionUpdateDto,
  SubscriptionResponseDto,
  SubscriptionUsageResponseDto,
  SubscriptionPlanInfoDto,
} from './dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'サブスクリプション作成' })
  @ApiResponse({
    status: 201,
    description: 'サブスクリプションが作成されました',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: '既にアクティブなサブスクリプションがあります' })
  async createSubscription(
    @Request() req: any,
    @Body() subscriptionRequestDto: SubscriptionRequestDto,
  ): Promise<SubscriptionResponseDto> {
    const userId = req.user.id;
    return this.subscriptionsService.createSubscription(userId, subscriptionRequestDto);
  }

  @Get('my-subscription')
  @ApiOperation({ summary: '自分のサブスクリプション情報取得' })
  @ApiResponse({
    status: 200,
    description: 'サブスクリプション情報を返します',
    type: SubscriptionResponseDto,
  })
  async getMySubscription(@Request() req: any): Promise<SubscriptionResponseDto> {
    const userId = req.user.id;
    return this.subscriptionsService.getUserSubscription(userId);
  }

  @Put('my-subscription')
  @ApiOperation({ summary: 'サブスクリプション更新' })
  @ApiResponse({
    status: 200,
    description: 'サブスクリプションが更新されました',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'アクティブなサブスクリプションがありません' })
  async updateSubscription(
    @Request() req: any,
    @Body() subscriptionUpdateDto: SubscriptionUpdateDto,
  ): Promise<SubscriptionResponseDto> {
    const userId = req.user.id;
    return this.subscriptionsService.updateSubscription(userId, subscriptionUpdateDto);
  }

  @Delete('my-subscription')
  @ApiOperation({ summary: 'サブスクリプションキャンセル' })
  @ApiResponse({
    status: 200,
    description: 'サブスクリプションがキャンセルされました',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: '無料プランはキャンセルできません' })
  @ApiResponse({ status: 404, description: 'アクティブなサブスクリプションがありません' })
  async cancelSubscription(
    @Request() req: any,
    @Body('reason') reason: string,
  ): Promise<SubscriptionResponseDto> {
    const userId = req.user.id;
    return this.subscriptionsService.cancelSubscription(userId, reason);
  }

  @Get('usage-history')
  @ApiOperation({ summary: '使用履歴取得' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'ページ番号' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '1ページあたりの件数' })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    enum: UsageType, 
    description: '使用タイプフィルタ' 
  })
  @ApiResponse({
    status: 200,
    description: '使用履歴一覧を返します',
  })
  async getUsageHistory(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: UsageType,
  ): Promise<{
    data: SubscriptionUsageResponseDto[];
    pagination: any;
  }> {
    const userId = req.user.id;
    return this.subscriptionsService.getUserUsageHistory(
      userId,
      Number(page),
      Number(limit),
      type,
    );
  }

  @Get('plans')
  @ApiOperation({ 
    summary: '利用可能プラン一覧取得', 
    description: '全ての利用可能なサブスクリプションプランを取得' 
  })
  @ApiResponse({
    status: 200,
    description: '利用可能なプラン一覧を返します',
    type: [SubscriptionPlanInfoDto],
  })
  async getAvailablePlans(): Promise<SubscriptionPlanInfoDto[]> {
    return this.subscriptionsService.getAvailablePlans();
  }

  @Post('usage/track')
  @ApiOperation({ 
    summary: '使用量トラッキング', 
    description: 'API使用量やリクエスト数などをトラッキング（システム内部用）' 
  })
  @ApiResponse({
    status: 201,
    description: '使用量が記録されました',
  })
  @ApiResponse({ status: 403, description: '使用上限に達しました' })
  async trackUsage(
    @Request() req: any,
    @Body() trackingData: {
      type: UsageType;
      quantity?: number;
      resource?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    const { type, quantity = 1, resource, metadata } = trackingData;

    await this.subscriptionsService.trackUsage(
      userId,
      type,
      quantity,
      resource,
      metadata,
    );

    return { message: '使用量が記録されました' };
  }

  @Get('upgrade-preview/:plan')
  @ApiOperation({ 
    summary: 'プラン変更プレビュー',
    description: '指定したプランに変更した場合の料金や機能の比較を表示'
  })
  @ApiParam({ name: 'plan', description: '変更予定のプラン' })
  @ApiResponse({
    status: 200,
    description: 'プラン変更プレビュー情報を返します',
  })
  async getUpgradePreview(
    @Request() req: any,
    @Param('plan') targetPlan: string,
  ): Promise<{
    currentPlan: SubscriptionPlanInfoDto;
    targetPlan: SubscriptionPlanInfoDto;
    comparison: {
      featureDifferences: string[];
      priceChange: {
        monthly: number;
        yearly: number;
      };
      recommendedBillingCycle: string;
    };
  }> {
    const userId = req.user.id;
    const currentSubscription = await this.subscriptionsService.getUserSubscription(userId);
    const availablePlans = await this.subscriptionsService.getAvailablePlans();

    const currentPlanInfo = availablePlans.find(p => p.plan === currentSubscription.plan);
    const targetPlanInfo = availablePlans.find(p => p.plan === targetPlan);

    if (!targetPlanInfo) {
      throw new Error('指定されたプランが見つかりません');
    }

    // Generate feature differences
    const featureDifferences = [];
    if (currentPlanInfo && targetPlanInfo.features.maxOptimizations > currentPlanInfo.features.maxOptimizations) {
      featureDifferences.push(`最適化回数: ${currentPlanInfo.features.maxOptimizations} → ${targetPlanInfo.features.maxOptimizations}`);
    }
    if (currentPlanInfo && targetPlanInfo.features.hasAIRecommendations && !currentPlanInfo.features.hasAIRecommendations) {
      featureDifferences.push('AI推奨機能が利用可能になります');
    }
    if (currentPlanInfo && targetPlanInfo.features.hasAdvancedAnalytics && !currentPlanInfo.features.hasAdvancedAnalytics) {
      featureDifferences.push('高度な分析機能が利用可能になります');
    }

    return {
      currentPlan: currentPlanInfo || this.getDefaultPlanInfo(),
      targetPlan: targetPlanInfo,
      comparison: {
        featureDifferences,
        priceChange: currentPlanInfo ? {
          monthly: targetPlanInfo.monthlyPrice - currentPlanInfo.monthlyPrice,
          yearly: targetPlanInfo.yearlyPrice - currentPlanInfo.yearlyPrice,
        } : {
          monthly: targetPlanInfo.monthlyPrice,
          yearly: targetPlanInfo.yearlyPrice,
        },
        recommendedBillingCycle: targetPlanInfo.yearlyDiscount > 0 ? 'yearly' : 'monthly',
      },
    };
  }

  private getDefaultPlanInfo(): SubscriptionPlanInfoDto {
    return {
      plan: SubscriptionPlan.FREE,
      displayName: 'Free',
      description: 'Basic free plan with limited features',
      monthlyPrice: 0,
      yearlyPrice: 0,
      yearlyDiscount: 0,
      features: {
        maxOptimizations: 3,
        maxProducts: 10,
        maxApiCalls: 100,
        hasAdvancedAnalytics: false,
        hasAIRecommendations: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
      },
      isPopular: false,
      isCustom: false,
    };
  }
}