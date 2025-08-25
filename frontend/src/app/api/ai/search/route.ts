import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AISearchOptions, AISearchResult } from '@/types/ai';

const AISearchSchema = z.object({
  query: z.string().min(1),
  options: z.object({
    minProfitabilityScore: z.number().optional(),
    maxRiskLevel: z.enum(['low', 'medium', 'high']).optional(),
    category: z.number().optional(),
    priceRange: z.object({
      min: z.number(),
      max: z.number()
    }).optional(),
    limit: z.number().optional(),
    naturalLanguageQuery: z.string().optional(),
    voiceSearch: z.boolean().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, options = {} } = AISearchSchema.parse(body);

    // In production, this would call the backend Keepa AI service
    const results = await performAISearch(query, options);

    return NextResponse.json({
      success: true,
      results,
      totalCount: results.length,
      query,
      options,
      processingTime: Date.now()
    });

  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform AI search' },
      { status: 500 }
    );
  }
}

async function performAISearch(
  query: string, 
  options: AISearchOptions
): Promise<AISearchResult[]> {
  // Mock AI search results for demonstration
  const mockProducts = generateMockSearchResults(query, options);
  
  // Apply AI scoring and filtering
  const scoredProducts = mockProducts.map(product => ({
    ...product,
    aiScore: calculateAIScore(product, query, options)
  }));

  // Filter based on options
  let filteredProducts = scoredProducts;

  if (options.minProfitabilityScore) {
    filteredProducts = filteredProducts.filter(
      p => p.aiInsights.profitabilityScore >= options.minProfitabilityScore!
    );
  }

  if (options.maxRiskLevel) {
    const riskThresholds = { low: 30, medium: 60, high: 100 };
    filteredProducts = filteredProducts.filter(
      p => p.aiInsights.riskScore <= riskThresholds[options.maxRiskLevel!]
    );
  }

  if (options.priceRange) {
    filteredProducts = filteredProducts.filter(p => 
      p.currentPrice >= options.priceRange!.min && 
      p.currentPrice <= options.priceRange!.max
    );
  }

  // Sort by AI score
  filteredProducts.sort((a, b) => b.aiScore - a.aiScore);

  // Limit results
  const limit = options.limit || 20;
  return filteredProducts.slice(0, limit);
}

