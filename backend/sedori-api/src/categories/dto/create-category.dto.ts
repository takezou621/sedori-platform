import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsUrl,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'カテゴリ名',
    example: 'スマートフォン',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    description: 'URL用スラッグ（一意）',
    example: 'smartphones',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  slug: string;

  @ApiProperty({
    description: 'カテゴリ説明',
    required: false,
    example: 'スマートフォン関連の商品カテゴリ',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'カテゴリ画像URL',
    required: false,
    example: 'https://example.com/category-image.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({
    description: 'ソート順序',
    required: false,
    example: 10,
    minimum: 0,
    maximum: 9999,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(9999)
  sortOrder?: number = 0;

  @ApiProperty({
    description: 'アクティブ状態',
    required: false,
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({
    description: '親カテゴリID（階層構造用）',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({
    description: 'メタデータ（JSON）',
    required: false,
    example: { color: '#blue', icon: 'smartphone' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
