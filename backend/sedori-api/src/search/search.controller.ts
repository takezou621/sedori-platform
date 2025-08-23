import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
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
import { SearchQueryDto, SearchResultsDto } from './dto';

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
    @Query() rawQuery: any,
  ): Promise<SearchResultsDto> {
    // Parse query parameters manually to handle arrays and nested objects
    const searchQuery: SearchQueryDto = this.parseSearchQuery(rawQuery);
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
      .map((product) => product.name);

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
    @Body()
    body: {
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

  private parseSearchQuery(rawQuery: any): SearchQueryDto {
    const parsed: any = {};

    // Copy simple fields
    if (rawQuery.q) parsed.q = rawQuery.q;
    if (rawQuery.type) parsed.type = rawQuery.type;
    if (rawQuery.categoryId) parsed.categoryId = rawQuery.categoryId;
    if (rawQuery.condition) parsed.condition = rawQuery.condition;
    if (rawQuery.status) parsed.status = rawQuery.status;
    if (rawQuery.inStockOnly !== undefined)
      parsed.inStockOnly = rawQuery.inStockOnly === 'true';
    if (rawQuery.minRating !== undefined)
      parsed.minRating = parseFloat(rawQuery.minRating);
    if (rawQuery.sortBy) parsed.sortBy = rawQuery.sortBy;
    if (rawQuery.page !== undefined) parsed.page = parseInt(rawQuery.page);
    if (rawQuery.limit !== undefined) parsed.limit = parseInt(rawQuery.limit);
    if (rawQuery.includeFacets !== undefined)
      parsed.includeFacets = rawQuery.includeFacets === 'true';

    // Handle brands array parameter (brands[], brands)
    if (rawQuery['brands[]']) {
      parsed.brands = Array.isArray(rawQuery['brands[]'])
        ? rawQuery['brands[]']
        : [rawQuery['brands[]']];
    } else if (rawQuery.brands) {
      parsed.brands = Array.isArray(rawQuery.brands)
        ? rawQuery.brands
        : [rawQuery.brands];
    }

    // Handle tags array parameter (tags[], tags)
    if (rawQuery['tags[]']) {
      parsed.tags = Array.isArray(rawQuery['tags[]'])
        ? rawQuery['tags[]']
        : [rawQuery['tags[]']];
    } else if (rawQuery.tags) {
      parsed.tags = Array.isArray(rawQuery.tags)
        ? rawQuery.tags
        : [rawQuery.tags];
    }

    // Handle price range nested object (priceRange[min], priceRange[max])
    if (rawQuery['priceRange[min]'] || rawQuery['priceRange[max]']) {
      parsed.priceRange = {};
      if (rawQuery['priceRange[min]'] !== undefined) {
        parsed.priceRange.min = parseFloat(rawQuery['priceRange[min]']);
      }
      if (rawQuery['priceRange[max]'] !== undefined) {
        parsed.priceRange.max = parseFloat(rawQuery['priceRange[max]']);
      }
    }

    // Set defaults
    parsed.type = parsed.type || 'products';
    parsed.sortBy = parsed.sortBy || 'relevance';
    parsed.page = parsed.page || 1;
    parsed.limit = parsed.limit || 20;
    parsed.includeFacets = parsed.includeFacets || false;
    parsed.inStockOnly = parsed.inStockOnly || false;

    return parsed as SearchQueryDto;
  }
}
