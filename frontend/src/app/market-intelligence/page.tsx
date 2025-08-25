'use client';

import { useState, useEffect } from 'react';
import { MarketIntelligenceDashboard } from '@/components/ai/MarketIntelligenceDashboard';
import { PortfolioOptimizer } from '@/components/ai/PortfolioOptimizer';
import { AISearchResult } from '@/types/ai';
import { Card } from '@/components/ui';

export default function MarketIntelligencePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio'>('dashboard');
  const [portfolioProducts, setPortfolioProducts] = useState<AISearchResult[]>([]);

  // Load sample portfolio products
  useEffect(() => {
    loadSamplePortfolio();
  }, []);

  const loadSamplePortfolio = async () => {
    // Mock portfolio products
    const sampleProducts: AISearchResult[] = [
      {
        asin: 'B08N5WRWNW',
        title: 'ワイヤレスイヤホン Bluetooth 5.0 高音質',
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
        title: 'USB充電器 急速充電対応 Type-C',
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
        title: 'アロマディフューザー 超音波式 LED',
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
        title: 'ゲーミングマウス RGB LED 高DPI',
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

    setPortfolioProducts(sampleProducts);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧠 AI市場インテリジェンス
          </h1>
          <p className="text-gray-600">
            人工知能による市場分析とポートフォリオ最適化システム
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 border-b border-gray-200">
          {[
            { 
              id: 'dashboard', 
              label: '市場インテリジェンス', 
              icon: '📊', 
              description: 'リアルタイム市場分析とアラート' 
            },
            { 
              id: 'portfolio', 
              label: 'ポートフォリオ最適化', 
              icon: '⚖️', 
              description: 'AI による最適な商品配分' 
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <div className="text-left">
                <div>{tab.label}</div>
                <div className="text-xs opacity-70">{tab.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <h2 className="text-xl font-semibold mb-2">🔍 市場インテリジェンス</h2>
              <p className="text-gray-600 mb-4">
                AIが24時間体制で市場データを監視し、リアルタイムでトレンド分析、リスク評価、
                投資機会の発見を行います。データドリブンな意思決定をサポートします。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>リアルタイム市場監視</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>自動トレンド分析</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>リスク早期警告</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>投資機会発見</span>
                </div>
              </div>
            </Card>

            <MarketIntelligenceDashboard 
              refreshInterval={15}
              voiceAlerts={false}
              autoGenerate={true}
            />
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
              <h2 className="text-xl font-semibold mb-2">⚖️ ポートフォリオ最適化</h2>
              <p className="text-gray-600 mb-4">
                AIがあなたの投資目標とリスク許容度に基づいて、最適な商品配分を計算します。
                現代ポートフォリオ理論と機械学習を組み合わせた高度な最適化アルゴリズムを使用。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>リスク・リターン最適化</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>分散投資提案</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>動的リバランシング</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>シナリオ分析</span>
                </div>
              </div>
            </Card>

            <PortfolioOptimizer
              currentProducts={portfolioProducts}
              budget={500000}
              riskTolerance="moderate"
              timeHorizon="medium"
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 p-6 bg-white rounded-lg border border-gray-200">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">🚀 AI市場インテリジェンスの特徴</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
              <div className="text-center">
                <div className="text-3xl mb-2">🧠</div>
                <h4 className="font-medium">深層学習</h4>
                <p className="text-xs text-gray-600">
                  複雑な市場パターンを学習
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <h4 className="font-medium">ビッグデータ</h4>
                <p className="text-xs text-gray-600">
                  数百万の商品データを分析
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">⚡</div>
                <h4 className="font-medium">リアルタイム</h4>
                <p className="text-xs text-gray-600">
                  即座に市場変化を検知
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h4 className="font-medium">精密予測</h4>
                <p className="text-xs text-gray-600">
                  高精度な価格予測モデル
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}