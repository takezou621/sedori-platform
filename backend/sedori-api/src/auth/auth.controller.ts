import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('認証')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 100, ttl: 600000 } }) // 100 registrations per 10 minutes (dev mode)
  @ApiOperation({ summary: 'ユーザー登録' })
  @ApiResponse({
    status: 201,
    description: 'ユーザー登録成功（トークンはHTTP-onlyクッキーで設定）',
  })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 409, description: 'メールアドレス重複' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<AuthResponseDto, 'accessToken'>> {
    const result = await this.authService.register(registerDto);
    
    // Set HTTP-only cookie for security
    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Return user data without token
    return { user: result.user };
  }

  @Post('login')
  @Throttle({ default: { limit: 200, ttl: 600000 } }) // 200 login attempts per 10 minutes (dev mode)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ログイン' })
  @ApiResponse({
    status: 200,
    description: 'ログイン成功（トークンはHTTP-onlyクッキーで設定）',
  })
  @ApiResponse({ status: 401, description: '認証失敗' })
  @ApiResponse({
    status: 429,
    description: 'ログイン試行回数が上限に達しました',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<AuthResponseDto, 'accessToken'>> {
    const result = await this.authService.login(loginDto);
    
    // Set HTTP-only cookie for security
    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Return user data without token
    return { user: result.user };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ユーザープロフィール取得' })
  @ApiResponse({
    status: 200,
    description: 'プロフィール取得成功',
  })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ユーザー情報取得' })
  @ApiResponse({
    status: 200,
    description: 'ユーザー情報取得成功',
  })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  async getMe(@CurrentUser() user: User) {
    return this.authService.getProfile(user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'トークン更新' })
  @ApiResponse({
    status: 200,
    description: 'トークン更新成功（トークンはHTTP-onlyクッキーで設定）',
  })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  async refreshToken(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<AuthResponseDto, 'accessToken'>> {
    const result = await this.authService.refreshToken(user);
    
    // Set HTTP-only cookie for security
    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Return user data without token
    return { user: result.user };
  }

  @Post('dev-login')
  @Throttle({ default: { limit: 200, ttl: 600000 } }) // 200 dev-login attempts per 10 minutes (dev mode)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '開発環境用ログイン（自動アカウント作成）' })
  @ApiResponse({
    status: 200,
    description: 'ログイン成功（トークンはHTTP-onlyクッキーで設定）',
  })
  @ApiResponse({ status: 401, description: '認証失敗' })
  async devLogin(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<AuthResponseDto, 'accessToken'>> {
    const result = await this.authService.devLogin(loginDto);
    
    // Set HTTP-only cookie for security
    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Return user data without token
    return { user: result.user };
  }
}
