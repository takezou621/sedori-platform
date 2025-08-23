import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('認証')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'ユーザー登録' })
  @ApiResponse({
    status: 201,
    description: 'ユーザー登録成功',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 409, description: 'メールアドレス重複' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ログイン' })
  @ApiResponse({
    status: 200,
    description: 'ログイン成功',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: '認証失敗' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
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

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'トークン更新' })
  @ApiResponse({
    status: 200,
    description: 'トークン更新成功',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  async refreshToken(@CurrentUser() user: User): Promise<AuthResponseDto> {
    return this.authService.refreshToken(user);
  }
}
