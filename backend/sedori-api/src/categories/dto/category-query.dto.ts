import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsUUID,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum CategorySortBy {
  NAME = 'name',
  SLUG = 'slug',
  SORT_ORDER = 'sortOrder',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  PRODUCT_COUNT = 'productCount',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class CategoryQueryDto {
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
    description: 'キーワード検索（カテゴリ名、説明、スラッグ）',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: '親カテゴリID（階層フィルタ）',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({
    description: 'アクティブ状態フィルタ',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'ルートカテゴリのみ表示（親なし）',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  @IsBoolean()
  rootOnly?: boolean;

  @ApiProperty({
    description: '子カテゴリを含める',
    required: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  @IsBoolean()
  includeChildren?: boolean = false;

  @ApiProperty({
    description: '商品数を含める',
    required: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  @IsBoolean()
  includeProductCount?: boolean = false;

  @ApiProperty({
    description: 'ソート項目',
    enum: CategorySortBy,
    required: false,
    default: CategorySortBy.SORT_ORDER,
  })
  @IsOptional()
  @IsEnum(CategorySortBy)
  sortBy?: CategorySortBy = CategorySortBy.SORT_ORDER;

  @ApiProperty({
    description: 'ソート順',
    enum: SortOrder,
    required: false,
    default: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}
