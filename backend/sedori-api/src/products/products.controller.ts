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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductQueryDto,
  UpdateMarketDataDto,
  UpdateProfitabilityDataDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('商品')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '商品作成（管理者のみ）' })
  @ApiResponse({
    status: 201,
    description: '商品作成成功',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '管理者権限が必要です' })
  async create(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: '商品一覧取得' })
  @ApiResponse({ status: 200, description: '商品一覧取得成功' })
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
    name: 'categoryId',
    required: false,
    type: String,
    description: 'カテゴリID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'out_of_stock', 'discontinued'],
    description: '商品ステータス',
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    enum: ['new', 'like_new', 'very_good', 'good', 'acceptable', 'poor'],
    description: '商品状態',
  })
  @ApiQuery({
    name: 'brand',
    required: false,
    type: String,
    description: 'ブランド名',
  })
  @ApiQuery({
    name: 'supplier',
    required: false,
    type: String,
    description: '仕入れ先',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: '最小価格',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: '最大価格',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'name',
      'wholesalePrice',
      'createdAt',
      'updatedAt',
      'viewCount',
      'averageRating',
    ],
    description: 'ソート項目',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'ソート順',
  })
  async findAll(@Query() queryDto: ProductQueryDto) {
    return this.productsService.findAll(queryDto);
  }

  // Specific routes BEFORE generic :id route to avoid conflicts
  @Get('category/:categoryId')
  @ApiOperation({ summary: 'カテゴリ別商品一覧取得' })
  @ApiResponse({ status: 200, description: 'カテゴリ別商品一覧取得成功' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '取得件数',
    example: 10,
  })
  async findByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query('limit') limit: number = 10,
  ): Promise<ProductResponseDto[]> {
    return this.productsService.findByCategory(categoryId, limit);
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'SKUによる商品検索' })
  @ApiResponse({
    status: 200,
    description: 'SKU検索成功',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: '商品が見つかりません' })
  async findBySku(@Param('sku') sku: string): Promise<ProductResponseDto> {
    const product = await this.productsService.findBySku(sku);
    if (!product) {
      throw new NotFoundException('商品が見つかりません');
    }
    return product;
  }

  @Get('supplier/:supplier')
  @ApiOperation({ summary: '仕入れ先別商品一覧取得' })
  @ApiResponse({ status: 200, description: '仕入れ先別商品一覧取得成功' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '取得件数',
    example: 10,
  })
  async findBySupplier(
    @Param('supplier') supplier: string,
    @Query('limit') limit: number = 10,
  ): Promise<ProductResponseDto[]> {
    return this.productsService.findBySupplier(supplier, limit);
  }

  // Generic :id route comes AFTER specific routes
  @Get(':id')
  @ApiOperation({ summary: '商品詳細取得' })
  @ApiResponse({
    status: 200,
    description: '商品詳細取得成功',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: '商品が見つかりません' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.findById(id);
    if (!product) {
      throw new NotFoundException('商品が見つかりません');
    }

    // Increment view count asynchronously
    this.productsService.incrementViewCount(id).catch(console.error);

    return product;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '商品情報更新（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: '商品更新成功',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '商品が見つかりません' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '商品削除（管理者のみ）' })
  @ApiResponse({ status: 204, description: '商品削除成功' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '商品が見つかりません' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.productsService.remove(id);
  }

  @Put(':id/market-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '商品市場データ更新（管理者のみ）' })
  @ApiResponse({ status: 204, description: '市場データ更新成功' })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '商品が見つかりません' })
  async updateMarketData(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() marketData: UpdateMarketDataDto,
  ): Promise<void> {
    await this.productsService.updateMarketData(id, marketData);
  }

  @Put(':id/profitability-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '商品収益性データ更新（管理者のみ）' })
  @ApiResponse({ status: 204, description: '収益性データ更新成功' })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '商品が見つかりません' })
  async updateProfitabilityData(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() profitabilityData: UpdateProfitabilityDataDto,
  ): Promise<void> {
    await this.productsService.updateProfitabilityData(id, profitabilityData);
  }
}
