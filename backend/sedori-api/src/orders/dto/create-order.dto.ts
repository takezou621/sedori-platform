import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
  IsPhoneNumber,
  IsPostalCode,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @ApiProperty({ description: '氏名' })
  @IsString()
  @Length(1, 100)
  fullName: string;

  @ApiProperty({ description: '会社名', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  company?: string;

  @ApiProperty({ description: '住所1' })
  @IsString()
  @Length(1, 200)
  address1: string;

  @ApiProperty({ description: '住所2', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  address2?: string;

  @ApiProperty({ description: '市区町村' })
  @IsString()
  @Length(1, 100)
  city: string;

  @ApiProperty({ description: '都道府県' })
  @IsString()
  @Length(1, 100)
  state: string;

  @ApiProperty({ description: '郵便番号' })
  @IsPostalCode('JP')
  postalCode: string;

  @ApiProperty({ description: '国' })
  @IsString()
  @Length(1, 100)
  country: string;

  @ApiProperty({ description: '電話番号', required: false })
  @IsOptional()
  @IsPhoneNumber('JP')
  phone?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: '配送先住所', type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiProperty({ description: '請求先住所', type: AddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiProperty({ description: '支払い方法', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

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
