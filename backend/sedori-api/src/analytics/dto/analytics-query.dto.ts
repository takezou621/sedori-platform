import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AnalyticsEventType } from '../entities/analytics-event.entity';

export enum AnalyticsTimeRange {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  CUSTOM = 'custom',
}

export enum AnalyticsGroupBy {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class AnalyticsQueryDto {
  @ApiProperty({
    description: '時間範囲',
    enum: AnalyticsTimeRange,
    required: false,
    default: AnalyticsTimeRange.LAST_7_DAYS,
  })
  @IsOptional()
  @IsEnum(AnalyticsTimeRange)
  timeRange?: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7_DAYS;

  @ApiProperty({
    description: '開始日（YYYY-MM-DD）',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: '終了日（YYYY-MM-DD）',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'イベントタイプ',
    enum: AnalyticsEventType,
    required: false,
  })
  @IsOptional()
  @IsEnum(AnalyticsEventType)
  eventType?: AnalyticsEventType;

  @ApiProperty({
    description: 'ユーザーID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: '商品ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({
    description: 'グループ化単位',
    enum: AnalyticsGroupBy,
    required: false,
    default: AnalyticsGroupBy.DAY,
  })
  @IsOptional()
  @IsEnum(AnalyticsGroupBy)
  groupBy?: AnalyticsGroupBy = AnalyticsGroupBy.DAY;

  @ApiProperty({
    description: 'ページ番号',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '1ページあたりの件数',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}