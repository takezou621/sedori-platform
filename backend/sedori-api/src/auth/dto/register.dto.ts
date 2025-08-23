import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserPlan, UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
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
    description: 'パスワード（英数字・記号を含む8文字以上）',
    example: 'SecurePass123!',
    minLength: 8,
    maxLength: 255,
  })
  @IsString()
  @MinLength(8, { message: 'パスワードは8文字以上である必要があります' })
  @MaxLength(255)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'パスワードは大文字・小文字・数字・記号を含む必要があります',
  })
  password: string;

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
    description: 'プラン（デフォルト：free）',
    enum: UserPlan,
    default: UserPlan.FREE,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserPlan)
  plan?: UserPlan;
}