function generateMockSearchResults(query: string, options: AISearchOptions): AISearchResult[] {
  const mockProducts: AISearchResult[] = [
    {
      asin: 'B08N5WRWNW',
      title: 'ワイヤレスイヤホン Bluetooth 5.0',
      currentPrice: 3980,
      aiScore: 85,
      aiInsights: {
        asin: 'B08N5WRWNW',
        summary: '人気上昇中のワイヤレスイヤホン',
        marketPosition: 'follower',
        competitiveness: 75,
        profitabilityScore: 82,
        riskScore: 25,
        demandIndicators: {
          salesRankTrend: 'improving',
          priceElasticity: 0.3,
          marketSaturation: 'medium'
        },
        strategicRecommendations: ['在庫確保推奨', '価格競争力維持'],
        nextReviewDate: new Date()
      },
      priceAnalysis: {
        asin: 'B08N5WRWNW',
        analysis: {
          trend: 'rising',
          trendStrength: 0.15,
          volatility: 12,
          seasonality: [],
          anomalies: [],
          predictions: [],
          insights: ['価格上昇トレンド継続中'],
          recommendations: [{
            type: 'buy',
            reason: '需要増加が見込まれる',
            riskLevel: 'low',
            timeframe: '1-2週間',
            confidence: 0.8
          }]
        },
        metadata: {
          analyzedAt: new Date(),
          dataPoints: 90,
          confidenceScore: 0.85,
          modelVersion: '1.0'
        }
      },
      imageUrl: '/placeholder-product.jpg',
      category: 'Electronics'
    },
    {
      asin: 'B07XJ8C8F7',
      title: 'スマートウォッチ フィットネストラッカー',
      currentPrice: 8990,
      aiScore: 78,
      aiInsights: {
        asin: 'B07XJ8C8F7',
        summary: '健康志向の高まりで需要安定',
        marketPosition: 'niche',
        competitiveness: 68,
        profitabilityScore: 75,
        riskScore: 35,
        demandIndicators: {
          salesRankTrend: 'stable',
          priceElasticity: 0.4,
          marketSaturation: 'low'
        },
        strategicRecommendations: ['マーケティング強化', '機能向上'],
        nextReviewDate: new Date()
      },
      priceAnalysis: {
        asin: 'B07XJ8C8F7',
        analysis: {
          trend: 'stable',
          trendStrength: 0.05,
          volatility: 8,
          seasonality: [],
          anomalies: [],
          predictions: [],
          insights: ['安定した価格動向'],
          recommendations: [{
            type: 'hold',
            reason: '市場状況安定',
            riskLevel: 'medium',
            timeframe: '継続監視',
            confidence: 0.7
          }]
        },
        metadata: {
          analyzedAt: new Date(),
          dataPoints: 90,
          confidenceScore: 0.75,
          modelVersion: '1.0'
        }
      },
      imageUrl: '/placeholder-product.jpg',
      category: 'Sports'
    },
    {
      asin: 'B09JNKQX2Y',
      title: 'USB充電器 急速充電対応',
      currentPrice: 2580,
      aiScore: 72,
      aiInsights: {
        asin: 'B09JNKQX2Y',
        summary: '汎用性の高い充電器',
        marketPosition: 'follower',
        competitiveness: 65,
        profitabilityScore: 68,
        riskScore: 40,
        demandIndicators: {
          salesRankTrend: 'stable',
          priceElasticity: 0.5,
          marketSaturation: 'high'
        },
        strategicRecommendations: ['価格競争力強化'],
        nextReviewDate: new Date()
      },
      priceAnalysis: {
        asin: 'B09JNKQX2Y',
        analysis: {
          trend: 'falling',
          trendStrength: 0.08,
          volatility: 15,
          seasonality: [],
          anomalies: [],
          predictions: [],
          insights: ['価格競争激化'],
          recommendations: [{
            type: 'watch',
            reason: '価格下落継続',
            riskLevel: 'medium',
            timeframe: '価格安定まで',
            confidence: 0.6
          }]
        },
        metadata: {
          analyzedAt: new Date(),
          dataPoints: 90,
          confidenceScore: 0.65,
          modelVersion: '1.0'
        }
      },
      imageUrl: '/placeholder-product.jpg',
      category: 'Electronics'
    },
    {
      asin: 'B08HLKZX9P',
      title: 'アロマディフューザー 超音波式',
      currentPrice: 4200,
      aiScore: 88,
      aiInsights: {
        asin: 'B08HLKZX9P',
        summary: 'リラックス需要で人気上昇',
        marketPosition: 'leader',
        competitiveness: 85,
        profitabilityScore: 90,
        riskScore: 15,
        demandIndicators: {
          salesRankTrend: 'improving',
          priceElasticity: 0.2,
          marketSaturation: 'low'
        },
        strategicRecommendations: ['在庫拡大', '関連商品展開'],
        nextReviewDate: new Date()
      },
      priceAnalysis: {
        asin: 'B08HLKZX9P',
        analysis: {
          trend: 'rising',
          trendStrength: 0.20,
          volatility: 6,
          seasonality: [],
          anomalies: [],
          predictions: [],
          insights: ['強い上昇トレンド'],
          recommendations: [{
            type: 'buy',
            reason: '需要急増中',
            riskLevel: 'low',
            timeframe: '即座に',
            confidence: 0.9
          }]
        },
        metadata: {
          analyzedAt: new Date(),
          dataPoints: 90,
          confidenceScore: 0.9,
          modelVersion: '1.0'
        }
      },
      imageUrl: '/placeholder-product.jpg',
      category: 'Home'
    },
    {
      asin: 'B07QXMNF1X',
      title: 'ゲーミングマウス RGB LED',
      currentPrice: 6780,
      aiScore: 65,
      aiInsights: {
        asin: 'B07QXMNF1X',
        summary: 'ゲーミング市場で競争激化',
        marketPosition: 'follower',
        competitiveness: 58,
        profitabilityScore: 60,
        riskScore: 55,
        demandIndicators: {
          salesRankTrend: 'declining',
          priceElasticity: 0.6,
          marketSaturation: 'high'
        },
        strategicRecommendations: ['差別化戦略', 'コスト削減'],
        nextReviewDate: new Date()
      },
      priceAnalysis: {
        asin: 'B07QXMNF1X',
        analysis: {
          trend: 'volatile',
          trendStrength: 0.12,
          volatility: 22,
          seasonality: [],
          anomalies: [],
          predictions: [],
          insights: ['価格変動が激しい'],
          recommendations: [{
            type: 'watch',
            reason: '市場不安定',
            riskLevel: 'high',
            timeframe: '慎重に監視',
            confidence: 0.5
          }]
        },
        metadata: {
          analyzedAt: new Date(),
          dataPoints: 90,
          confidenceScore: 0.55,
          modelVersion: '1.0'
        }
      },
      imageUrl: '/placeholder-product.jpg',
      category: 'Gaming'
    }
  ];

  // Filter based on query keywords
  const queryTerms = query.toLowerCase().split(' ');
  return mockProducts.filter(product => {
    const titleLower = product.title.toLowerCase();
    return queryTerms.some(term => titleLower.includes(term)) || 
           queryTerms.length === 0;
  });
}

function calculateAIScore(
  product: AISearchResult, 
  query: string, 
  options: AISearchOptions
): number {
  let score = product.aiInsights.profitabilityScore * 0.4 +
              (100 - product.aiInsights.riskScore) * 0.3 +
              product.aiInsights.competitiveness * 0.3;

  // Boost score based on query relevance
  const queryLower = query.toLowerCase();
  const titleLower = product.title.toLowerCase();
  
  if (queryLower.includes('人気') || queryLower.includes('トレンド')) {
    if (product.aiInsights.demandIndicators.salesRankTrend === 'improving') {
      score += 15;
    }
  }
  
  if (queryLower.includes('安全') || queryLower.includes('リスク低')) {
    if (product.aiInsights.riskScore < 30) {
      score += 10;
    }
  }
  
  if (queryLower.includes('利益') || queryLower.includes('儲かる')) {
    if (product.aiInsights.profitabilityScore > 80) {
      score += 12;
    }
  }

  // Keyword matching boost
  const queryTerms = queryLower.split(' ');
  const matchCount = queryTerms.filter(term => titleLower.includes(term)).length;
  score += (matchCount / queryTerms.length) * 20;

  return Math.min(100, Math.max(0, Math.round(score)));
}