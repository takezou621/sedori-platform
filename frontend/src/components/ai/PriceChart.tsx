'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  TimeScale,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechSynthesis } from '@/lib/speech';
import { 
  PriceDataPoint, 
  KeepaPriceAnalysis, 
  ChartConfig,
  VoiceAnalysis,
  NaturalLanguageQuery 
} from '@/types/ai';
import { Button, Card, Badge } from '@/components/ui';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface PriceChartProps {
  asin: string;
  priceData: PriceDataPoint[];
  analysis: KeepaPriceAnalysis;
  onNaturalLanguageQuery?: (query: NaturalLanguageQuery) => Promise<string>;
}

export function PriceChart({ 
  asin, 
  priceData, 
  analysis, 
  onNaturalLanguageQuery 
}: PriceChartProps) {
  const [config, setConfig] = useState<ChartConfig>({
    type: 'line',
    timeRange: '90d',
    showPredictions: true,
    showAnomalies: true,
    showSeasonality: false,
    voiceEnabled: false
  });

  const [voiceConfig, setVoiceConfig] = useState<VoiceAnalysis>({
    enabled: false,
    language: 'ja',
    speed: 1,
    pitch: 1
  });

  const [naturalQuery, setNaturalQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { speak, cancel, speaking, voices } = useSpeechSynthesis();
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Prepare chart data - simplified for type compatibility
  const chartData = {
    labels: priceData.map(point => point.timestamp),
    datasets: [
      {
        label: '価格履歴',
        data: priceData.map(point => point.price),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `価格分析 - ${asin}`,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            const label = context.dataset.label;
            return `${label}: ¥${value.toLocaleString()}`;
          },
          afterBody: function(tooltipItems) {
            const dataIndex = tooltipItems[0].dataIndex;
            const anomaly = analysis.analysis.anomalies.find(a => 
              new Date(a.timestamp).getTime() === new Date(tooltipItems[0].label).getTime()
            );
            
            if (anomaly) {
              return [
                `異常タイプ: ${anomaly.type === 'spike' ? '急騰' : '急落'}`,
                `深刻度: ${anomaly.severity}`,
                anomaly.possibleCause ? `原因: ${anomaly.possibleCause}` : ''
              ].filter(Boolean);
            }
            
            return [];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            day: 'MM/dd',
            month: 'yyyy/MM'
          }
        },
        title: {
          display: true,
          text: '日付'
        }
      },
      y: {
        title: {
          display: true,
          text: '価格 (¥)'
        },
        ticks: {
          callback: function(value) {
            return `¥${Number(value).toLocaleString()}`;
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && config.voiceEnabled) {
        const element = elements[0];
        const dataIndex = element.index;
        const price = priceData[dataIndex];
        
        speakPricePoint(price);
      }
    }
  };

  // Voice explanation for price points
  const speakPricePoint = (pricePoint: PriceDataPoint) => {
    if (!voiceConfig.enabled) return;
    
    const date = new Date(pricePoint.timestamp);
    const formattedDate = date.toLocaleDateString('ja-JP');
    const formattedPrice = pricePoint.price.toLocaleString();
    
    const message = `${formattedDate}の価格は${formattedPrice}円です。`;
    
    speak({
      text: message,
      voice: voices.find(v => v.lang.includes(voiceConfig.language)),
      rate: voiceConfig.speed,
      pitch: voiceConfig.pitch
    });
  };

  // Natural language analysis
  const handleNaturalLanguageQuery = async () => {
    if (!naturalQuery.trim() || !onNaturalLanguageQuery) return;
    
    setIsAnalyzing(true);
    try {
      const query: NaturalLanguageQuery = {
        question: naturalQuery,
        context: 'price',
        timeframe: config.timeRange
      };
      
      const response = await onNaturalLanguageQuery(query);
      setAiResponse(response);
      
      // Optionally speak the response
      if (voiceConfig.enabled) {
        speak({
          text: response,
          voice: voices.find(v => v.lang.includes(voiceConfig.language)),
          rate: voiceConfig.speed,
          pitch: voiceConfig.pitch
        });
      }
    } catch (error) {
      console.error('Natural language query failed:', error);
      setAiResponse('申し訳ございません。分析に失敗しました。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate automatic insights on mount
  useEffect(() => {
    if (analysis.analysis.insights.length > 0) {
      const insight = analysis.analysis.insights[0];
      setAiResponse(insight);
    }
  }, [analysis]);

  // Auto-speak analysis when voice is enabled
  useEffect(() => {
    if (voiceConfig.enabled && analysis.analysis.insights.length > 0) {
      const mainInsight = analysis.analysis.insights[0];
      speak({
        text: `価格分析結果をお伝えします。${mainInsight}`,
        voice: voices.find(v => v.lang.includes(voiceConfig.language)),
        rate: voiceConfig.speed,
        pitch: voiceConfig.pitch
      });
    }
  }, [voiceConfig.enabled, analysis, speak, voices, voiceConfig.language, voiceConfig.speed, voiceConfig.pitch]);

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">表示期間:</span>
            <select
              value={config.timeRange}
              onChange={(e) => setConfig(prev => ({ ...prev, timeRange: e.target.value as any }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="7d">7日</option>
              <option value="30d">30日</option>
              <option value="90d">90日</option>
              <option value="1y">1年</option>
              <option value="all">全期間</option>
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.showPredictions}
                onChange={(e) => setConfig(prev => ({ ...prev, showPredictions: e.target.checked }))}
                className="w-4 h-4"
              />
              AI予測表示
            </label>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.showAnomalies}
                onChange={(e) => setConfig(prev => ({ ...prev, showAnomalies: e.target.checked }))}
                className="w-4 h-4"
              />
              異常値表示
            </label>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={voiceConfig.enabled}
                onChange={(e) => setVoiceConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4"
              />
              音声解説
            </label>
          </div>
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-4">
        <div className="h-96">
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        </div>
      </Card>

      {/* Analysis Summary */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">AI分析結果</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {analysis.analysis.trend === 'rising' ? '↗️' : 
               analysis.analysis.trend === 'falling' ? '↘️' : 
               analysis.analysis.trend === 'stable' ? '➡️' : '📈'}
            </div>
            <div className="text-sm text-gray-600">
              トレンド: {analysis.analysis.trend === 'rising' ? '上昇' :
                        analysis.analysis.trend === 'falling' ? '下降' :
                        analysis.analysis.trend === 'stable' ? '安定' : '変動'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {analysis.analysis.volatility.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">ボラティリティ</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {analysis.analysis.anomalies.length}
            </div>
            <div className="text-sm text-gray-600">異常値検出</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {(analysis.metadata.confidenceScore * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">信頼度</div>
          </div>
        </div>
        
        {/* Recommendations */}
        {analysis.analysis.recommendations.length > 0 && (
          <div className="mb-4">
            <h4 className="text-md font-semibold mb-2">推奨アクション</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.analysis.recommendations.map((rec, index) => (
                <Badge
                  key={index}
                  variant={rec.type === 'buy' ? 'success' : 
                          rec.type === 'sell' ? 'destructive' : 'outline'}
                >
                  {rec.type === 'buy' ? '買い' : 
                   rec.type === 'sell' ? '売り' : 
                   rec.type === 'hold' ? 'ホールド' : '観察'}: {rec.reason}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Natural Language Query Interface */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">AIに質問する</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={naturalQuery}
            onChange={(e) => setNaturalQuery(e.target.value)}
            placeholder="例: なぜ11月に価格が下がったのですか？"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            onKeyPress={(e) => e.key === 'Enter' && handleNaturalLanguageQuery()}
          />
          <Button
            onClick={handleNaturalLanguageQuery}
            disabled={isAnalyzing || !naturalQuery.trim()}
          >
            {isAnalyzing ? '分析中...' : '質問'}
          </Button>
        </div>
        
        <AnimatePresence>
          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-blue-50 border border-blue-200 rounded-md"
            >
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-semibold">AI:</span>
                <p className="text-gray-800">{aiResponse}</p>
              </div>
              {voiceConfig.enabled && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => speak({
                    text: aiResponse,
                    voice: voices.find(v => v.lang.includes(voiceConfig.language)),
                    rate: voiceConfig.speed,
                    pitch: voiceConfig.pitch
                  })}
                  disabled={speaking}
                >
                  🔊 再生
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}