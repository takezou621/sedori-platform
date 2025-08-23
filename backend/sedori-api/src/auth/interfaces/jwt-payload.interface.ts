import {
  UserRole,
  UserPlan,
  UserStatus,
} from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  plan: UserPlan;
  status: UserStatus;
  iat?: number;
  exp?: number;
}
