import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserPlan, UserRole, UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({
    description: 'ユーザー名',
    example: '田中太郎',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'メールアドレス',
    example: 'user@example.com',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: 'パスワード（ハッシュ化済み）',
    example: '$2b$10$...',
  })
  @IsString()
  @MaxLength(255)
  password: string;

  @ApiProperty({
    description: 'ユーザーロール',
    enum: UserRole,
    default: UserRole.USER,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    description: 'プラン',
    enum: UserPlan,
    default: UserPlan.FREE,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserPlan)
  plan?: UserPlan;

  @ApiProperty({
    description: 'ステータス',
    enum: UserStatus,
    default: UserStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    description: '電話番号（任意）',
    example: '090-1234-5678',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiProperty({
    description: '生年月日（任意）',
    example: '1990-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: '性別（任意）',
    example: 'male',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string;

  @ApiProperty({
    description: '自己紹介（任意）',
    example: 'せどり歴5年です',
    required: false,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    description: 'メール認証日時（任意）',
    required: false,
  })
  @IsOptional()
  emailVerifiedAt?: Date;
}