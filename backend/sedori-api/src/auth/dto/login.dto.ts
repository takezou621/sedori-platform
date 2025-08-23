import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'メールアドレス',
    example: 'user@example.com',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: 'パスワード',
    example: 'securePassword123',
  })
  @IsString()
  @MaxLength(255)
  password: string;
}
