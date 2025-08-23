import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsString,
  IsObject,
  IsIP,
  IsUrl,
} from 'class-validator';
import { AnalyticsEventType } from '../entities/analytics-event.entity';

export class TrackEventDto {
  @ApiProperty({
    description: 'イベントタイプ',
    enum: AnalyticsEventType,
  })
  @IsEnum(AnalyticsEventType)
  eventType: AnalyticsEventType;

  @ApiProperty({
    description: '商品ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({
    description: 'セッションID',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: 'ユーザーエージェント',
    required: false,
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({
    description: 'IPアドレス',
    required: false,
  })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiProperty({
    description: 'リファラー',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  referrer?: string;

  @ApiProperty({
    description: '現在のページ',
    required: false,
  })
  @IsOptional()
  @IsString()
  currentPage?: string;

  @ApiProperty({
    description: 'イベントプロパティ',
    required: false,
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiProperty({
    description: 'メタデータ',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
