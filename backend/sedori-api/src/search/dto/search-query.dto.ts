import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProductCondition, ProductStatus } from '../../products/entities/product.entity';

export enum SearchSortBy {
  RELEVANCE = 'relevance',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  NEWEST = 'newest',
  POPULARITY = 'popularity',
  RATING = 'rating',
}

export enum SearchType {
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  ALL = 'all',
}

export class PriceRangeDto {
  @ApiProperty({ description: '最低価格', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min?: number;

  @ApiProperty({ description: '最高価格', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max?: number;
}

export class SearchQueryDto {
  @ApiProperty({
    description: '検索キーワード',
    required: false,
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    description: '検索タイプ',
    enum: SearchType,
    required: false,
    default: SearchType.PRODUCTS,
  })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.PRODUCTS;

  @ApiProperty({
    description: 'カテゴリID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    description: 'ブランド名（複数可）',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  brands?: string[];

  @ApiProperty({
    description: '商品状態',
    enum: ProductCondition,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @ApiProperty({
    description: '商品ステータス',
    enum: ProductStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiProperty({
    description: '価格範囲',
    type: PriceRangeDto,
    required: false,
  })
  @IsOptional()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;

  @ApiProperty({
    description: 'タグ（複数可）',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  @ApiProperty({
    description: '在庫があるもののみ',
    required: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  inStockOnly?: boolean = false;

  @ApiProperty({
    description: '最低評価',
    required: false,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiProperty({
    description: 'ソート順',
    enum: SearchSortBy,
    required: false,
    default: SearchSortBy.RELEVANCE,
  })
  @IsOptional()
  @IsEnum(SearchSortBy)
  sortBy?: SearchSortBy = SearchSortBy.RELEVANCE;

  @ApiProperty({
    description: 'ページ番号',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '1ページあたりの件数',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'ファセット情報を含める',
    required: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  includeFacets?: boolean = false;
}