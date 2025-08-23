import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsEventType } from '../analytics/entities/analytics-event.entity';
import {
  SearchQueryDto,
  SearchResultsDto,
} from './dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: '検索' })
  @ApiResponse({
    status: 200,
    description: '検索結果を返します',
    type: SearchResultsDto,
  })
  async search(
    @Request() req: any,
    @Query() searchQuery: SearchQueryDto,
  ): Promise<SearchResultsDto> {
    // Track search event
    if (searchQuery.q) {
      await this.analyticsService.trackEvent(req.user?.id, {
        eventType: AnalyticsEventType.PRODUCT_SEARCH,
        properties: {
          query: searchQuery.q,
          type: searchQuery.type,
          categoryId: searchQuery.categoryId,
          brands: searchQuery.brands,
          priceRange: searchQuery.priceRange,
        },
        sessionId: req.sessionID,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        currentPage: '/search',
      });
    }

    const results = await this.searchService.search(searchQuery);

    return results;
  }

  @Get('suggestions')
  @ApiOperation({ summary: '検索候補取得' })
  @ApiResponse({
    status: 200,
    description: '検索候補を返します',
  })
  async getSuggestions(
    @Query('q') query: string,
    @Query('limit') limit: number = 5,
  ): Promise<{ suggestions: string[] }> {
    // This would typically use a dedicated suggestions service
    // For now, we'll use the search service
    const searchResults = await this.searchService.search({
      q: query,
      limit: Math.min(limit, 10),
    });

    const suggestions = searchResults.products
      .slice(0, limit)
      .map(product => product.name);

    return { suggestions };
  }

  @Get('facets')
  @ApiOperation({ summary: 'ファセット情報取得' })
  @ApiResponse({
    status: 200,
    description: 'ファセット情報を返します',
  })
  async getFacets(@Query() searchQuery: SearchQueryDto) {
    const results = await this.searchService.search({
      ...searchQuery,
      includeFacets: true,
      limit: 1, // We only need facets, not actual results
    });

    return {
      facets: results.facets,
    };
  }

  @Post('track-click')
  @ApiOperation({ summary: '検索結果クリック追跡' })
  @ApiResponse({
    status: 201,
    description: 'クリックイベントが記録されました',
  })
  async trackClick(
    @Request() req: any,
    @Body() body: {
      productId: string;
      query: string;
      position: number;
    },
  ): Promise<{ success: boolean }> {
    await this.analyticsService.trackEvent(req.user?.id, {
      eventType: AnalyticsEventType.PRODUCT_VIEW,
      productId: body.productId,
      properties: {
        searchQuery: body.query,
        searchPosition: body.position,
        source: 'search_results',
      },
      sessionId: req.sessionID,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      currentPage: '/search',
    });

    return { success: true };
  }
}