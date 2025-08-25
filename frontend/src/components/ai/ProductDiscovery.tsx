'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AISearchResult } from '@/types/ai';
import { Card, Badge, Button } from '@/components/ui';
import { useSpeechSynthesis } from '@/lib/speech';

interface ProductDiscoveryProps {
  userId?: string;
  userPreferences?: {
    categories: string[];
    priceRange: { min: number; max: number };
    riskTolerance: 'low' | 'medium' | 'high';
    profitabilityThreshold: number;
  };
}

interface DiscoveryInsight {
  id: string;
  type: 'trend' | 'opportunity' | 'alert' | 'recommendation';
  title: string;
  description: string;
  products: AISearchResult[];
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  actionRequired: boolean;
  createdAt: Date;
}

export function ProductDiscovery({ 
  userId, 
  userPreferences 
}: ProductDiscoveryProps) {
  const [insights, setInsights] = useState<DiscoveryInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<DiscoveryInsight | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { speak, voices } = useSpeechSynthesis();

  useEffect(() => {
    generateProactiveInsights();

    // Auto-refresh insights every 30 minutes
    if (autoRefresh) {
      const interval = setInterval(generateProactiveInsights, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [userPreferences, autoRefresh]);

  const generateProactiveInsights = async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate AI analysis time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newInsights = await analyzeMarketOpportunities();
      setInsights(newInsights);
      
      // Speak high-priority insights if voice is enabled
      if (voiceEnabled) {
        const urgentInsights = newInsights.filter(i => i.urgency === 'high');
        if (urgentInsights.length > 0) {
          const message = `${urgentInsights.length}件の重要な市場情報があります。${urgentInsights[0].title}`;
          speak({
            text: message,
            voice: voices.find(v => v.lang.includes('ja')),
            rate: 1,
            pitch: 1
          });
        }
      }
      
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeMarketOpportunities = async (): Promise<DiscoveryInsight[]> => {
    // Mock AI-generated insights
    const mockInsights: DiscoveryInsight[] = [
      {
        id: 'trend-1',
        type: 'trend',
        title: 'ワイヤレス充電器の需要急増',
        description: 'iPhone 15のUSB-C採用により、ワイヤレス充電器の需要が過去30日で150%増加しています。特に急速充電対応製品の人気が高まっています。',
        products: await generateTrendingProducts('wireless_charger'),
        confidence: 0.92,
        urgency: 'high',
        actionRequired: true,
        createdAt: new Date()
      },
      {
        id: 'opportunity-1',
        type: 'opportunity',
        title: 'ゲーミングアクセサリーの価格ギャップ',
        description: '海外と日本の価格差が30%以上ある商品を発見しました。輸入による利益機会があります。',
        products: await generateOpportunityProducts('gaming_accessories'),
        confidence: 0.85,
        urgency: 'medium',
        actionRequired: true,
        createdAt: new Date()
      },
      {
        id: 'alert-1',
        type: 'alert',
        title: 'スマートウォッチ市場の飽和警告',
        description: '低価格帯スマートウォッチの競争が激化しています。新規参入は慎重に検討することをお勧めします。',
        products: await generateAlertProducts('smartwatch'),
        confidence: 0.78,
        urgency: 'medium',
        actionRequired: false,
        createdAt: new Date()
      },
      {
        id: 'recommendation-1',
        type: 'recommendation',
        title: '季節商品の仕入れタイミング',
        description: '冬季商品（暖房器具、防寒グッズ）の仕入れに最適な時期です。過去データから11月上旬が最も利益率が高くなる傾向があります。',
        products: await generateSeasonalProducts('winter_goods'),
        confidence: 0.88,
        urgency: 'low',
        actionRequired: true,
        createdAt: new Date()
      },
      {
        id: 'trend-2',
        type: 'trend',
        title: 'サステナブル商品への関心増加',
        description: 'エコフレンドリーな商品の検索数が40%増加。特に再利用可能な日用品や生分解性素材の商品に注目が集まっています。',
        products: await generateTrendingProducts('sustainable_products'),
        confidence: 0.81,
        urgency: 'medium',
        actionRequired: true,
        createdAt: new Date()
      }
    ];

    // Filter based on user preferences if available
    if (userPreferences) {
      return mockInsights.filter(insight => {
        const avgPrice = insight.products.reduce((sum, p) => sum + p.currentPrice, 0) / insight.products.length;
        return avgPrice >= userPreferences.priceRange.min && 
               avgPrice <= userPreferences.priceRange.max;
      });
    }

    return mockInsights;
  };

  const generateTrendingProducts = async (category: string): Promise<AISearchResult[]> => {
    // Mock trending products
    return [
      {
        asin: 'B08N5WRWNW',
        title: '急速ワイヤレス充電器 15W対応',
        currentPrice: 3200,
        aiScore: 92,
        aiInsights: {
          asin: 'B08N5WRWNW',
          summary: '需要急増中のワイヤレス充電器',
          marketPosition: 'leader',
          competitiveness: 88,
          profitabilityScore: 85,
          riskScore: 15,
          demandIndicators: {
            salesRankTrend: 'improving',
            priceElasticity: 0.2,
            marketSaturation: 'low'
          },
          strategicRecommendations: ['在庫確保優先', '価格維持'],
          nextReviewDate: new Date()
        },
        priceAnalysis: {
          asin: 'B08N5WRWNW',
          analysis: {
            trend: 'rising',
            trendStrength: 0.25,
            volatility: 8,
            seasonality: [],
            anomalies: [],
            predictions: [],
            insights: ['急速な価格上昇トレンド'],
            recommendations: [{
              type: 'buy',
              reason: '需要急増により利益機会拡大',
              riskLevel: 'low',
              timeframe: '即座に',
              confidence: 0.9
            }]
          },
          metadata: {
            analyzedAt: new Date(),
            dataPoints: 90,
            confidenceScore: 0.92,
            modelVersion: '1.0'
          }
        },
        imageUrl: '/placeholder-product.jpg',
        category: 'Electronics'
      }
    ];
  };

  const generateOpportunityProducts = async (category: string): Promise<AISearchResult[]> => {
    return [
      {
        asin: 'B07QXMNF1X',
        title: 'ゲーミングキーボード RGB LED',
        currentPrice: 8900,
        aiScore: 78,
        aiInsights: {
          asin: 'B07QXMNF1X',
          summary: '価格裁定機会あり',
          marketPosition: 'follower',
          competitiveness: 70,
          profitabilityScore: 82,
          riskScore: 25,
          demandIndicators: {
            salesRankTrend: 'stable',
            priceElasticity: 0.4,
            marketSaturation: 'medium'
          },
          strategicRecommendations: ['海外調達検討', '価格競争力強化'],
          nextReviewDate: new Date()
        },
        priceAnalysis: {
          asin: 'B07QXMNF1X',
          analysis: {
            trend: 'stable',
            trendStrength: 0.05,
            volatility: 12,
            seasonality: [],
            anomalies: [],
            predictions: [],
            insights: ['価格安定期'],
            recommendations: [{
              type: 'buy',
              reason: '海外との価格差活用',
              riskLevel: 'medium',
              timeframe: '2-3週間',
              confidence: 0.75
            }]
          },
          metadata: {
            analyzedAt: new Date(),
            dataPoints: 90,
            confidenceScore: 0.78,
            modelVersion: '1.0'
          }
        },
        imageUrl: '/placeholder-product.jpg',
        category: 'Gaming'
      }
    ];
  };

  const generateAlertProducts = async (category: string): Promise<AISearchResult[]> => {
    return [
      {
        asin: 'B07XJ8C8F7',
        title: 'スマートウォッチ 低価格モデル',
        currentPrice: 4500,
        aiScore: 45,
        aiInsights: {
          asin: 'B07XJ8C8F7',
          summary: '市場飽和により競争激化',
          marketPosition: 'declining',
          competitiveness: 35,
          profitabilityScore: 40,
          riskScore: 70,
          demandIndicators: {
            salesRankTrend: 'declining',
            priceElasticity: 0.8,
            marketSaturation: 'high'
          },
          strategicRecommendations: ['市場からの撤退検討', '差別化戦略'],
          nextReviewDate: new Date()
        },
        priceAnalysis: {
          asin: 'B07XJ8C8F7',
          analysis: {
            trend: 'falling',
            trendStrength: 0.18,
            volatility: 25,
            seasonality: [],
            anomalies: [],
            predictions: [],
            insights: ['価格下落継続中'],
            recommendations: [{
              type: 'sell',
              reason: '市場環境悪化',
              riskLevel: 'high',
              timeframe: '早急に',
              confidence: 0.85
            }]
          },
          metadata: {
            analyzedAt: new Date(),
            dataPoints: 90,
            confidenceScore: 0.78,
            modelVersion: '1.0'
          }
        },
        imageUrl: '/placeholder-product.jpg',
        category: 'Electronics'
      }
    ];
  };

  const generateSeasonalProducts = async (category: string): Promise<AISearchResult[]> => {
    return [
      {
        asin: 'B09SEASONAL',
        title: 'セラミックファンヒーター 小型',
        currentPrice: 6800,
        aiScore: 88,
        aiInsights: {
          asin: 'B09SEASONAL',
          summary: '冬季需要で価格上昇期待',
          marketPosition: 'follower',
          competitiveness: 75,
          profitabilityScore: 90,
          riskScore: 20,
          demandIndicators: {
            salesRankTrend: 'improving',
            priceElasticity: 0.3,
            marketSaturation: 'low'
          },
          strategicRecommendations: ['在庫拡大', '早期仕入れ'],
          nextReviewDate: new Date()
        },
        priceAnalysis: {
          asin: 'B09SEASONAL',
          analysis: {
            trend: 'rising',
            trendStrength: 0.22,
            volatility: 10,
            seasonality: [{
              period: 'yearly',
              strength: 0.8,
              peakPeriods: ['December', 'January'],
              lowPeriods: ['June', 'July']
            }],
            anomalies: [],
            predictions: [],
            insights: ['季節性の強い商品'],
            recommendations: [{
              type: 'buy',
              reason: '冬季需要増加見込み',
              riskLevel: 'low',
              timeframe: '1-2週間',
              confidence: 0.9
            }]
          },
          metadata: {
            analyzedAt: new Date(),
            dataPoints: 365,
            confidenceScore: 0.88,
            modelVersion: '1.0'
          }
        },
        imageUrl: '/placeholder-product.jpg',
        category: 'Home'
      }
    ];
  };

  const handleInsightClick = (insight: DiscoveryInsight) => {
    setSelectedInsight(insight);
    
    if (voiceEnabled) {
      speak({
        text: `${insight.title}。${insight.description}`,
        voice: voices.find(v => v.lang.includes('ja')),
        rate: 1,
        pitch: 1
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trend': return '📈';
      case 'opportunity': return '💡';
      case 'alert': return '⚠️';
      case 'recommendation': return '🎯';
      default: return '📊';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">プロアクティブ商品発見</h2>
            <p className="text-sm text-gray-600">AIが市場機会を自動的に発見し、お知らせします</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              音声通知
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              自動更新
            </label>
            <Button
              size="sm"
              onClick={generateProactiveInsights}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? '分析中...' : '更新'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Analysis Status */}
      {isAnalyzing && (
        <Card className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">AIが市場データを分析中...</p>
              <p className="text-sm text-gray-500 mt-2">数千の商品データを解析しています</p>
            </div>
          </div>
        </Card>
      )}

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`p-4 cursor-pointer transition-all hover:shadow-lg border-l-4 ${getUrgencyColor(insight.urgency)}`}
                onClick={() => handleInsightClick(insight)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(insight.type)}</span>
                    <Badge variant={insight.urgency === 'high' ? 'destructive' : 
                                  insight.urgency === 'medium' ? 'default' : 'success'}>
                      {insight.urgency === 'high' ? '緊急' : 
                       insight.urgency === 'medium' ? '重要' : '通常'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    信頼度 {(insight.confidence * 100).toFixed(0)}%
                  </div>
                </div>
                
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                  {insight.title}
                </h3>
                
                <p className="text-xs text-gray-600 mb-3 line-clamp-3">
                  {insight.description}
                </p>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    関連商品: {insight.products.length}件
                  </span>
                  {insight.actionRequired && (
                    <Badge variant="outline">
                      アクション要
                    </Badge>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-500">
                    {insight.createdAt.toLocaleString('ja-JP')}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Detailed View Modal */}
      <AnimatePresence>
        {selectedInsight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedInsight(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">{selectedInsight.title}</h2>
                    <p className="text-gray-600">{selectedInsight.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedInsight(null)}
                  >
                    閉じる
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(selectedInsight.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">信頼度</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedInsight.products.length}
                    </div>
                    <div className="text-sm text-gray-600">関連商品</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedInsight.urgency === 'high' ? '緊急' : 
                       selectedInsight.urgency === 'medium' ? '重要' : '通常'}
                    </div>
                    <div className="text-sm text-gray-600">優先度</div>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold mb-4">関連商品</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedInsight.products.map((product) => (
                    <div key={product.asin} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded-md"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{product.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              AIスコア: {product.aiScore}
                            </Badge>
                            <Badge 
                              variant={product.aiInsights.profitabilityScore > 70 ? 'success' : 'outline'}
                            >
                              利益率: {product.aiInsights.profitabilityScore}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            ¥{product.currentPrice.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}