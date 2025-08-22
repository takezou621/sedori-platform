import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsArray,
  IsUrl,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, ProductCondition } from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ description: '商品名', example: 'iPhone 14 Pro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '商品説明',
    required: false,
    example: 'Apple iPhone 14 Pro 128GB スペースブラック',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'SKU（商品管理番号）',
    required: false,
    example: 'IPHONE14PRO-128-BLACK',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ description: 'ブランド名', required: false, example: 'Apple' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    description: 'モデル名',
    required: false,
    example: 'iPhone 14 Pro',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    description: 'カテゴリID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: '仕入れ価格', example: 120000 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  wholesalePrice: number;

  @ApiProperty({ description: '小売価格', required: false, example: 149800 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  retailPrice?: number;

  @ApiProperty({ description: '市場価格', required: false, example: 145000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  marketPrice?: number;

  @ApiProperty({ description: '通貨', example: 'JPY', default: 'JPY' })
  @IsOptional()
  @IsString()
  currency?: string = 'JPY';

  @ApiProperty({
    description: '商品状態',
    enum: ProductCondition,
    example: ProductCondition.NEW,
  })
  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition = ProductCondition.NEW;

  @ApiProperty({
    description: '商品ステータス',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus = ProductStatus.ACTIVE;

  @ApiProperty({ description: '仕入れ先', example: 'Amazon Business' })
  @IsString()
  @IsNotEmpty()
  supplier: string;

  @ApiProperty({
    description: '仕入れ先URL',
    required: false,
    example: 'https://business.amazon.co.jp/dp/B0BDHB9Y8P',
  })
  @IsOptional()
  @IsUrl()
  supplierUrl?: string;

  @ApiProperty({ description: '在庫数量', required: false, example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  stockQuantity?: number;

  @ApiProperty({ description: '最小注文数量', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  minOrderQuantity?: number;

  @ApiProperty({ description: '最大注文数量', required: false, example: 100 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxOrderQuantity?: number;

  @ApiProperty({ description: '重量', required: false, example: 0.206 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  weight?: number;

  @ApiProperty({ description: '重量単位', example: 'kg', default: 'kg' })
  @IsOptional()
  @IsString()
  weightUnit?: string = 'kg';

  @ApiProperty({
    description: '寸法',
    required: false,
    example: '147.5×71.5×7.85mm',
  })
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiProperty({ description: '画像URL一覧', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiProperty({ description: 'メイン画像URL', required: false })
  @IsOptional()
  @IsUrl()
  primaryImageUrl?: string;

  @ApiProperty({
    description: '商品仕様（JSON）',
    required: false,
    example: { color: 'スペースブラック', storage: '128GB' },
  })
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiProperty({
    description: 'タグ一覧',
    required: false,
    type: [String],
    example: ['スマートフォン', 'iPhone', 'Apple'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'メタデータ（JSON）', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
