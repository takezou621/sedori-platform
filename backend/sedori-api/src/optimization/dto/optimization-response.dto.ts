import { ApiProperty } from '@nestjs/swagger';
import {
  OptimizationType,
  OptimizationStatus,
} from '../entities/optimization-result.entity';

export class OptimizationResponseDto {
  @ApiProperty({ description: '最適化結果ID' })
  id: string;

  @ApiProperty({ description: 'ユーザーID' })
  userId: string;

  @ApiProperty({ description: '商品ID' })
  productId: string;

  @ApiProperty({ description: '最適化タイプ', enum: OptimizationType })
  type: OptimizationType;

  @ApiProperty({ description: 'ステータス', enum: OptimizationStatus })
  status: OptimizationStatus;

  @ApiProperty({ description: '現在価格' })
  currentPrice?: number;

  @ApiProperty({ description: '現在利益' })
  currentProfit?: number;

  @ApiProperty({ description: '現在在庫' })
  currentInventory?: number;

  @ApiProperty({ description: '現在利益率' })
  currentMarginPercentage?: number;

  @ApiProperty({ description: '推奨価格' })
  recommendedPrice?: number;

  @ApiProperty({ description: '予想利益' })
  projectedProfit?: number;

  @ApiProperty({ description: '推奨在庫' })
  recommendedInventory?: number;

  @ApiProperty({ description: '予想利益率' })
  projectedMarginPercentage?: number;

  @ApiProperty({ description: '市場分析データ' })
  marketAnalysis?: {
    competitorPrices: { source: string; price: number; timestamp: Date }[];
    demandScore: number;
    seasonalityFactor: number;
    priceElasticity: number;
    marketTrend: 'rising' | 'falling' | 'stable';
  };

  @ApiProperty({ description: '最適化インサイト' })
  optimizationInsights?: {
    reason: string;
    confidence: number;
    potentialImpact: string;
    riskFactors: string[];
    timeToImplement: string;
    expectedROI: number;
  };

  @ApiProperty({ description: '信頼度スコア' })
  confidenceScore?: number;

  @ApiProperty({ description: '実装日時' })
  implementedAt?: Date;

  @ApiProperty({ description: '実際の結果' })
  actualResult?: number;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  updatedAt: Date;
}

export class PaginatedOptimizationResult {
  @ApiProperty({ type: [OptimizationResponseDto] })
  data: OptimizationResponseDto[];

  @ApiProperty({
    description: 'ページネーション情報',
    type: 'object',
    properties: {
      page: { type: 'number', description: '現在のページ' },
      limit: { type: 'number', description: '1ページあたりの件数' },
      total: { type: 'number', description: '総件数' },
      totalPages: { type: 'number', description: '総ページ数' },
      hasNext: { type: 'boolean', description: '次のページがあるか' },
      hasPrev: { type: 'boolean', description: '前のページがあるか' },
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
