import { IsEnum, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OptimizationType } from '../entities/optimization-result.entity';

export class OptimizationRequestDto {
  @ApiProperty({
    enum: OptimizationType,
    description: '最適化タイプ',
  })
  @IsEnum(OptimizationType)
  type: OptimizationType;

  @ApiProperty({
    description: '最適化対象の商品ID',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: '追加のメタデータ',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}