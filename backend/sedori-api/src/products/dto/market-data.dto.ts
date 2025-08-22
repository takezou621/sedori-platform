import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMarketDataDto {
  @ApiProperty({ description: 'Amazon価格', required: false, example: 149800 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  amazonPrice?: number;

  @ApiProperty({ description: '楽天価格', required: false, example: 145000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  rakutenPrice?: number;

  @ApiProperty({ description: 'Yahoo価格', required: false, example: 147000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  yahooPrice?: number;

  @ApiProperty({
    description: 'メルカリ価格',
    required: false,
    example: 130000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  mercariPrice?: number;

  @ApiProperty({
    description: '平均販売価格',
    required: false,
    example: 142950,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  averageSellingPrice?: number;

  @ApiProperty({ description: '競合者数', required: false, example: 25 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  competitorCount?: number;

  @ApiProperty({
    description: '需要スコア（0-100）',
    required: false,
    example: 75,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  demandScore?: number;

  @ApiProperty({
    description: 'トレンドスコア（0-100）',
    required: false,
    example: 85,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  trendScore?: number;

  @ApiProperty({ description: '最終スクレイピング日時', required: false })
  @IsOptional()
  @IsDateString()
  lastScrapedAt?: string;
}
