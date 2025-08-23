import { IsUUID, IsOptional, IsString, IsEnum } from 'class-validator';
import { CheckType } from '../entities/compliance-check.entity';

export class ComplianceCheckRequestDto {
  @IsUUID()
  productId: string;

  @IsEnum(CheckType)
  @IsOptional()
  checkType?: CheckType;

  @IsString()
  @IsOptional()
  originCountry?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
