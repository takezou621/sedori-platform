import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsObject,
  ValidateNested,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '../entities/order.entity';
import { AddressDto } from './create-order.dto';

export class UpdateOrderDto {
  @ApiProperty({
    description: '注文ステータス',
    enum: OrderStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({
    description: '支払いステータス',
    enum: PaymentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiProperty({ description: '配送先住所', type: AddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;

  @ApiProperty({ description: '請求先住所', type: AddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiProperty({ description: '追跡番号', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  trackingNumber?: string;

  @ApiProperty({ description: '支払い方法', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ description: '支払いトランザクションID', required: false })
  @IsOptional()
  @IsString()
  paymentTransactionId?: string;

  @ApiProperty({ description: '備考', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiProperty({ description: '追加のメタデータ', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
