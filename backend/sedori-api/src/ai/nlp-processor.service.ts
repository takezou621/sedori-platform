import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NlpSearchQuery {
  originalQuery: string;
  extractedCriteria: SearchCriteria;
  confidence: number;
  parsedIntent: SearchIntent;
}

export interface SearchCriteria {
  priceRange?: { min?: number; max?: number };
  profitTarget?: number;
  timeframe?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  category?: string;
  keywords: string[];
  excludeKeywords?: string[];
  salesRankMax?: number;
  minReviews?: number;
  minRating?: number;
}

export interface SearchIntent {
  type: 'product_discovery' | 'market_analysis' | 'price_monitoring' | 'profit_calculation';
  urgency: 'immediate' | 'soon' | 'flexible';
  goal: 'buy' | 'sell' | 'analyze' | 'monitor';
  context?: string;
}

@Injectable()
export class NlpProcessorService {
  private readonly logger = new Logger(NlpProcessorService.name);
  private readonly enableNlp: boolean;

  // Japanese number patterns
  private readonly numberPatterns = {
    '万': 10000,
    'まん': 10000,
    '千': 1000,
    'せん': 1000,
    '百': 100,
    'ひゃく': 100,
    '円': 1,
    'えん': 1,
  };

  // Profit-related keywords
  private readonly profitKeywords = [
    '利益', '儲け', '稼ぐ', '儲かる', '利益率', 'マージン', '利幅',
    'リターン', '収益', '売上', '粗利', '純利益'
  ];

  // Risk-related keywords
  private readonly riskKeywords = {
    low: ['安全', '安定', '低リスク', 'リスクが少ない', '確実', '手堅い'],
    medium: ['普通', '中程度', '適度', 'バランス'],
    high: ['ハイリスク', 'リスクが高い', '危険', '投機的', 'ギャンブル']
  };

  // Time-related keywords
  private readonly timeKeywords = {
    immediate: ['今すぐ', 'すぐに', '即座に', '直ちに', '至急'],
    soon: ['今月', '近いうちに', 'もうすぐ', '来週', '数日'],
    flexible: ['いつでも', 'ゆっくり', '長期的', '時間をかけて']
  };

  constructor(private readonly configService: ConfigService) {
    const aiConfig = this.configService.get('ai');
    this.enableNlp = aiConfig?.features?.enableNlpSearch ?? true;

    this.logger.log('NLP Processor Service initialized');
  }

