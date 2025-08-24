import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User, UserStatus, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('このメールアドレスは既に登録されています');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    });

    await this.usersService.updateLastLogin(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      status: user.status,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが間違っています',
      );
    }

    await this.usersService.updateLastLogin(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      status: user.status,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('アカウントが無効です');
    }

    if (!user.password) {
      throw new BadRequestException('パスワードが取得できません');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async refreshToken(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      status: user.status,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    };
  }

  async getProfile(user: User): Promise<Omit<User, 'password'>> {
    const { password, ...profile } = user;
    return profile;
  }

  async devLogin(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Check if user exists first
    const existingUser = await this.usersService.findByEmail(loginDto.email);
    
    if (existingUser) {
      // If user exists, try to validate credentials
      try {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (user) {
          // Update role based on email pattern for dev accounts
          let expectedRole = UserRole.USER; // default
          if (loginDto.email.includes('admin')) {
            expectedRole = UserRole.ADMIN;
          } else if (loginDto.email.includes('seller')) {
            expectedRole = UserRole.USER;
          } else {
            expectedRole = UserRole.USER;
          }

          // Note: Role updating for existing users would require additional setup
          // For now, we'll use the user's existing role from the database

          await this.usersService.updateLastLogin(user.id);

          const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            status: user.status,
          };

          return {
            accessToken: this.jwtService.sign(payload),
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              plan: user.plan,
              status: user.status,
              createdAt: user.createdAt,
              lastLoginAt: user.lastLoginAt,
              emailVerifiedAt: user.emailVerifiedAt,
            },
          };
        }
      } catch (error) {
        // If validation fails for existing user, throw error
        throw new UnauthorizedException(
          'メールアドレスまたはパスワードが間違っています',
        );
      }
    }
    
    // If user doesn't exist, create a new dev account
    const hashedPassword = await bcrypt.hash(loginDto.password, 10);
    
    // Determine role based on email pattern
    let role = UserRole.USER; // default
    if (loginDto.email.includes('admin')) {
      role = UserRole.ADMIN;
    } else if (loginDto.email.includes('moderator')) {
      role = UserRole.MODERATOR;
    }
    
    const newUser = await this.usersService.create({
      name: loginDto.email.split('@')[0], // Use email prefix as name
      email: loginDto.email,
      password: hashedPassword,
      role: role,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    });

    await this.usersService.updateLastLogin(newUser.id);

    const payload: JwtPayload = {
      sub: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      plan: newUser.plan,
      status: newUser.status,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        plan: newUser.plan,
        status: newUser.status,
        createdAt: newUser.createdAt,
        lastLoginAt: newUser.lastLoginAt,
        emailVerifiedAt: newUser.emailVerifiedAt,
      },
    };
  }
}
