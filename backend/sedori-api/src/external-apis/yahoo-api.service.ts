import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  CompetitorPrice,
  ProductSearchResult,
  MarketTrend,
} from './interfaces/market-data.interface';

@Injectable()
export class YahooApiService {
  private readonly logger = new Logger(YahooApiService.name);
  private readonly baseUrl =
    'https://shopping.yahooapis.jp/ShoppingWebService/V3';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async searchProducts(
    keyword: string,
    limit = 10,
  ): Promise<ProductSearchResult[]> {
    try {
      const appId = this.configService.get('YAHOO_CLIENT_ID');

      if (!appId) {
        this.logger.warn(
          'Required Yahoo API credentials not configured, using fallback data',
        );
        return this.getFallbackSearchResults(keyword, limit);
      }

      // TODO: Implement actual Yahoo Shopping API call
      const url = `${this.baseUrl}/itemSearch`;
      const params = {
        appid: appId,
        query: keyword,
        results: Math.min(limit, 50), // Max 50 for Yahoo Shopping API
        sort: 'score', // or 'price', '-price', 'review', 'seller'
      };

      // const response = await firstValueFrom(
      //   this.httpService.get(url, { params })
      // );

      // For now, return realistic fallback data
      return this.getFallbackSearchResults(keyword, limit);
    } catch (error) {
      this.logger.error(`Yahoo product search failed for "${keyword}":`, error);
      return this.getFallbackSearchResults(keyword, limit);
    }
  }

  async getCompetitorPrices(
    jan?: string,
    productName?: string,
  ): Promise<CompetitorPrice[]> {
    try {
      const appId = this.configService.get('YAHOO_CLIENT_ID');

      if (!appId) {
        this.logger.warn(
          'Required Yahoo API credentials not configured, using fallback pricing',
        );
        return this.getFallbackCompetitorPrices(productName || '');
      }

      // Search by JAN code or product name
      const searchTerm = jan || productName;
      if (!searchTerm) {
        return this.getFallbackCompetitorPrices('');
      }

      // TODO: Implement actual Yahoo Shopping API call
      // const url = `${this.baseUrl}/itemSearch`;
      // const params = {
      //   appid: appId,
      //   query: searchTerm,
      //   results: 20,
      //   sort: 'price',
      // };

      return this.getFallbackCompetitorPrices(searchTerm);
    } catch (error) {
      this.logger.error(`Failed to get Yahoo competitor prices:`, error);
      return this.getFallbackCompetitorPrices('');
    }
  }

  async getCategoryRanking(
    categoryId?: string,
  ): Promise<ProductSearchResult[]> {
    try {
      const appId = this.configService.get('YAHOO_CLIENT_ID');

      if (!appId) {
        this.logger.warn(
          'Required Yahoo API credentials not configured, using fallback ranking',
        );
        return this.getFallbackCategoryRanking();
      }

      // TODO: Implement Yahoo Shopping Category Ranking API call
      // const url = `${this.baseUrl}/categoryRanking`;
      // const params = {
      //   appid: appId,
      //   category_id: categoryId || '1',
      //   results: 20,
      // };

      return this.getFallbackCategoryRanking();
    } catch (error) {
      this.logger.error(`Failed to get Yahoo category ranking:`, error);
      return this.getFallbackCategoryRanking();
    }
  }

  async getMarketTrends(productName: string): Promise<MarketTrend[]> {
    try {
      // In production, this would analyze Yahoo Shopping's price trends and search volume
      // For now, providing realistic trend analysis for Yahoo Shopping market

      const trends: MarketTrend[] = [
        {
          period: 'daily',
          trend: this.getYahooMarketTrend(),
          percentage: Math.random() * 6 - 3, // -3% to +3%
          confidence: 0.7 + Math.random() * 0.3, // 70% to 100%
        },
        {
          period: 'weekly',
          trend: this.getYahooMarketTrend(),
          percentage: Math.random() * 12 - 6, // -6% to +6%
          confidence: 0.6 + Math.random() * 0.4, // 60% to 100%
        },
        {
          period: 'monthly',
          trend: this.getYahooMarketTrend(),
          percentage: Math.random() * 25 - 12.5, // -12.5% to +12.5%
          confidence: 0.5 + Math.random() * 0.5, // 50% to 100%
        },
      ];

      return trends;
    } catch (error) {
      this.logger.error(
        `Failed to get Yahoo market trends for "${productName}":`,
        error,
      );
      return [];
    }
  }

  async getShoppingGuideData(categoryId?: string) {
    try {
      const appId = this.configService.get('YAHOO_CLIENT_ID');

      if (!appId) {
        this.logger.warn('Required Yahoo API credentials not configured');
        return this.getFallbackShoppingGuide();
      }

      // TODO: Implement Yahoo Shopping Guide API
      return this.getFallbackShoppingGuide();
    } catch (error) {
      this.logger.error(`Failed to get Yahoo shopping guide data:`, error);
      return this.getFallbackShoppingGuide();
    }
  }

  private getFallbackSearchResults(
    keyword: string,
    limit: number,
  ): ProductSearchResult[] {
    const results: ProductSearchResult[] = [];

    for (let i = 0; i < Math.min(limit, 5); i++) {
      results.push({
        jan: this.generateJanCode(),
        title: `${keyword} - Yahoo!ショッピング商品 ${i + 1}`,
        price: 1200 + Math.random() * 8800, // 1,200 - 10,000 yen
        currency: 'JPY',
        availability: Math.random() > 0.1 ? 'in_stock' : 'limited',
        rating: 3.8 + Math.random() * 1.2, // 3.8-5 stars (Yahoo tends to have good ratings)
        reviewCount: Math.floor(Math.random() * 300), // Usually moderate review counts
        productUrl: `https://shopping.yahoo.co.jp/products/${this.generateProductId()}`,
        seller: `Yahoo!ショップ${i + 1}`,
        rank: Math.floor(Math.random() * 30000) + 1,
        category: this.getCategoryForKeyword(keyword),
        payPay: Math.floor(Math.random() * 200), // PayPay bonus points
      });
    }

    return results;
  }

