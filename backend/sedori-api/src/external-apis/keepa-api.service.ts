import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { ApiRateLimiterService } from './rate-limiter/api-rate-limiter.service';
import {
  KeepaProduct,
  KeepaPriceHistory,
  KeepaAlert,
  KeepaApiResponse,
  KeepaSearchRequest,
  KeepaProductRequest,
  KeepaTrackingType,
  KeepaPrice,
} from './interfaces/keepa-data.interface';

@Injectable()
export class KeepaApiService {
  private readonly logger = new Logger(KeepaApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly domain: number;
  private readonly rateLimits: {
    tokensPerMinute: number;
    tokensPerDay: number;
    requestsPerSecond: number;
  };
  private readonly timeout: number;

  // Cache keys
  private readonly CACHE_PREFIX = 'keepa';
  private readonly PRODUCT_CACHE_TTL = 1800; // 30 minutes
  private readonly PRICE_HISTORY_CACHE_TTL = 3600; // 1 hour
  private readonly SEARCH_CACHE_TTL = 900; // 15 minutes

  // Rate limiting tracking
  private dailyTokensUsed = 0;
  private lastTokenReset = new Date();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rateLimiterService: ApiRateLimiterService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    const keepaConfig = this.configService.get('externalApis.keepa');
    this.baseUrl = keepaConfig.baseUrl;
    this.apiKey = keepaConfig.apiKey;
    this.domain = keepaConfig.domain;
    this.rateLimits = keepaConfig.rateLimits;
    this.timeout = keepaConfig.timeout;

    this.logger.log('Keepa API Service initialized');
    this.resetDailyTokensIfNeeded();
  }

