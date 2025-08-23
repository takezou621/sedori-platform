import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ description: 'カテゴリID' })
  id: string;

  @ApiProperty({ description: 'カテゴリ名' })
  name: string;

  @ApiProperty({ description: 'URL用スラッグ' })
  slug: string;

  @ApiProperty({ description: 'カテゴリ説明', required: false })
  description?: string;

  @ApiProperty({ description: 'カテゴリ画像URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'ソート順序' })
  sortOrder: number;

  @ApiProperty({ description: 'アクティブ状態' })
  isActive: boolean;

  @ApiProperty({ description: '親カテゴリID', required: false })
  parentId?: string;

  @ApiProperty({ description: '親カテゴリ情報', required: false })
  parent?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty({ description: '子カテゴリ一覧', required: false, type: Array })
  children?: CategoryResponseDto[];

  @ApiProperty({ description: '商品数', required: false })
  productCount?: number;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  updatedAt: Date;

  @ApiProperty({ description: 'メタデータ（JSON）', required: false })
  metadata?: Record<string, any>;
}