  private getFallbackCompetitorPrices(searchTerm: string): CompetitorPrice[] {
    const basePrice = 2800 + Math.random() * 7200; // 2,800-10,000 yen

    return [
      {
        source: 'Yahoo!ショッピング',
        price: basePrice,
        timestamp: new Date(),
        availability: 'in_stock',
        shipping: Math.random() > 0.5 ? 0 : 200 + Math.random() * 300, // Often free shipping campaigns
        currency: 'JPY',
        url: `https://shopping.yahoo.co.jp/search?p=${encodeURIComponent(searchTerm)}`,
        payPay: Math.floor(basePrice * 0.01 * (1 + Math.random())), // 1-2% PayPay points
      },
      {
        source: 'Yahoo!ショッピング - プレミアム会員特価',
        price: basePrice * (0.88 + Math.random() * 0.2), // 88%-108% of base (member discounts)
        timestamp: new Date(),
        availability: Math.random() > 0.2 ? 'in_stock' : 'limited',
        shipping: Math.random() > 0.7 ? 0 : 250 + Math.random() * 250, // 250-500 yen
        currency: 'JPY',
        url: `https://shopping.yahoo.co.jp/search?p=${encodeURIComponent(searchTerm)}`,
        payPay: Math.floor(basePrice * 0.03 * (1 + Math.random())), // Higher PayPay points for premium
      },
    ];
  }

  private getFallbackCategoryRanking(): ProductSearchResult[] {
    const categories = ['家電', 'ファッション', 'ホーム', '美容', 'スポーツ'];
    const results: ProductSearchResult[] = [];

    for (let i = 0; i < 10; i++) {
      results.push({
        jan: this.generateJanCode(),
        title: `Yahoo!ショッピング ランキング ${i + 1}位`,
        price: 1800 + Math.random() * 12000,
        currency: 'JPY',
        availability: 'in_stock',
        rating: 4.2 + Math.random() * 0.8, // Yahoo tends to have higher ratings
        reviewCount: Math.floor(Math.random() * 800),
        productUrl: `https://shopping.yahoo.co.jp/ranking/category/${Math.floor(Math.random() * 100000)}/`,
        seller: `優良ショップ${i + 1}`,
        rank: i + 1,
        category: categories[Math.floor(Math.random() * categories.length)],
        payPay: Math.floor(Math.random() * 500), // PayPay bonus
      });
    }

    return results;
  }

  private getFallbackShoppingGuide() {
    return {
      popularKeywords: [
        'iPhone',
        '炊飯器',
        'ワイヤレスイヤホン',
        '掃除機',
        'スニーカー',
        'マスク',
        '財布',
        'タブレット',
        'コーヒーメーカー',
        'スマートウォッチ',
      ],
      seasonalTrends: [
        { category: '家電', trend: 'up', season: 'winter' },
        { category: 'ファッション', trend: 'stable', season: 'all' },
        { category: 'スポーツ', trend: 'down', season: 'winter' },
      ],
      campaigns: [
        {
          name: '5のつく日キャンペーン',
          description: '5日、15日、25日はPayPay還元率アップ',
          discount: '最大5%還元',
        },
        {
          name: 'プレミアム会員限定',
          description: 'プレミアム会員は送料無料',
          discount: '送料無料 + ポイント2倍',
        },
      ],
    };
  }

  private getCategoryForKeyword(keyword: string): string {
    const categories = [
      '家電・AV機器',
      'ファッション',
      'ホーム・ガーデン',
      'スポーツ・アウトドア',
      '本・CD・DVD',
      'おもちゃ・ゲーム',
      '美容・コスメ',
      '自動車・バイク',
      'グルメ・ドリンク',
    ];

    // Yahoo Shopping specific category mapping
    if (
      keyword.includes('家電') ||
      keyword.includes('テレビ') ||
      keyword.includes('冷蔵庫')
    )
      return '家電・AV機器';
    if (
      keyword.includes('服') ||
      keyword.includes('靴') ||
      keyword.includes('バッグ')
    )
      return 'ファッション';
    if (keyword.includes('本') || keyword.includes('CD')) return '本・CD・DVD';
    if (keyword.includes('化粧品') || keyword.includes('シャンプー'))
      return '美容・コスメ';
    if (keyword.includes('食べ物') || keyword.includes('飲み物'))
      return 'グルメ・ドリンク';

    return categories[Math.floor(Math.random() * categories.length)];
  }

  private generateJanCode(): string {
    // Generate a realistic JAN code
    const prefix = Math.random() > 0.5 ? '45' : '49';
    const middle = String(Math.floor(Math.random() * 10000000000)).padStart(
      10,
      '0',
    );
    const checkDigit = this.calculateJanCheckDigit(prefix + middle);
    return prefix + middle + checkDigit;
  }

  private calculateJanCheckDigit(code: string): string {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  private generateProductId(): string {
    return String(Math.floor(Math.random() * 1000000000000)).padStart(12, '0');
  }

  private getYahooMarketTrend(): 'up' | 'down' | 'stable' {
    // Yahoo Shopping tends to have more promotional periods
    const random = Math.random();
    if (random < 0.3) return 'stable';
    if (random < 0.65) return 'up'; // Higher chance of upward trends due to campaigns
    return 'down';
  }
}
