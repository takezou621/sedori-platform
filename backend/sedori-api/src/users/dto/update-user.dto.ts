import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'アバター画像URL（任意）',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiProperty({
    description: 'プラン開始日時（任意）',
    required: false,
  })
  @IsOptional()
  planStartedAt?: Date;

  @ApiProperty({
    description: 'プラン有効期限（任意）',
    required: false,
  })
  @IsOptional()
  planExpiresAt?: Date;
}
