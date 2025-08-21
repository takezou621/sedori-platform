import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, ProductCondition } from '../entities/product.entity';

export enum ProductSortBy {
  NAME = 'name',
  PRICE = 'wholesalePrice',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  VIEW_COUNT = 'viewCount',
  RATING = 'averageRating',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ProductQueryDto {
  @ApiProperty({
    description: 'ページ番号',
    required: false,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '1ページあたりの件数',
    required: false,
    minimum: 1,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({
    description: 'キーワード検索（商品名、説明、ブランド、モデル）',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'カテゴリID', required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    description: '商品ステータス',
    enum: ProductStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiProperty({
    description: '商品状態',
    enum: ProductCondition,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @ApiProperty({ description: 'ブランド名', required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ description: '仕入れ先', required: false })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiProperty({ description: '最小価格', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiProperty({ description: '最大価格', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiProperty({
    description: 'ソート項目',
    enum: ProductSortBy,
    required: false,
    default: ProductSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy = ProductSortBy.CREATED_AT;

  @ApiProperty({
    description: 'ソート順',
    enum: SortOrder,
    required: false,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
