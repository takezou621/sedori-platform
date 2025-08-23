import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { OptimizationService } from './optimization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptimizationType } from './entities/optimization-result.entity';
import {
  OptimizationRequestDto,
  OptimizationResponseDto,
  PaginatedOptimizationResult,
} from './dto';

@ApiTags('Optimization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('optimization')
export class OptimizationController {
  constructor(private readonly optimizationService: OptimizationService) {}

  @Post('request')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({ summary: '販売最適化リクエスト' })
  @ApiResponse({
    status: 201,
    description: '最適化リクエストが作成されました',
    type: OptimizationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'リクエストが無効です' })
  @ApiResponse({ status: 404, description: '商品が見つかりません' })
  @ApiResponse({ status: 429, description: 'レート制限に達しました' })
  async requestOptimization(
    @Request() req: any,
    @Body() optimizationRequestDto: OptimizationRequestDto,
  ): Promise<OptimizationResponseDto> {
    const userId = req.user.id;
    return this.optimizationService.requestOptimization(
      userId,
      optimizationRequestDto,
    );
  }

  @Get('results')
  @ApiOperation({ summary: '最適化結果一覧取得' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'ページ番号',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '1ページあたりの件数',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: OptimizationType,
    description: '最適化タイプフィルタ',
  })
  @ApiResponse({
    status: 200,
    description: '最適化結果一覧を返します',
    type: PaginatedOptimizationResult,
  })
  async getOptimizationResults(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: OptimizationType,
  ): Promise<PaginatedOptimizationResult> {
    const userId = req.user.id;
    return this.optimizationService.getOptimizationResults(
      userId,
      Number(page),
      Number(limit),
      type,
    );
  }

  @Get('results/:id')
  @ApiOperation({ summary: '最適化結果詳細取得' })
  @ApiParam({ name: 'id', description: '最適化結果ID' })
  @ApiResponse({
    status: 200,
    description: '最適化結果詳細を返します',
    type: OptimizationResponseDto,
  })
  @ApiResponse({ status: 404, description: '最適化結果が見つかりません' })
  async getOptimizationById(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<OptimizationResponseDto> {
    const userId = req.user.id;
    return this.optimizationService.getOptimizationById(userId, id);
  }

  @Post('quick-analysis/:productId')
  @ApiOperation({
    summary: '商品のクイック分析',
    description: '指定商品の全最適化タイプを一括実行（デモ用機能）',
  })
  @ApiParam({ name: 'productId', description: '商品ID' })
  @ApiResponse({
    status: 201,
    description: 'クイック分析が開始されました',
  })
  async quickAnalysis(
    @Request() req: any,
    @Param('productId') productId: string,
  ): Promise<{ message: string; optimizations: OptimizationResponseDto[] }> {
    const userId = req.user.id;

    const optimizationTypes = [
      OptimizationType.PRICE,
      OptimizationType.INVENTORY,
      OptimizationType.PROFIT,
      OptimizationType.MARKET_TIMING,
    ];

    const optimizations = await Promise.all(
      optimizationTypes.map((type) =>
        this.optimizationService.requestOptimization(userId, {
          productId,
          type,
          metadata: { quickAnalysis: true },
        }),
      ),
    );

    return {
      message: '全最適化タイプの分析を開始しました',
      optimizations,
    };
  }
}
