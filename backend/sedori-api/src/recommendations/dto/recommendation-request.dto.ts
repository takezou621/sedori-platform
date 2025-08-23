import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RecommendationType {
  PRODUCT_DISCOVERY = 'product_discovery',
  PRICING_STRATEGY = 'pricing_strategy',
  INVENTORY_OPTIMIZATION = 'inventory_optimization',
  MARKET_OPPORTUNITY = 'market_opportunity',
  SEASONAL_TREND = 'seasonal_trend',
}

export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class RecommendationRequestDto {
  @ApiProperty({
    enum: RecommendationType,
    description: '推奨タイプ',
  })
  @IsEnum(RecommendationType)
  type: RecommendationType;

  @ApiProperty({
    description: '対象商品ID（オプション）',
    required: false,
  })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({
    description: '対象カテゴリID（オプション）',
    required: false,
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: '予算上限（オプション）',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  budgetLimit?: number;

  @ApiProperty({
    description: '推奨件数',
    default: 10,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({
    description: '追加フィルタ条件',
    required: false,
  })
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}
