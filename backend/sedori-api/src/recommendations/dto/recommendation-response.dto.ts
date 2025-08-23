import { ApiProperty } from '@nestjs/swagger';
import {
  RecommendationType,
  RecommendationPriority,
} from './recommendation-request.dto';

export class RecommendationItemDto {
  @ApiProperty({ description: '推奨項目ID' })
  id: string;

  @ApiProperty({ description: 'タイトル' })
  title: string;

  @ApiProperty({ description: '説明' })
  description: string;

  @ApiProperty({ description: '推奨理由' })
  reason: string;

  @ApiProperty({ description: '信頼度スコア (0-100)' })
  confidenceScore: number;

  @ApiProperty({ description: '優先度', enum: RecommendationPriority })
  priority: RecommendationPriority;

  @ApiProperty({ description: '推定ROI (%)' })
  estimatedROI?: number;

  @ApiProperty({ description: '推定利益' })
  estimatedProfit?: number;

  @ApiProperty({ description: 'リスクレベル (1-5)' })
  riskLevel: number;

  @ApiProperty({ description: '実装難易度 (1-5)' })
  implementationDifficulty: number;

  @ApiProperty({ description: '関連商品ID' })
  productId?: string;

  @ApiProperty({ description: '関連商品情報' })
  productInfo?: {
    name: string;
    currentPrice: number;
    suggestedPrice?: number;
    category: string;
    imageUrl?: string;
  };

  @ApiProperty({ description: '推奨アクション' })
  recommendedActions: string[];

  @ApiProperty({ description: '参考データ' })
  supportingData?: {
    marketTrend: string;
    competitorPricing: number[];
    demandScore: number;
    seasonalityFactor: number;
  };

  @ApiProperty({ description: '有効期限' })
  validUntil?: Date;

  @ApiProperty({ description: 'メタデータ' })
  metadata?: Record<string, any>;
}

export class RecommendationResponseDto {
  @ApiProperty({ description: '推奨タイプ', enum: RecommendationType })
  type: RecommendationType;

  @ApiProperty({ description: '生成日時' })
  generatedAt: Date;

  @ApiProperty({ description: '推奨項目一覧', type: [RecommendationItemDto] })
  recommendations: RecommendationItemDto[];

  @ApiProperty({ description: '総合スコア' })
  overallScore: number;

  @ApiProperty({ description: 'サマリー' })
  summary: {
    totalRecommendations: number;
    highPriorityCount: number;
    averageConfidence: number;
    estimatedTotalROI: number;
  };

  @ApiProperty({ description: 'AI洞察' })
  insights?: {
    marketCondition: string;
    seasonalTrends: string[];
    riskFactors: string[];
    opportunities: string[];
  };
}

export class PersonalizedRecommendationDto {
  @ApiProperty({ description: 'ユーザー固有の推奨' })
  personalizedRecommendations: RecommendationItemDto[];

  @ApiProperty({ description: 'ユーザーパフォーマンス' })
  userPerformance: {
    successRate: number;
    averageROI: number;
    preferredCategories: string[];
    riskTolerance: 'low' | 'medium' | 'high';
  };

  @ApiProperty({ description: '学習済みパターン' })
  learnedPatterns: {
    bestPerformingStrategies: string[];
    timeOfDayPreferences: string[];
    seasonalPreferences: string[];
  };
}
