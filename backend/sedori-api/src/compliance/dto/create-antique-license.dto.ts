import {
  IsString,
  IsEnum,
  IsDateString,
  IsArray,
  IsOptional,
  IsObject,
} from 'class-validator';
import {
  AntiqueDealerCategory,
  LicenseStatus,
} from '../entities/antique-license.entity';

export class CreateAntiqueLicenseDto {
  @IsString()
  licenseNumber: string;

  @IsEnum(LicenseStatus)
  @IsOptional()
  status?: LicenseStatus;

  @IsDateString()
  issuedAt: string;

  @IsDateString()
  expiresAt: string;

  @IsString()
  issuingAuthority: string;

  @IsString()
  businessName: string;

  @IsString()
  businessAddress: string;

  @IsString()
  representativeName: string;

  @IsArray()
  @IsEnum(AntiqueDealerCategory, { each: true })
  categories: AntiqueDealerCategory[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