  async parseSearchQuery(query: string): Promise<NlpSearchQuery> {
    try {
      this.logger.debug(`Parsing query: "${query}"`);

      const normalizedQuery = this.normalizeQuery(query);
      const extractedCriteria = this.extractSearchCriteria(normalizedQuery);
      const parsedIntent = this.parseIntent(normalizedQuery);
      const confidence = this.calculateConfidence(normalizedQuery, extractedCriteria);

      const result: NlpSearchQuery = {
        originalQuery: query,
        extractedCriteria,
        confidence,
        parsedIntent,
      };

      this.logger.debug(`Parsed query result:`, JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      this.logger.error(`Failed to parse query: "${query}"`, error);
      return this.getFallbackQuery(query);
    }
  }

  async generateSearchSuggestions(partialQuery: string): Promise<string[]> {
    const suggestions: string[] = [];

    // Common search patterns
    const patterns = [
      '今月{profit}万円稼げる商品',
      '利益率{percent}%以上の商品',
      '{category}で売れ筋の商品',
      '{price}円以下の利益商品',
      '低リスクで安定した商品',
      'ランキング上位の{category}',
      '年末商戦で売れる商品',
    ];

    // Generate suggestions based on partial input
    const normalized = partialQuery.toLowerCase();
    
    if (normalized.includes('利益') || normalized.includes('稼')) {
      suggestions.push(
        '今月10万円稼げる商品',
        '利益率20%以上の商品',
        '低リスクで稼げる商品'
      );
    }

    if (normalized.includes('安全') || normalized.includes('リスク')) {
      suggestions.push(
        '低リスクで安定した商品',
        'リスクの少ない高利益商品',
        '安全に取引できる商品'
      );
    }

    if (normalized.includes('価格') || normalized.includes('円')) {
      suggestions.push(
        '5000円以下の利益商品',
        '価格変動の少ない商品',
        '価格競争力のある商品'
      );
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  // Private methods
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[！？。、]/g, '') // Remove Japanese punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private extractSearchCriteria(query: string): SearchCriteria {
    const criteria: SearchCriteria = {
      keywords: [],
    };

    // Extract price range
    criteria.priceRange = this.extractPriceRange(query);

    // Extract profit target
    criteria.profitTarget = this.extractProfitTarget(query);

    // Extract timeframe
    criteria.timeframe = this.extractTimeframe(query);

    // Extract risk level
    criteria.riskLevel = this.extractRiskLevel(query);

    // Extract category
    criteria.category = this.extractCategory(query);

    // Extract keywords
    criteria.keywords = this.extractKeywords(query);

    // Extract sales rank criteria
    criteria.salesRankMax = this.extractSalesRankCriteria(query);

    // Extract review criteria
    criteria.minReviews = this.extractReviewCriteria(query);
    criteria.minRating = this.extractRatingCriteria(query);

    return criteria;
  }

  private parseIntent(query: string): SearchIntent {
    let type: SearchIntent['type'] = 'product_discovery';
    let urgency: SearchIntent['urgency'] = 'flexible';
    let goal: SearchIntent['goal'] = 'analyze';

    // Determine type
    if (query.includes('分析') || query.includes('調べ')) {
      type = 'market_analysis';
    } else if (query.includes('監視') || query.includes('追跡') || query.includes('アラート')) {
      type = 'price_monitoring';
    } else if (query.includes('利益計算') || query.includes('収益')) {
      type = 'profit_calculation';
    }

    // Determine urgency
    if (this.timeKeywords.immediate.some(keyword => query.includes(keyword))) {
      urgency = 'immediate';
    } else if (this.timeKeywords.soon.some(keyword => query.includes(keyword))) {
      urgency = 'soon';
    }

    // Determine goal
    if (query.includes('購入') || query.includes('仕入れ') || query.includes('買い')) {
      goal = 'buy';
    } else if (query.includes('売却') || query.includes('販売') || query.includes('売り')) {
      goal = 'sell';
    } else if (query.includes('監視') || query.includes('追跡')) {
      goal = 'monitor';
    }

    return { type, urgency, goal };
  }

  private extractPriceRange(query: string): { min?: number; max?: number } | undefined {
    const priceRange: { min?: number; max?: number } = {};

    // Pattern: "3000円以下"
    const maxPattern = /(\d+)円以下/;
    const maxMatch = query.match(maxPattern);
    if (maxMatch) {
      priceRange.max = parseInt(maxMatch[1]);
    }

    // Pattern: "5000円以上"
    const minPattern = /(\d+)円以上/;
    const minMatch = query.match(minPattern);
    if (minMatch) {
      priceRange.min = parseInt(minMatch[1]);
    }

    // Pattern: "3000円から5000円"
    const rangePattern = /(\d+)円から(\d+)円/;
    const rangeMatch = query.match(rangePattern);
    if (rangeMatch) {
      priceRange.min = parseInt(rangeMatch[1]);
      priceRange.max = parseInt(rangeMatch[2]);
    }

    return Object.keys(priceRange).length > 0 ? priceRange : undefined;
  }

  private extractProfitTarget(query: string): number | undefined {
    // Pattern: "10万円稼ぐ"
    const profitPattern = /(\d+)万円稼/;
    const match = query.match(profitPattern);
    if (match) {
      return parseInt(match[1]) * 10000;
    }

    // Pattern: "利益率20%"
    const marginPattern = /利益率(\d+)%/;
    const marginMatch = query.match(marginPattern);
    if (marginMatch) {
      return parseInt(marginMatch[1]); // Return as percentage
    }

    return undefined;
  }

  private extractTimeframe(query: string): string | undefined {
    if (this.timeKeywords.immediate.some(keyword => query.includes(keyword))) {
      return 'immediate';
    }
    if (this.timeKeywords.soon.some(keyword => query.includes(keyword))) {
      return 'soon';
    }
    if (query.includes('今月')) return '今月';
    if (query.includes('来月')) return '来月';
    if (query.includes('年末')) return '年末';

    return undefined;
  }

  private extractRiskLevel(query: string): 'low' | 'medium' | 'high' | undefined {
    for (const [level, keywords] of Object.entries(this.riskKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return level as 'low' | 'medium' | 'high';
      }
    }
    return undefined;
  }

  private extractCategory(query: string): string | undefined {
    const categoryKeywords = {
      '家電': ['家電', '電化製品', '電子機器', 'エレクトロニクス'],
      '美容': ['美容', 'コスメ', '化粧品', 'スキンケア'],
      '健康': ['健康', 'サプリメント', 'フィットネス'],
      'ファッション': ['ファッション', '服', '衣類', 'アパレル'],
      'ホーム': ['ホーム', '家庭用品', '生活用品'],
      'スポーツ': ['スポーツ', 'アウトドア', '運動'],
      'おもちゃ': ['おもちゃ', 'ゲーム', '玩具'],
      '本': ['本', '書籍', 'ブック'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return category;
      }
    }

    return undefined;
  }

  private extractKeywords(query: string): string[] {
    // Remove common words and extract meaningful keywords
    const commonWords = [
      'の', 'を', 'は', 'が', 'に', 'で', 'と', 'から', 'まで',
      '商品', '商材', 'もの', 'やつ', 'こと', '感じ', '系',
      'ください', 'お願い', 'したい', 'ほしい'
    ];

    const words = query.split(/\s+/);
    return words.filter(word => 
      word.length > 1 && 
      !commonWords.includes(word) &&
      !word.match(/^\d+$/) && // Exclude pure numbers
      !word.includes('円') // Exclude price-related words
    );
  }

  private extractSalesRankCriteria(query: string): number | undefined {
    const rankPattern = /ランキング(\d+)位以内/;
    const match = query.match(rankPattern);
    if (match) {
      return parseInt(match[1]);
    }

    if (query.includes('上位')) {
      return 1000; // Default for "上位"
    }

    return undefined;
  }

  private extractReviewCriteria(query: string): number | undefined {
    const reviewPattern = /レビュー(\d+)件以上/;
    const match = query.match(reviewPattern);
    if (match) {
      return parseInt(match[1]);
    }

    if (query.includes('レビューが多い')) {
      return 100; // Default threshold
    }

    return undefined;
  }

  private extractRatingCriteria(query: string): number | undefined {
    const ratingPattern = /評価(\d+\.?\d*)以上/;
    const match = query.match(ratingPattern);
    if (match) {
      return parseFloat(match[1]);
    }

    if (query.includes('高評価')) {
      return 4.0; // Default for "高評価"
    }

    return undefined;
  }

  private calculateConfidence(query: string, criteria: SearchCriteria): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on extracted criteria
    if (criteria.priceRange) confidence += 0.15;
    if (criteria.profitTarget) confidence += 0.15;
    if (criteria.category) confidence += 0.1;
    if (criteria.riskLevel) confidence += 0.1;
    if (criteria.keywords.length > 0) confidence += 0.05 * Math.min(criteria.keywords.length, 3);

    // Decrease confidence for very short or vague queries
    if (query.length < 5) confidence -= 0.2;
    if (criteria.keywords.length === 0) confidence -= 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private getFallbackQuery(originalQuery: string): NlpSearchQuery {
    return {
      originalQuery,
      extractedCriteria: {
        keywords: [originalQuery],
      },
      confidence: 0.3,
      parsedIntent: {
        type: 'product_discovery',
        urgency: 'flexible',
        goal: 'analyze',
      },
    };
  }
}