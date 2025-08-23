import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsOptional, IsObject } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: '数量',
    example: 2,
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