  async searchProducts(
    term: string,
    category?: number,
    page = 0,
    perpage = 20,
  ): Promise<KeepaProduct[]> {
    const cacheKey = `${this.CACHE_PREFIX}:search:${term}:${category}:${page}:${perpage}`;

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for search: ${term}`);
        return JSON.parse(cached);
      }

      // Rate limiting
      await this.checkRateLimit();

      const searchParams: KeepaSearchRequest = {
        key: this.apiKey,
        domain: this.domain,
        type: 'product',
        term,
        category,
        page,
        perpage: Math.min(perpage, 50), // Keepa max is 50
      };

      const url = `${this.baseUrl}/search`;
      
      this.logger.log(`Searching products: ${term} (page: ${page})`);

      const response = await firstValueFrom(
        this.httpService.get<KeepaApiResponse<KeepaProduct[]>>(url, {
          params: searchParams,
          timeout: this.timeout,
        }),
      );

      const apiResponse = response.data;
      
      if (apiResponse.error) {
        throw new HttpException(
          `Keepa API Error: ${apiResponse.error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.updateTokenUsage(apiResponse.tokensConsumed);

      const products = apiResponse.data || [];
      
      // Cache results
      await this.redis.setex(
        cacheKey,
        this.SEARCH_CACHE_TTL,
        JSON.stringify(products),
      );

      this.logger.log(`Found ${products.length} products for: ${term}`);
      return products;

    } catch (error) {
      this.logger.error(`Search products failed for term: ${term}`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to search products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProduct(
    asin: string,
    includePriceHistory = true,
    days = 90,
  ): Promise<KeepaProduct> {
    const cacheKey = `${this.CACHE_PREFIX}:product:${asin}:${days}`;

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for product: ${asin}`);
        return JSON.parse(cached);
      }

      // Rate limiting
      await this.checkRateLimit();

      const params: KeepaProductRequest = {
        key: this.apiKey,
        domain: this.domain,
        asin,
        days,
        stats: 365, // Include 1 year of stats
        history: includePriceHistory ? 1 : 0,
        rating: 1,
        offers: 20, // Include current offers
      };

      const url = `${this.baseUrl}/product`;

      this.logger.log(`Fetching product: ${asin} (${days} days history)`);

      const response = await firstValueFrom(
        this.httpService.get<KeepaApiResponse<KeepaProduct[]>>(url, {
          params,
          timeout: this.timeout,
        }),
      );

      const apiResponse = response.data;
      
      if (apiResponse.error) {
        throw new HttpException(
          `Keepa API Error: ${apiResponse.error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.updateTokenUsage(apiResponse.tokensConsumed);

      const products = apiResponse.data || [];
      
      if (products.length === 0) {
        throw new HttpException(
          `Product not found: ${asin}`,
          HttpStatus.NOT_FOUND,
        );
      }

      const product = products[0];

      // Cache result
      await this.redis.setex(
        cacheKey,
        this.PRODUCT_CACHE_TTL,
        JSON.stringify(product),
      );

      this.logger.log(`Product fetched: ${asin} - ${product.title}`);
      return product;

    } catch (error) {
      this.logger.error(`Get product failed for ASIN: ${asin}`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to fetch product',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMultipleProducts(
    asins: string[],
    includePriceHistory = true,
    days = 90,
  ): Promise<KeepaProduct[]> {
    if (asins.length === 0) return [];
    if (asins.length > 100) {
      throw new HttpException(
        'Maximum 100 ASINs allowed per request',
        HttpStatus.BAD_REQUEST,
      );
    }

    const cacheKey = `${this.CACHE_PREFIX}:multi:${asins.sort().join(',')}:${days}`;

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for multi-product request: ${asins.length} ASINs`);
        return JSON.parse(cached);
      }

      // Rate limiting
      await this.checkRateLimit();

      const params: KeepaProductRequest = {
        key: this.apiKey,
        domain: this.domain,
        code: asins.join(','), // Multiple ASINs
        days,
        stats: 365,
        history: includePriceHistory ? 1 : 0,
        rating: 1,
        offers: 20,
      };

      const url = `${this.baseUrl}/product`;

      this.logger.log(`Fetching ${asins.length} products`);

      const response = await firstValueFrom(
        this.httpService.get<KeepaApiResponse<KeepaProduct[]>>(url, {
          params,
          timeout: this.timeout,
        }),
      );

      const apiResponse = response.data;
      
      if (apiResponse.error) {
        throw new HttpException(
          `Keepa API Error: ${apiResponse.error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.updateTokenUsage(apiResponse.tokensConsumed);

      const products = apiResponse.data || [];

      // Cache result
      await this.redis.setex(
        cacheKey,
        this.PRODUCT_CACHE_TTL,
        JSON.stringify(products),
      );

      this.logger.log(`Fetched ${products.length} products`);
      return products;

    } catch (error) {
      this.logger.error(`Get multiple products failed for ${asins.length} ASINs`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to fetch products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPriceHistory(asin: string, days = 90): Promise<KeepaPriceHistory> {
    const cacheKey = `${this.CACHE_PREFIX}:history:${asin}:${days}`;

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for price history: ${asin}`);
        return JSON.parse(cached);
      }

      const product = await this.getProduct(asin, true, days);
      const history = this.parsePriceHistory(product);

      // Cache result
      await this.redis.setex(
        cacheKey,
        this.PRICE_HISTORY_CACHE_TTL,
        JSON.stringify(history),
      );

      return history;

    } catch (error) {
      this.logger.error(`Get price history failed for ASIN: ${asin}`, error);
      throw error;
    }
  }

  async createPriceAlert(alert: Partial<KeepaAlert>): Promise<KeepaAlert> {
    // This would typically store in database and set up monitoring
    // For now, we'll create the alert structure
    const newAlert: KeepaAlert = {
      alertId: this.generateAlertId(),
      asin: alert.asin!,
      userId: alert.userId!,
      domain: this.domain,
      priceType: alert.priceType || KeepaTrackingType.AMAZON,
      desiredPrice: alert.desiredPrice!,
      isActive: true,
      createdAt: new Date(),
      notificationsSent: 0,
      intervalMinutes: alert.intervalMinutes || 60, // Default 1 hour
    };

    // Store in Redis for quick access
    const alertKey = `${this.CACHE_PREFIX}:alert:${newAlert.alertId}`;
    await this.redis.set(alertKey, JSON.stringify(newAlert));

    this.logger.log(`Created price alert: ${newAlert.alertId} for ASIN: ${alert.asin}`);
    return newAlert;
  }

  async getTokensRemaining(): Promise<{ tokensLeft: number; resetAt: Date }> {
    const tokensLeft = Math.max(0, this.rateLimits.tokensPerDay - this.dailyTokensUsed);
    const resetAt = new Date(this.lastTokenReset.getTime() + 24 * 60 * 60 * 1000);

    return { tokensLeft, resetAt };
  }

  // Helper methods
  private async checkRateLimit(): Promise<void> {
    this.resetDailyTokensIfNeeded();

    // Check daily token limit
    if (this.dailyTokensUsed >= this.rateLimits.tokensPerDay) {
      throw new HttpException(
        'Keepa daily token limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Use general rate limiter for requests per second
    const rateLimitStatus = await this.rateLimiterService.checkRateLimit('keepa-api', 'default');
    
    if (!rateLimitStatus.allowed) {
      throw new HttpException(
        `Keepa API rate limit exceeded. Retry after ${rateLimitStatus.retryAfter} seconds`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private updateTokenUsage(tokensConsumed: number): void {
    this.dailyTokensUsed += tokensConsumed;
    this.logger.debug(`Tokens used: ${tokensConsumed}, Total today: ${this.dailyTokensUsed}`);
  }

  private resetDailyTokensIfNeeded(): void {
    const now = new Date();
    const hoursSinceReset = (now.getTime() - this.lastTokenReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      this.dailyTokensUsed = 0;
      this.lastTokenReset = now;
      this.logger.log('Daily token usage reset');
    }
  }

  private parsePriceHistory(product: KeepaProduct): KeepaPriceHistory {
    const history: KeepaPriceHistory = {
      asin: product.asin,
      domainId: product.domainId,
      csv: product.csv || [],
      timestamps: [],
      amazonPrices: [],
      newPrices: [],
      usedPrices: [],
      salesRankHistory: [],
    };

    if (!product.csv || product.csv.length === 0) {
      return history;
    }

    // Parse CSV data - Keepa stores data as [time1, price1, time2, price2, ...]
    // Different price types are stored in specific indices
    const csvData = product.csv;
    const dataPoints = csvData.length / 2;

    for (let i = 0; i < dataPoints * 2; i += 2) {
      const keepaTime = csvData[i];
      const priceValue = csvData[i + 1];

      if (keepaTime && priceValue >= 0) {
        // Convert Keepa time (minutes since epoch) to JavaScript Date
        const timestamp = new Date(keepaTime * 60000);
        const price = priceValue; // Price in cents

        history.timestamps.push(timestamp);

        // This is simplified - in reality, different price types would be in different arrays
        const pricePoint: KeepaPrice = {
          timestamp,
          price,
          isOutOfStock: priceValue === -1,
        };

        // Add to appropriate price array based on index
        // Index 0 = Amazon price, 1 = New price, 2 = Used price, 3 = Sales rank
        const index = Math.floor(i / 2) % 4;
        switch (index) {
          case 0:
            history.amazonPrices.push(pricePoint);
            break;
          case 1:
            history.newPrices.push(pricePoint);
            break;
          case 2:
            history.usedPrices.push(pricePoint);
            break;
          case 3:
            history.salesRankHistory.push(pricePoint);
            break;
        }
      }
    }

    return history;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for external use
  public formatPrice(priceInCents: number, currency = 'JPY'): string {
    const price = priceInCents / 100;
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency,
    }).format(price);
  }

  public isValidAsin(asin: string): boolean {
    // ASIN format: 10 characters, alphanumeric
    return /^[A-Z0-9]{10}$/i.test(asin);
  }

  public getKeepaUrl(asin: string): string {
    const domainMap: Record<number, string> = {
      1: 'com',
      2: 'co.uk', 
      3: 'de',
      4: 'fr',
      5: 'co.jp',
      6: 'ca',
      7: 'cn',
      8: 'it',
      9: 'es',
      10: 'in',
      11: 'com.mx',
    };

    const domain = domainMap[this.domain] || 'com';
    return `https://keepa.com/#!product/${this.domain}-${asin}`;
  }
}