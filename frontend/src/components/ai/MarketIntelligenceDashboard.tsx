'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { MarketIntelligence, AISearchResult } from '@/types/ai';
import { Card, Badge, Button } from '@/components/ui';
import { useSpeechSynthesis } from '@/lib/speech';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

interface MarketIntelligenceDashboardProps {
  refreshInterval?: number; // minutes
  voiceAlerts?: boolean;
  autoGenerate?: boolean;
}

interface MarketMetrics {
  totalVolume: number;
  avgProfitability: number;
  riskIndex: number;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  activeCategories: number;
  trendingProducts: number;
  priceVolatility: number;
  competitiveIndex: number;
}

interface TrendData {
  period: string;
  volume: number;
  profitability: number;
  riskScore: number;
  sentiment: number;
}

export function MarketIntelligenceDashboard({
  refreshInterval = 15,
  voiceAlerts = false,
  autoGenerate = true
}: MarketIntelligenceDashboardProps) {
  const [intelligence, setIntelligence] = useState<MarketIntelligence | null>(null);
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [alertsEnabled, setAlertsEnabled] = useState(voiceAlerts);

  const { speak, voices } = useSpeechSynthesis();

  useEffect(() => {
    generateMarketIntelligence();

    if (autoGenerate) {
      const interval = setInterval(generateMarketIntelligence, refreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, autoGenerate]);

  const generateMarketIntelligence = async () => {
    setIsLoading(true);
    
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newIntelligence = await analyzeMarketIntelligence();
      const newMetrics = await calculateMarketMetrics();
      const newTrendData = await generateTrendData();
      
      setIntelligence(newIntelligence);
      setMetrics(newMetrics);
      setTrendData(newTrendData);
      setLastUpdate(new Date());

      // Check for high-priority alerts
      if (alertsEnabled && newIntelligence.riskAlerts.length > 0) {
        const highRiskAlerts = newIntelligence.riskAlerts.filter(alert => alert.severity === 'high');
        if (highRiskAlerts.length > 0) {
          const message = `${highRiskAlerts.length}件の高リスクアラートが発生しました。`;
          speak({
            text: message,
            voice: voices.find(v => v.lang.includes('ja')),
            rate: 1,
            pitch: 1
          });
        }
      }

    } catch (error) {
      console.error('Failed to generate market intelligence:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeMarketIntelligence = async (): Promise<MarketIntelligence> => {
    // Mock market intelligence data
    return {
      overallTrends: {
        priceDirection: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable',
        volatilityLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
        seasonalFactors: ['年末商戦前', 'ブラックフライデー効果', '冬物需要増加']
      },
      topOpportunities: await generateTopOpportunities(),
      riskAlerts: [
        {
          type: 'price_volatility',
          severity: 'medium',
          affectedProducts: ['B08N5WRWNW', 'B07XJ8C8F7'],
          recommendation: 'ボラティリティが高い商品の在庫調整を検討してください。'
        },
        {
          type: 'market_saturation',
          severity: 'high',
          affectedProducts: ['B09JNKQX2Y'],
          recommendation: '市場飽和により価格競争が激化しています。差別化戦略が必要です。'
        }
      ],
      marketReports: [
        {
          title: '週次市場分析レポート',
          summary: '全体的に上昇トレンドが継続。特にエレクトロニクス分野で強い成長を確認。',
          keyInsights: [
            'ワイヤレス機器の需要が前週比30%増加',
            'ゲーミング関連商品の価格安定化',
            'ホーム＆キッチン分野で新規参入増加'
          ],
          generatedAt: new Date()
        }
      ]
    };
  };

  const generateTopOpportunities = async (): Promise<AISearchResult[]> => {
    // Mock top opportunities
    return [
      {
        asin: 'B08N5WRWNW',
        title: 'ワイヤレス充電器 最新型',
        currentPrice: 3200,
        aiScore: 94,
        aiInsights: {
          asin: 'B08N5WRWNW',
          summary: '急成長市場での最有力候補',
          marketPosition: 'leader',
          competitiveness: 92,
          profitabilityScore: 95,
          riskScore: 12,
          demandIndicators: {
            salesRankTrend: 'improving',
            priceElasticity: 0.15,
            marketSaturation: 'low'
          },
          strategicRecommendations: ['即座に在庫確保', '競合との差別化'],
          nextReviewDate: new Date()
        },
        priceAnalysis: {
          asin: 'B08N5WRWNW',
          analysis: {
            trend: 'rising',
            trendStrength: 0.28,
            volatility: 5,
            seasonality: [],
            anomalies: [],
            predictions: [],
            insights: ['爆発的需要増加中'],
            recommendations: [{
              type: 'buy',
              reason: '市場拡大フェーズ',
              riskLevel: 'low',
              timeframe: '直ちに',
              confidence: 0.95
            }]
          },
          metadata: {
            analyzedAt: new Date(),
            dataPoints: 90,
            confidenceScore: 0.94,
            modelVersion: '1.0'
          }
        },
        imageUrl: '/placeholder-product.jpg',
        category: 'Electronics'
      }
    ];
  };

  const calculateMarketMetrics = async (): Promise<MarketMetrics> => {
    // Mock market metrics
    return {
      totalVolume: 15847,
      avgProfitability: 68.3,
      riskIndex: 32.1,
      marketSentiment: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'bearish' : 'neutral',
      activeCategories: 24,
      trendingProducts: 156,
      priceVolatility: 14.7,
      competitiveIndex: 71.2
    };
  };

  const generateTrendData = async (): Promise<TrendData[]> => {
    const periods = ['6時間前', '5時間前', '4時間前', '3時間前', '2時間前', '1時間前', '現在'];
    
    return periods.map((period, index) => ({
      period,
      volume: Math.floor(Math.random() * 5000) + 10000 + (index * 200),
      profitability: Math.floor(Math.random() * 20) + 60 + (index * 1.2),
      riskScore: Math.floor(Math.random() * 15) + 25,
      sentiment: Math.floor(Math.random() * 40) + 30 + (index * 2)
    }));
  };

  // Chart configurations
  const trendChartData = {
    labels: trendData.map(d => d.period),
    datasets: [
      {
        label: '市場ボリューム',
        data: trendData.map(d => d.volume),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        yAxisID: 'y',
      },
      {
        label: '利益率 (%)',
        data: trendData.map(d => d.profitability),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        yAxisID: 'y1',
      }
    ],
  };

  const trendChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '時間'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'ボリューム'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '利益率 (%)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const sentimentChartData = {
    labels: ['強気', '中立', '弱気'],
    datasets: [
      {
        data: [45, 35, 20], // Mock sentiment data
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(156, 163, 175)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const riskRadarData = {
    labels: ['価格変動', '市場飽和', '競合圧力', '需要変動', '供給リスク', '季節要因'],
    datasets: [
      {
        label: '現在のリスクレベル',
        data: [32, 45, 28, 38, 22, 35], // Mock risk data
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
      },
    ],
  };

  if (!intelligence || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">市場データを分析中...</p>
          <p className="text-sm text-gray-500 mt-2">AIが数千の商品データを解析しています</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🧠 AI市場インテリジェンス
            </h1>
            <p className="text-gray-600 mt-1">
              リアルタイム市場分析と自動レポート生成
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <div className="text-gray-500">最終更新</div>
              <div className="font-medium">
                {lastUpdate.toLocaleString('ja-JP')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={alertsEnabled}
                  onChange={(e) => setAlertsEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                音声アラート
              </label>
              <Button
                onClick={generateMarketIntelligence}
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? '分析中...' : '更新'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">市場ボリューム</p>
              <p className="text-2xl font-bold text-blue-600">
                {metrics.totalVolume.toLocaleString()}
              </p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
          <div className="mt-2">
            <Badge variant="success">+12% vs 前日</Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均利益率</p>
              <p className="text-2xl font-bold text-green-600">
                {metrics.avgProfitability.toFixed(1)}%
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
          <div className="mt-2">
            <Badge variant="success">+2.3% vs 前週</Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">リスク指数</p>
              <p className="text-2xl font-bold text-yellow-600">
                {metrics.riskIndex.toFixed(1)}
              </p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
          <div className="mt-2">
            <Badge variant="outline">中リスク</Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">市場センチメント</p>
              <p className="text-2xl font-bold text-purple-600">
                {metrics.marketSentiment === 'bullish' ? '強気' :
                 metrics.marketSentiment === 'bearish' ? '弱気' : '中立'}
              </p>
            </div>
            <div className="text-3xl">
              {metrics.marketSentiment === 'bullish' ? '🚀' :
               metrics.marketSentiment === 'bearish' ? '📉' : '⚖️'}
            </div>
          </div>
          <div className="mt-2">
            <Badge 
              variant={metrics.marketSentiment === 'bullish' ? 'success' : 
                      metrics.marketSentiment === 'bearish' ? 'destructive' : 'outline'}
            >
              {metrics.marketSentiment === 'bullish' ? '上昇期待' :
               metrics.marketSentiment === 'bearish' ? '下降警戒' : '安定'}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Trend Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">市場トレンド分析</h3>
          <div className="h-80">
            <Line data={trendChartData} options={trendChartOptions} />
          </div>
        </Card>

        {/* Sentiment Analysis */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">市場センチメント</h3>
          <div className="h-80 flex items-center justify-center">
            <div className="w-64 h-64">
              <Doughnut data={sentimentChartData} />
            </div>
          </div>
        </Card>

        {/* Risk Analysis Radar */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">リスクファクター分析</h3>
          <div className="h-80 flex items-center justify-center">
            <div className="w-96 h-80">
              <Radar data={riskRadarData} />
            </div>
          </div>
        </Card>
      </div>

      {/* Opportunities and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Opportunities */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            🏆 トップ商機 ({intelligence.topOpportunities.length}件)
          </h3>
          <div className="space-y-4">
            {intelligence.topOpportunities.slice(0, 5).map((opportunity, index) => (
              <motion.div
                key={opportunity.asin}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                {opportunity.imageUrl && (
                  <img
                    src={opportunity.imageUrl}
                    alt={opportunity.title}
                    className="w-12 h-12 object-cover rounded-md"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-sm truncate">
                    {opportunity.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="success">
                      AIスコア: {opportunity.aiScore}
                    </Badge>
                    <Badge variant="outline">
                      ¥{opportunity.currentPrice.toLocaleString()}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {opportunity.aiInsights.profitabilityScore}%
                  </div>
                  <div className="text-xs text-gray-500">利益率</div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Risk Alerts */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            ⚠️ リスクアラート ({intelligence.riskAlerts.length}件)
          </h3>
          <div className="space-y-4">
            {intelligence.riskAlerts.map((alert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'high' 
                    ? 'border-red-500 bg-red-50' 
                    : alert.severity === 'medium'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge
                    variant={alert.severity === 'high' ? 'destructive' : 
                            alert.severity === 'medium' ? 'default' : 'outline'}
                  >
                    {alert.severity === 'high' ? '高リスク' :
                     alert.severity === 'medium' ? '中リスク' : '低リスク'}
                  </Badge>
                  <div className="text-xs text-gray-500">
                    影響商品: {alert.affectedProducts.length}件
                  </div>
                </div>
                <h4 className="font-medium text-sm mb-1">
                  {alert.type === 'price_volatility' ? '価格変動警告' :
                   alert.type === 'market_saturation' ? '市場飽和警告' :
                   alert.type === 'seasonal_decline' ? '季節的下落警告' : 'その他のリスク'}
                </h4>
                <p className="text-xs text-gray-600">
                  {alert.recommendation}
                </p>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Market Reports */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          📊 AI生成市場レポート
        </h3>
        <div className="space-y-6">
          {intelligence.marketReports.map((report, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{report.title}</h4>
                <div className="text-xs text-gray-500">
                  {report.generatedAt.toLocaleString('ja-JP')}
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{report.summary}</p>
              
              <div>
                <h5 className="font-medium text-sm mb-2">主要インサイト:</h5>
                <ul className="space-y-1">
                  {report.keyInsights.map((insight, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}