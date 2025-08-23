import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus, ProductCondition } from '../entities/product.entity';

export class ProductResponseDto {
  @ApiProperty({ description: '商品ID' })
  id: string;

  @ApiProperty({ description: '商品名' })
  name: string;

  @ApiProperty({ description: '商品説明', required: false })
  description?: string;

  @ApiProperty({ description: 'SKU（商品管理番号）', required: false })
  sku?: string;

  @ApiProperty({ description: 'ブランド名', required: false })
  brand?: string;

  @ApiProperty({ description: 'モデル名', required: false })
  model?: string;

  @ApiProperty({ description: 'カテゴリID' })
  categoryId: string;

  @ApiProperty({ description: 'カテゴリ情報', required: false })
  category?: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: '仕入れ価格' })
  wholesalePrice: number;

  @ApiProperty({ description: '小売価格', required: false })
  retailPrice?: number;

  @ApiProperty({ description: '市場価格', required: false })
  marketPrice?: number;

  @ApiProperty({ description: '通貨' })
  currency: string;

  @ApiProperty({ description: '商品状態', enum: ProductCondition })
  condition: ProductCondition;

  @ApiProperty({ description: '商品ステータス', enum: ProductStatus })
  status: ProductStatus;

  @ApiProperty({ description: '仕入れ先' })
  supplier: string;

  @ApiProperty({ description: '仕入れ先URL', required: false })
  supplierUrl?: string;

  @ApiProperty({ description: '在庫数量', required: false })
  stockQuantity?: number;

  @ApiProperty({ description: '最小注文数量', required: false })
  minOrderQuantity?: number;

  @ApiProperty({ description: '最大注文数量', required: false })
  maxOrderQuantity?: number;

  @ApiProperty({ description: '重量', required: false })
  weight?: number;

  @ApiProperty({ description: '重量単位' })
  weightUnit: string;

  @ApiProperty({ description: '寸法', required: false })
  dimensions?: string;

  @ApiProperty({ description: '画像URL一覧', required: false, type: [String] })
  images?: string[];

  @ApiProperty({ description: 'メイン画像URL', required: false })
  primaryImageUrl?: string;

  @ApiProperty({ description: '商品仕様（JSON）', required: false })
  specifications?: Record<string, any>;

  @ApiProperty({ description: 'タグ一覧', required: false, type: [String] })
  tags?: string[];

  @ApiProperty({ description: '閲覧数' })
  viewCount: number;

  @ApiProperty({ description: '平均評価' })
  averageRating: number;

  @ApiProperty({ description: 'レビュー数' })
  reviewCount: number;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  updatedAt: Date;

  @ApiProperty({ description: '最終更新日時', required: false })
  lastUpdatedAt?: Date;

  @ApiProperty({ description: '市場データ', required: false })
  marketData?: {
    amazonPrice?: number;
    rakutenPrice?: number;
    yahooPrice?: number;
    mercariPrice?: number;
    averageSellingPrice?: number;
    competitorCount?: number;
    demandScore?: number;
    trendScore?: number;
    lastScrapedAt?: Date;
  };

  @ApiProperty({ description: '収益性データ', required: false })
  profitabilityData?: {
    estimatedProfit?: number;
    profitMargin?: number;
    roi?: number;
    breakEvenDays?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    calculatedAt?: Date;
  };

  @ApiProperty({ description: 'メタデータ（JSON）', required: false })
  metadata?: Record<string, any>;
}
