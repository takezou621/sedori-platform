import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserPlan, UserStatus } from '../../users/entities/user.entity';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWTアクセストークン',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'ユーザー情報',
    type: Object,
  })
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    plan: UserPlan;
    status: UserStatus;
    createdAt: Date;
    lastLoginAt?: Date;
    emailVerifiedAt?: Date;
  };
}