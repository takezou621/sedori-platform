'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as tf from '@tensorflow/tfjs';
import { PriceDataPoint, KeepaPriceAnalysis, SeasonalityPattern } from '@/types/ai';
import { Card, Badge, Button } from '@/components/ui';
import { useSpeechSynthesis } from '@/lib/speech';

interface ChartPattern {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  significance: 'low' | 'medium' | 'high';
  priceImpact: 'bullish' | 'bearish' | 'neutral';
  expectedMovement?: {
    direction: 'up' | 'down' | 'sideways';
    magnitude: number; // percentage
    timeframe: string;
  };
}

interface PatternRecognitionProps {
  priceData: PriceDataPoint[];
  analysis: KeepaPriceAnalysis;
  onPatternSelect?: (pattern: ChartPattern) => void;
}

export function PatternRecognition({ 
  priceData, 
  analysis, 
  onPatternSelect 
}: PatternRecognitionProps) {
  const [patterns, setPatterns] = useState<ChartPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<ChartPattern | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const { speak, voices } = useSpeechSynthesis();

  // TensorFlow.js model for pattern recognition
  const [model, setModel] = useState<tf.LayersModel | null>(null);

  useEffect(() => {
    loadPatternModel();
  }, []);

  useEffect(() => {
    if (priceData.length > 0) {
      analyzePatterns();
    }
  }, [priceData, analysis]);

  const loadPatternModel = async () => {
    try {
      // In a real implementation, this would load a pre-trained model
      // For now, we'll create a simple model for demonstration
      const simpleModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [10], units: 20, activation: 'relu' }),
          tf.layers.dense({ units: 10, activation: 'relu' }),
          tf.layers.dense({ units: 5, activation: 'softmax' }) // 5 pattern types
        ]
      });
      
      setModel(simpleModel);
    } catch (error) {
      console.error('Failed to load pattern recognition model:', error);
    }
  };

  const analyzePatterns = async () => {
    if (!model || priceData.length < 20) return;

    setIsAnalyzing(true);

    try {
      const detectedPatterns: ChartPattern[] = [];

      // Rule-based pattern detection (simplified)
      const patterns = [
        await detectHeadAndShoulders(),
        await detectDoubleTop(),
        await detectDoubleBottom(),
        await detectTriangle(),
        await detectFlag(),
        await detectSupportResistance(),
        ...detectSeasonalPatterns()
      ].filter(Boolean) as ChartPattern[];

      detectedPatterns.push(...patterns);

      // Sort by confidence
      detectedPatterns.sort((a, b) => b.confidence - a.confidence);

      setPatterns(detectedPatterns);

      // Speak the most significant pattern
      if (voiceEnabled && detectedPatterns.length > 0) {
        const topPattern = detectedPatterns[0];
        speakPattern(topPattern);
      }

    } catch (error) {
      console.error('Pattern analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const detectHeadAndShoulders = async (): Promise<ChartPattern | null> => {
    if (priceData.length < 30) return null;

    const prices = priceData.map(p => p.price);
    const peaks = findPeaks(prices);
    
    if (peaks.length < 3) return null;

    // Look for head and shoulders pattern
    for (let i = 1; i < peaks.length - 1; i++) {
      const leftShoulder = peaks[i - 1];
      const head = peaks[i];
      const rightShoulder = peaks[i + 1];

      // Check if middle peak is higher (head)
      if (prices[head] > prices[leftShoulder] && 
          prices[head] > prices[rightShoulder] &&
          Math.abs(prices[leftShoulder] - prices[rightShoulder]) / prices[head] < 0.1) {
        
        return {
          id: `head-shoulders-${i}`,
          name: 'Head and Shoulders',
          nameJa: 'ヘッドアンドショルダー',
          description: '価格の反転を示唆する典型的なパターン',
          confidence: 0.75,
          startIndex: leftShoulder,
          endIndex: rightShoulder,
          significance: 'high',
          priceImpact: 'bearish',
          expectedMovement: {
            direction: 'down',
            magnitude: 10,
            timeframe: '2-4週間'
          }
        };
      }
    }

    return null;
  };

  const detectDoubleTop = async (): Promise<ChartPattern | null> => {
    const prices = priceData.map(p => p.price);
    const peaks = findPeaks(prices);
    
    if (peaks.length < 2) return null;

    for (let i = 1; i < peaks.length; i++) {
      const peak1 = peaks[i - 1];
      const peak2 = peaks[i];
      
      const priceRange = Math.abs(prices[peak1] - prices[peak2]) / prices[peak1];
      const timeGap = peak2 - peak1;
      
      if (priceRange < 0.05 && timeGap > 10 && timeGap < 50) {
        return {
          id: `double-top-${i}`,
          name: 'Double Top',
          nameJa: 'ダブルトップ',
          description: '価格の上昇トレンドの終了を示唆',
          confidence: 0.68,
          startIndex: peak1,
          endIndex: peak2,
          significance: 'medium',
          priceImpact: 'bearish',
          expectedMovement: {
            direction: 'down',
            magnitude: 8,
            timeframe: '1-3週間'
          }
        };
      }
    }

    return null;
  };

  const detectDoubleBottom = async (): Promise<ChartPattern | null> => {
    const prices = priceData.map(p => p.price);
    const valleys = findValleys(prices);
    
    if (valleys.length < 2) return null;

    for (let i = 1; i < valleys.length; i++) {
      const valley1 = valleys[i - 1];
      const valley2 = valleys[i];
      
      const priceRange = Math.abs(prices[valley1] - prices[valley2]) / prices[valley1];
      const timeGap = valley2 - valley1;
      
      if (priceRange < 0.05 && timeGap > 10 && timeGap < 50) {
        return {
          id: `double-bottom-${i}`,
          name: 'Double Bottom',
          nameJa: 'ダブルボトム',
          description: '価格の下降トレンドの終了を示唆',
          confidence: 0.65,
          startIndex: valley1,
          endIndex: valley2,
          significance: 'medium',
          priceImpact: 'bullish',
          expectedMovement: {
            direction: 'up',
            magnitude: 8,
            timeframe: '1-3週間'
          }
        };
      }
    }

    return null;
  };

  const detectTriangle = async (): Promise<ChartPattern | null> => {
    if (priceData.length < 30) return null;
    
    const prices = priceData.map(p => p.price);
    const recentPrices = prices.slice(-30);
    
    const highs = findPeaks(recentPrices);
    const lows = findValleys(recentPrices);
    
    if (highs.length < 2 || lows.length < 2) return null;
    
    // Check for converging trend lines
    const highTrend = calculateTrendLine(highs.map(h => ({ x: h, y: recentPrices[h] })));
    const lowTrend = calculateTrendLine(lows.map(l => ({ x: l, y: recentPrices[l] })));
    
    if (Math.abs(highTrend.slope) > 0.01 && Math.abs(lowTrend.slope) > 0.01) {
      const isConverging = (highTrend.slope < 0 && lowTrend.slope > 0) ||
                          (highTrend.slope > 0 && lowTrend.slope < 0);
      
      if (isConverging) {
        return {
          id: 'triangle-pattern',
          name: 'Triangle',
          nameJa: 'トライアングル',
          description: '価格の収束パターン、ブレイクアウトを待つ',
          confidence: 0.60,
          startIndex: Math.min(...highs, ...lows),
          endIndex: Math.max(...highs, ...lows),
          significance: 'medium',
          priceImpact: 'neutral',
          expectedMovement: {
            direction: 'sideways',
            magnitude: 5,
            timeframe: '1-2週間'
          }
        };
      }
    }
    
    return null;
  };

  const detectFlag = async (): Promise<ChartPattern | null> => {
    if (analysis.analysis.trend === 'stable' || analysis.analysis.volatility < 5) return null;
    
    const prices = priceData.map(p => p.price);
    const recentPrices = prices.slice(-20);
    
    if (recentPrices.length < 10) return null;
    
    const firstHalf = recentPrices.slice(0, 10);
    const secondHalf = recentPrices.slice(-10);
    
    const firstTrend = calculateSimpleTrend(firstHalf);
    const secondTrend = calculateSimpleTrend(secondHalf);
    
    // Flag pattern: strong move followed by consolidation
    if (Math.abs(firstTrend) > 0.05 && Math.abs(secondTrend) < 0.02) {
      return {
        id: 'flag-pattern',
        name: 'Flag',
        nameJa: 'フラッグ',
        description: '強いトレンドの継続を示唆',
        confidence: 0.55,
        startIndex: priceData.length - 20,
        endIndex: priceData.length - 1,
        significance: 'low',
        priceImpact: firstTrend > 0 ? 'bullish' : 'bearish',
        expectedMovement: {
          direction: firstTrend > 0 ? 'up' : 'down',
          magnitude: 6,
          timeframe: '1-2週間'
        }
      };
    }
    
    return null;
  };

  const detectSupportResistance = async (): Promise<ChartPattern | null> => {
    const prices = priceData.map(p => p.price);
    if (prices.length < 20) return null;
    
    // Find price levels that were tested multiple times
    const priceLevels = findSignificantLevels(prices);
    
    if (priceLevels.length > 0) {
      const level = priceLevels[0];
      const currentPrice = prices[prices.length - 1];
      const isSupport = currentPrice > level.price;
      
      return {
        id: `support-resistance-${level.price}`,
        name: isSupport ? 'Support Level' : 'Resistance Level',
        nameJa: isSupport ? 'サポートライン' : 'レジスタンスライン',
        description: `重要な価格水準: ¥${level.price.toLocaleString()}`,
        confidence: level.strength,
        startIndex: 0,
        endIndex: prices.length - 1,
        significance: level.strength > 0.7 ? 'high' : 'medium',
        priceImpact: 'neutral'
      };
    }
    
    return null;
  };

  const detectSeasonalPatterns = (): ChartPattern[] => {
    if (!analysis.analysis.seasonality.length) return [];
    
    return analysis.analysis.seasonality.map((pattern, index) => ({
      id: `seasonal-${index}`,
      name: 'Seasonal Pattern',
      nameJa: '季節性パターン',
      description: `${pattern.period}周期の季節性パターン（強度: ${(pattern.strength * 100).toFixed(0)}%）`,
      confidence: pattern.strength,
      startIndex: 0,
      endIndex: priceData.length - 1,
      significance: pattern.strength > 0.3 ? 'high' : 'medium',
      priceImpact: 'neutral',
      expectedMovement: {
        direction: 'sideways',
        magnitude: pattern.strength * 15,
        timeframe: pattern.period === 'yearly' ? '年間' : 
                  pattern.period === 'monthly' ? '月間' : '週間'
      }
    }));
  };

  const speakPattern = (pattern: ChartPattern) => {
    const message = `${pattern.nameJa}パターンが検出されました。信頼度は${(pattern.confidence * 100).toFixed(0)}パーセントです。${pattern.description}`;
    
    speak({
      text: message,
      voice: voices.find(v => v.lang.includes('ja')),
      rate: 1,
      pitch: 1
    });
  };

  const handlePatternClick = (pattern: ChartPattern) => {
    setSelectedPattern(pattern);
    onPatternSelect?.(pattern);
    
    if (voiceEnabled) {
      speakPattern(pattern);
    }
  };

  // Helper functions
  const findPeaks = (prices: number[]): number[] => {
    const peaks: number[] = [];
    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) {
        peaks.push(i);
      }
    }
    return peaks;
  };

  const findValleys = (prices: number[]): number[] => {
    const valleys: number[] = [];
    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] < prices[i - 1] && prices[i] < prices[i + 1]) {
        valleys.push(i);
      }
    }
    return valleys;
  };

  const calculateTrendLine = (points: { x: number; y: number }[]): { slope: number; intercept: number } => {
    if (points.length < 2) return { slope: 0, intercept: 0 };
    
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  const calculateSimpleTrend = (prices: number[]): number => {
    if (prices.length < 2) return 0;
    return (prices[prices.length - 1] - prices[0]) / prices[0];
  };

  const findSignificantLevels = (prices: number[]): { price: number; strength: number }[] => {
    const levels: { [key: number]: number } = {};
    const tolerance = 0.02; // 2% tolerance
    
    prices.forEach(price => {
      const roundedPrice = Math.round(price / (price * tolerance)) * (price * tolerance);
      levels[roundedPrice] = (levels[roundedPrice] || 0) + 1;
    });
    
    return Object.entries(levels)
      .filter(([, count]) => count >= 3)
      .map(([price, count]) => ({
        price: Number(price),
        strength: Math.min(count / prices.length * 10, 1)
      }))
      .sort((a, b) => b.strength - a.strength);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">パターン認識</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            音声解説
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={analyzePatterns}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '分析中...' : '再分析'}
          </Button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">AIがチャートパターンを分析中...</p>
          </div>
        </div>
      )}

      {!isAnalyzing && patterns.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">明確なパターンは検出されませんでした</p>
        </div>
      )}

      {patterns.length > 0 && (
        <div className="space-y-3">
          {patterns.map((pattern) => (
            <motion.div
              key={pattern.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                selectedPattern?.id === pattern.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handlePatternClick(pattern)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{pattern.nameJa}</h4>
                    <Badge
                      variant={pattern.significance === 'high' ? 'destructive' :
                              pattern.significance === 'medium' ? 'default' : 'outline'}
                    >
                      {pattern.significance === 'high' ? '重要' :
                       pattern.significance === 'medium' ? '中程度' : '軽微'}
                    </Badge>
                    <Badge
                      variant={pattern.priceImpact === 'bullish' ? 'success' :
                              pattern.priceImpact === 'bearish' ? 'destructive' : 'outline'}
                    >
                      {pattern.priceImpact === 'bullish' ? '上昇示唆' :
                       pattern.priceImpact === 'bearish' ? '下降示唆' : '中立'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                  {pattern.expectedMovement && (
                    <div className="text-xs text-gray-500">
                      予想: {pattern.expectedMovement.direction === 'up' ? '上昇' :
                            pattern.expectedMovement.direction === 'down' ? '下降' : '横ばい'} 
                      {pattern.expectedMovement.magnitude.toFixed(0)}% 
                      ({pattern.expectedMovement.timeframe})
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    信頼度: {(pattern.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                    <div
                      className="h-2 bg-blue-600 rounded-full transition-all"
                      style={{ width: `${pattern.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}