import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { BetaInviteStatus } from '../entities/beta-invite.entity';

export class CreateBetaInviteDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  currentTools?: string;

  @IsOptional()
  @IsString()
  expectations?: string;
}

export class UpdateBetaInviteDto {
  @IsOptional()
  @IsEnum(BetaInviteStatus)
  status?: BetaInviteStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BetaRegistrationDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  password: string;

  @IsString()
  inviteToken: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  businessType?: string;
}