import { ApiProperty } from '@nestjs/swagger';

export class SearchFacetValueDto {
  @ApiProperty({ description: 'ファセット値' })
  value: string;

  @ApiProperty({ description: '件数' })
  count: number;

  @ApiProperty({ description: '選択済みかどうか' })
  selected: boolean;
}

export class SearchFacetDto {
  @ApiProperty({ description: 'ファセット名' })
  name: string;

  @ApiProperty({ description: 'ファセットラベル' })
  label: string;

  @ApiProperty({ description: 'ファセット値', type: [SearchFacetValueDto] })
  values: SearchFacetValueDto[];
}

export class SearchProductDto {
  @ApiProperty({ description: '商品ID' })
  id: string;

  @ApiProperty({ description: '商品名' })
  name: string;

  @ApiProperty({ description: '商品説明', required: false })
  description?: string;

  @ApiProperty({ description: 'SKU', required: false })
  sku?: string;

  @ApiProperty({ description: 'ブランド', required: false })
  brand?: string;

  @ApiProperty({ description: 'モデル', required: false })
  model?: string;

  @ApiProperty({ description: 'カテゴリID' })
  categoryId: string;

  @ApiProperty({ description: 'カテゴリ名', required: false })
  categoryName?: string;

  @ApiProperty({ description: '卸売価格' })
  wholesalePrice: number;

  @ApiProperty({ description: '小売価格', required: false })
  retailPrice?: number;

  @ApiProperty({ description: '市場価格', required: false })
  marketPrice?: number;

  @ApiProperty({ description: '通貨' })
  currency: string;

  @ApiProperty({ description: '商品状態' })
  condition: string;

  @ApiProperty({ description: '商品ステータス' })
  status: string;

  @ApiProperty({ description: 'サプライヤー' })
  supplier: string;

  @ApiProperty({ description: '在庫数', required: false })
  stockQuantity?: number;

  @ApiProperty({ description: 'プライマリ画像URL', required: false })
  primaryImageUrl?: string;

  @ApiProperty({ description: 'タグ', required: false })
  tags?: string[];

  @ApiProperty({ description: '平均評価' })
  averageRating: number;

  @ApiProperty({ description: 'レビュー数' })
  reviewCount: number;

  @ApiProperty({ description: '検索スコア', required: false })
  searchScore?: number;

  @ApiProperty({ description: 'ハイライト', required: false })
  highlights?: {
    name?: string[];
    description?: string[];
    brand?: string[];
  };
}

export class SearchCategoryDto {
  @ApiProperty({ description: 'カテゴリID' })
  id: string;

  @ApiProperty({ description: 'カテゴリ名' })
  name: string;

  @ApiProperty({ description: 'スラッグ' })
  slug: string;

  @ApiProperty({ description: '説明', required: false })
  description?: string;

  @ApiProperty({ description: '画像URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: '商品数', required: false })
  productCount?: number;

  @ApiProperty({ description: '検索スコア', required: false })
  searchScore?: number;

  @ApiProperty({ description: 'ハイライト', required: false })
  highlights?: {
    name?: string[];
    description?: string[];
  };
}

export class SearchResultsDto {
  @ApiProperty({ description: '商品検索結果', type: [SearchProductDto] })
  products: SearchProductDto[];

  @ApiProperty({ description: 'カテゴリ検索結果', type: [SearchCategoryDto] })
  categories: SearchCategoryDto[];

  @ApiProperty({ description: '総件数' })
  total: number;

  @ApiProperty({ description: 'ページ情報' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({ description: 'ファセット情報', type: [SearchFacetDto], required: false })
  facets?: SearchFacetDto[];

  @ApiProperty({ description: '検索にかかった時間（ミリ秒）' })
  searchTime: number;

  @ApiProperty({ description: '検索クエリ' })
  query: string;

  @ApiProperty({ description: '検索提案', required: false })
  suggestions?: string[];
}