import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { KeepaApiService } from './keepa-api.service';
import { KeepaAiService } from './keepa-ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  KeepaProduct,
  KeepaPriceHistory,
  KeepaAlert,
  KeepaPriceAnalysis,
  KeepaAiInsights,
} from './interfaces/keepa-data.interface';

// DTOs for API requests/responses
class CreatePriceAlertDto {
  asin: string;
  priceType: number;
  desiredPrice: number;
  intervalMinutes?: number;
}

class KeepaSearchRequestDto {
  term: string;
  category?: number;
  page?: number;
  perpage?: number;
}

class AiSearchRequestDto {
  query: string;
  minProfitabilityScore?: number;
  maxRiskLevel?: 'low' | 'medium' | 'high';
  category?: number;
  priceRange?: { min: number; max: number };
  limit?: number;
}

class MultiProductRequestDto {
  asins: string[];
  includePriceHistory?: boolean;
  days?: number;
}

@ApiTags('Keepa API')
@ApiBearerAuth()
@Controller('keepa')
export class KeepaController {
  constructor(
    private readonly keepaApiService: KeepaApiService,
    private readonly keepaAiService: KeepaAiService,
  ) {}

  @Post('search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Keepa商品検索' })
  @ApiResponse({
    status: 200,
    description: '商品検索成功',
    schema: {
      type: 'array',
      items: { type: 'object' }
    }
  })
  @ApiResponse({ status: 400, description: 'リクエストパラメータエラー' })
  @ApiResponse({ status: 429, description: 'API制限に達しました' })
  async searchProducts(
    @Body() searchRequest: KeepaSearchRequestDto,
  ): Promise<KeepaProduct[]> {
    if (!searchRequest.term || searchRequest.term.trim().length === 0) {
      throw new BadRequestException('検索キーワードが必要です');
    }

    return this.keepaApiService.searchProducts(
      searchRequest.term,
      searchRequest.category,
      searchRequest.page || 0,
      searchRequest.perpage || 20,
    );
  }

  @Post('ai-search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AI強化商品検索' })
  @ApiResponse({
    status: 200,
    description: 'AI検索成功',
    schema: {
      type: 'array',
      items: { type: 'object' }
    }
  })
  @ApiResponse({ status: 400, description: 'リクエストパラメータエラー' })
  async searchProductsWithAi(
    @Body() aiSearchRequest: AiSearchRequestDto,
  ): Promise<Array<KeepaProduct & { aiScore: number; aiInsights: KeepaAiInsights }>> {
    if (!aiSearchRequest.query || aiSearchRequest.query.trim().length === 0) {
      throw new BadRequestException('検索クエリが必要です');
    }

    return this.keepaAiService.searchProductsWithAi(
      aiSearchRequest.query,
      {
        minProfitabilityScore: aiSearchRequest.minProfitabilityScore,
        maxRiskLevel: aiSearchRequest.maxRiskLevel,
        category: aiSearchRequest.category,
        priceRange: aiSearchRequest.priceRange,
        limit: aiSearchRequest.limit,
      },
    );
  }

  @Get('product/:asin')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '商品詳細取得' })
  @ApiParam({ name: 'asin', description: 'Amazon ASIN', example: 'B08N5WRWNW' })
  @ApiQuery({ name: 'includePriceHistory', required: false, type: Boolean, description: '価格履歴を含める' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '取得日数', example: 90 })
  @ApiResponse({
    status: 200,
    description: '商品詳細取得成功',
    schema: { type: 'object' }
  })
  @ApiResponse({ status: 404, description: '商品が見つかりません' })
  async getProduct(
    @Param('asin') asin: string,
    @Query('includePriceHistory') includePriceHistory = true,
    @Query('days') days = 90,
  ): Promise<KeepaProduct> {
    if (!this.keepaApiService.isValidAsin(asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    try {
      return await this.keepaApiService.getProduct(asin, includePriceHistory, days);
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw new NotFoundException(`商品が見つかりません: ${asin}`);
      }
      throw error;
    }
  }

  @Post('products/batch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '複数商品一括取得' })
  @ApiResponse({
    status: 200,
    description: '一括取得成功',
    schema: {
      type: 'array',
      items: { type: 'object' }
    }
  })
  @ApiResponse({ status: 400, description: 'ASINリストが無効です' })
  async getMultipleProducts(
    @Body() multiProductRequest: MultiProductRequestDto,
  ): Promise<KeepaProduct[]> {
    if (!multiProductRequest.asins || multiProductRequest.asins.length === 0) {
      throw new BadRequestException('ASINリストが必要です');
    }

    if (multiProductRequest.asins.length > 100) {
      throw new BadRequestException('一度に取得できるのは100商品までです');
    }

    // Validate all ASINs
    const invalidAsins = multiProductRequest.asins.filter(
      asin => !this.keepaApiService.isValidAsin(asin)
    );

    if (invalidAsins.length > 0) {
      throw new BadRequestException(`無効なASIN: ${invalidAsins.join(', ')}`);
    }

    return this.keepaApiService.getMultipleProducts(
      multiProductRequest.asins,
      multiProductRequest.includePriceHistory ?? true,
      multiProductRequest.days ?? 90,
    );
  }

  @Get('product/:asin/price-history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '価格履歴取得' })
  @ApiParam({ name: 'asin', description: 'Amazon ASIN' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '取得日数' })
  @ApiResponse({
    status: 200,
    description: '価格履歴取得成功',
    schema: { type: 'object' }
  })
  async getPriceHistory(
    @Param('asin') asin: string,
    @Query('days') days = 90,
  ): Promise<KeepaPriceHistory> {
    if (!this.keepaApiService.isValidAsin(asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    return this.keepaApiService.getPriceHistory(asin, days);
  }

  @Get('product/:asin/ai-analysis')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AI価格分析' })
  @ApiParam({ name: 'asin', description: 'Amazon ASIN' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '分析日数' })
  @ApiResponse({
    status: 200,
    description: 'AI分析成功',
    schema: { type: 'object' }
  })
  async getAiPriceAnalysis(
    @Param('asin') asin: string,
    @Query('days') days = 90,
  ): Promise<KeepaPriceAnalysis> {
    if (!this.keepaApiService.isValidAsin(asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    return this.keepaAiService.analyzePriceHistory(asin, days);
  }

  @Get('product/:asin/ai-insights')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AI商品インサイト生成' })
  @ApiParam({ name: 'asin', description: 'Amazon ASIN' })
  @ApiResponse({
    status: 200,
    description: 'AIインサイト生成成功',
    schema: { type: 'object' }
  })
  async getAiInsights(
    @Param('asin') asin: string,
  ): Promise<KeepaAiInsights> {
    if (!this.keepaApiService.isValidAsin(asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    return this.keepaAiService.generateProductInsights(asin);
  }

  @Get('product/:asin/summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '自然言語要約生成' })
  @ApiParam({ name: 'asin', description: 'Amazon ASIN' })
  @ApiResponse({
    status: 200,
    description: '要約生成成功',
    schema: {
      type: 'object',
      properties: {
        asin: { type: 'string' },
        summary: { type: 'string' },
        generatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getNaturalLanguageSummary(
    @Param('asin') asin: string,
  ): Promise<{ asin: string; summary: string; generatedAt: Date }> {
    if (!this.keepaApiService.isValidAsin(asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    const summary = await this.keepaAiService.generateNaturalLanguageSummary(asin);
    
    return {
      asin,
      summary,
      generatedAt: new Date(),
    };
  }

  @Post('alerts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: '価格アラート作成' })
  @ApiResponse({
    status: 201,
    description: 'アラート作成成功',
    schema: { type: 'object' }
  })
  @ApiResponse({ status: 400, description: 'リクエストパラメータエラー' })
  @HttpCode(HttpStatus.CREATED)
  async createPriceAlert(
    @Body() createAlertDto: CreatePriceAlertDto,
  ): Promise<KeepaAlert> {
    if (!this.keepaApiService.isValidAsin(createAlertDto.asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    if (createAlertDto.desiredPrice <= 0) {
      throw new BadRequestException('価格は0より大きい値を設定してください');
    }

    return this.keepaApiService.createPriceAlert({
      asin: createAlertDto.asin,
      userId: 'current-user', // This would come from JWT token in real implementation
      priceType: createAlertDto.priceType,
      desiredPrice: createAlertDto.desiredPrice,
      intervalMinutes: createAlertDto.intervalMinutes,
    });
  }

  @Get('tokens/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'APIトークン使用状況確認（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: 'トークン状況取得成功',
    schema: {
      type: 'object',
      properties: {
        tokensLeft: { type: 'number' },
        resetAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getTokenStatus(): Promise<{ tokensLeft: number; resetAt: Date }> {
    return this.keepaApiService.getTokensRemaining();
  }

  @Get('product/:asin/keepa-url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Keepa商品ページURL取得' })
  @ApiParam({ name: 'asin', description: 'Amazon ASIN' })
  @ApiResponse({
    status: 200,
    description: 'URL取得成功',
    schema: {
      type: 'object',
      properties: {
        asin: { type: 'string' },
        keepaUrl: { type: 'string' },
        formattedPrice: { type: 'string', description: '現在価格（フォーマット済み）' }
      }
    }
  })
  async getKeepaUrl(
    @Param('asin') asin: string,
  ): Promise<{ asin: string; keepaUrl: string; formattedPrice?: string }> {
    if (!this.keepaApiService.isValidAsin(asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    const keepaUrl = this.keepaApiService.getKeepaUrl(asin);
    
    try {
      // Try to get current price for additional info
      const product = await this.keepaApiService.getProduct(asin, false, 1);
      const currentPrice = product.stats?.current?.[0];
      const formattedPrice = currentPrice ? 
        this.keepaApiService.formatPrice(currentPrice) : undefined;

      return {
        asin,
        keepaUrl,
        formattedPrice,
      };
    } catch (error) {
      // Return URL even if we can't get price
      return {
        asin,
        keepaUrl,
      };
    }
  }
}