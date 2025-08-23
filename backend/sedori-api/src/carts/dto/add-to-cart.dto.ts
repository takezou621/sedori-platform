import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsOptional, IsObject } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    description: '商品ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: '数量',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: '追加のメタデータ',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}