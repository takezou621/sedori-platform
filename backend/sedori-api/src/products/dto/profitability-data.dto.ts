import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export class UpdateProfitabilityDataDto {
  @ApiProperty({ description: '推定利益', required: false, example: 25000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estimatedProfit?: number;

  @ApiProperty({ description: '利益率（%）', required: false, example: 20.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  profitMargin?: number;

  @ApiProperty({ description: 'ROI（%）', required: false, example: 15.8 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  roi?: number;

  @ApiProperty({ description: '損益分岐点日数', required: false, example: 30 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  breakEvenDays?: number;

  @ApiProperty({
    description: 'リスクレベル',
    enum: RiskLevel,
    required: false,
    example: RiskLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiProperty({ description: '計算日時', required: false })
  @IsOptional()
  @IsDateString()
  calculatedAt?: string;
}
