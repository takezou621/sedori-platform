import { ApiProperty } from '@nestjs/swagger';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
} from '../entities/subscription.entity';

export class SubscriptionResponseDto {
  @ApiProperty({ description: 'サブスクリプションID' })
  id: string;

  @ApiProperty({ description: 'ユーザーID' })
  userId: string;

  @ApiProperty({ description: 'プラン', enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  @ApiProperty({ description: 'ステータス', enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty({ description: '請求サイクル', enum: BillingCycle })
  billingCycle: BillingCycle;

  @ApiProperty({ description: '月額料金' })
  monthlyPrice?: number;

  @ApiProperty({ description: '年額料金' })
  yearlyPrice?: number;

  @ApiProperty({ description: '開始日' })
  startDate?: Date;

  @ApiProperty({ description: '終了日' })
  endDate?: Date;

  @ApiProperty({ description: 'トライアル終了日' })
  trialEndDate?: Date;

  @ApiProperty({ description: '次回請求日' })
  nextBillingDate?: Date;

  @ApiProperty({ description: 'キャンセル日時' })
  cancelledAt?: Date;

  @ApiProperty({ description: 'キャンセル理由' })
  cancellationReason?: string;

  @ApiProperty({ description: '最大最適化回数' })
  maxOptimizations: number;

  @ApiProperty({ description: '最大商品数' })
  maxProducts: number;

  @ApiProperty({ description: '最大API呼び出し数' })
  maxApiCalls: number;

  @ApiProperty({ description: '高度な分析機能' })
  hasAdvancedAnalytics: boolean;

  @ApiProperty({ description: 'AI推奨機能' })
  hasAIRecommendations: boolean;

  @ApiProperty({ description: '優先サポート' })
  hasPrioritySupport: boolean;

  @ApiProperty({ description: 'ホワイトラベル' })
  hasWhiteLabel: boolean;

  @ApiProperty({ description: '現在の最適化使用回数' })
  currentOptimizations: number;

  @ApiProperty({ description: '現在のAPI使用回数' })
  currentApiCalls: number;

  @ApiProperty({ description: '使用量リセット日' })
  usageResetDate?: Date;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  updatedAt: Date;
}

export class SubscriptionUsageResponseDto {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiProperty({ description: 'サブスクリプションID' })
  subscriptionId: string;

  @ApiProperty({ description: 'ユーザーID' })
  userId: string;

  @ApiProperty({ description: '使用タイプ' })
  type: string;

  @ApiProperty({ description: '使用量' })
  quantity: number;

  @ApiProperty({ description: '使用日時' })
  usageDate: Date;

  @ApiProperty({ description: 'リソース' })
  resource?: string;

  @ApiProperty({ description: 'メタデータ' })
  metadata?: Record<string, any>;
}

export class SubscriptionPlanInfoDto {
  @ApiProperty({ description: 'プラン名', enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  @ApiProperty({ description: 'プラン表示名' })
  displayName: string;

  @ApiProperty({ description: 'プラン説明' })
  description: string;

  @ApiProperty({ description: '月額料金' })
  monthlyPrice: number;

  @ApiProperty({ description: '年額料金' })
  yearlyPrice: number;

  @ApiProperty({ description: '年間割引率' })
  yearlyDiscount: number;

  @ApiProperty({ description: '機能一覧' })
  features: {
    maxOptimizations: number;
    maxProducts: number;
    maxApiCalls: number;
    hasAdvancedAnalytics: boolean;
    hasAIRecommendations: boolean;
    hasPrioritySupport: boolean;
    hasWhiteLabel: boolean;
  };

  @ApiProperty({ description: '人気プランかどうか' })
  isPopular: boolean;

  @ApiProperty({ description: 'カスタムプランかどうか' })
  isCustom: boolean;
}
