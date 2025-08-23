import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CategoryQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('カテゴリ')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'カテゴリ作成' })
  @ApiResponse({
    status: 201,
    description: 'カテゴリ作成成功',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 409, description: 'スラッグが重複しています' })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'カテゴリ一覧取得' })
  @ApiResponse({ status: 200, description: 'カテゴリ一覧取得成功' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'ページ番号',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '1ページあたりの件数',
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'キーワード検索',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: '親カテゴリID',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'アクティブ状態',
  })
  @ApiQuery({
    name: 'rootOnly',
    required: false,
    type: Boolean,
    description: 'ルートカテゴリのみ',
  })
  @ApiQuery({
    name: 'includeChildren',
    required: false,
    type: Boolean,
    description: '子カテゴリを含める',
  })
  @ApiQuery({
    name: 'includeProductCount',
    required: false,
    type: Boolean,
    description: '商品数を含める',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'name',
      'slug',
      'sortOrder',
      'createdAt',
      'updatedAt',
      'productCount',
    ],
    description: 'ソート項目',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'ソート順',
  })
  async findAll(@Query() queryDto: CategoryQueryDto) {
    return this.categoriesService.findAll(queryDto);
  }

  // Specific routes BEFORE generic :id route
  @Get('hierarchy')
  @ApiOperation({ summary: 'カテゴリ階層構造取得' })
  @ApiResponse({ status: 200, description: '階層構造取得成功' })
  async getHierarchy(): Promise<CategoryResponseDto[]> {
    return this.categoriesService.getCategoryHierarchy();
  }

  @Get('roots')
  @ApiOperation({ summary: 'ルートカテゴリ一覧取得' })
  @ApiResponse({ status: 200, description: 'ルートカテゴリ一覧取得成功' })
  @ApiQuery({
    name: 'includeChildren',
    required: false,
    type: Boolean,
    description: '子カテゴリを含める',
    example: false,
  })
  async getRootCategories(
    @Query('includeChildren') includeChildren: boolean = false,
  ): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findRootCategories(includeChildren);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'スラッグによるカテゴリ検索' })
  @ApiResponse({
    status: 200,
    description: 'スラッグ検索成功',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'カテゴリが見つかりません' })
  async findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.findBySlug(slug);
    if (!category) {
      throw new NotFoundException('カテゴリが見つかりません');
    }
    return category;
  }

  @Get(':id/children')
  @ApiOperation({ summary: '子カテゴリ一覧取得' })
  @ApiResponse({ status: 200, description: '子カテゴリ一覧取得成功' })
  @ApiResponse({ status: 404, description: '親カテゴリが見つかりません' })
  async getChildren(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto[]> {
    const parent = await this.categoriesService.findById(id);
    if (!parent) {
      throw new NotFoundException('親カテゴリが見つかりません');
    }
    return this.categoriesService.findChildrenByParentId(id);
  }

  // Generic :id route comes AFTER specific routes
  @Get(':id')
  @ApiOperation({ summary: 'カテゴリ詳細取得' })
  @ApiResponse({
    status: 200,
    description: 'カテゴリ詳細取得成功',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'カテゴリが見つかりません' })
  @ApiQuery({
    name: 'includeProductCount',
    required: false,
    type: Boolean,
    description: '商品数を含める',
    example: false,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeProductCount') includeProductCount: boolean = false,
  ): Promise<CategoryResponseDto> {
    let category;

    if (includeProductCount) {
      category = await this.categoriesService.findWithProductCount(id);
    } else {
      category = await this.categoriesService.findById(id);
    }

    if (!category) {
      throw new NotFoundException('カテゴリが見つかりません');
    }

    return category;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'カテゴリ情報更新（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: 'カテゴリ更新成功',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: 'カテゴリが見つかりません' })
  @ApiResponse({ status: 409, description: 'スラッグが重複またはデータ競合' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'カテゴリ削除（管理者のみ）' })
  @ApiResponse({ status: 204, description: 'カテゴリ削除成功' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: 'カテゴリが見つかりません' })
  @ApiResponse({
    status: 409,
    description: '子カテゴリまたは商品が存在するため削除できません',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'カテゴリ有効化（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: 'カテゴリ有効化成功',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: 'カテゴリが見つかりません' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.activate(id);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'カテゴリ無効化（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: 'カテゴリ無効化成功',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: 'カテゴリが見つかりません' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.deactivate(id);
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'カテゴリ順序変更（管理者のみ）' })
  @ApiResponse({ status: 204, description: '順序変更成功' })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '一部のカテゴリが見つかりません' })
  async reorder(@Body() body: { categoryIds: string[] }): Promise<void> {
    await this.categoriesService.reorder(body.categoryIds);
  }
}
