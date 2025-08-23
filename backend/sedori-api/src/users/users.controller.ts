import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';

@ApiTags('ユーザー')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'ユーザー作成（管理者のみ）' })
  @ApiResponse({ status: 201, description: 'ユーザー作成成功' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'ユーザー一覧取得（管理者・モデレーターのみ）' })
  @ApiResponse({ status: 200, description: 'ユーザー一覧取得成功' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: '自分の情報取得' })
  @ApiResponse({ status: 200, description: '自分の情報取得成功' })
  async getMe(@CurrentUser() user: User) {
    const { password, ...userInfo } = user;
    return userInfo;
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'ユーザー詳細取得（管理者・モデレーターのみ）' })
  @ApiResponse({ status: 200, description: 'ユーザー詳細取得成功' })
  @ApiResponse({ status: 404, description: 'ユーザーが見つかりません' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }
    const { password, ...userInfo } = user;
    return userInfo;
  }

  @Patch('me')
  @ApiOperation({ summary: '自分の情報更新' })
  @ApiResponse({ status: 200, description: '情報更新成功' })
  async updateMe(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updatedUser = await this.usersService.update(user.id, updateUserDto);
    const { password, ...userInfo } = updatedUser;
    return userInfo;
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'ユーザー情報更新（管理者のみ）' })
  @ApiResponse({ status: 200, description: '情報更新成功' })
  @ApiResponse({ status: 404, description: 'ユーザーが見つかりません' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updatedUser = await this.usersService.update(id, updateUserDto);
    const { password, ...userInfo } = updatedUser;
    return userInfo;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'ユーザー削除（管理者のみ）' })
  @ApiResponse({ status: 200, description: 'ユーザー削除成功' })
  @ApiResponse({ status: 404, description: 'ユーザーが見つかりません' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
    return { message: 'ユーザーを削除しました' };
  }
}
