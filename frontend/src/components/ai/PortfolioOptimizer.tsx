'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pie, Scatter, Line } from 'react-chartjs-2';
import { AISearchResult } from '@/types/ai';
import { Card, Badge, Button, Input } from '@/components/ui';

interface PortfolioItem {
  product: AISearchResult;
  allocation: number; // percentage
  quantity: number;
  investmentAmount: number;
  expectedReturn: number;
  risk: number;
  diversificationScore: number;
}

interface PortfolioOptimizationResult {
  originalPortfolio: PortfolioItem[];
  optimizedPortfolio: PortfolioItem[];
  improvements: {
    expectedReturnIncrease: number;
    riskReduction: number;
    diversificationImprovement: number;
    sharpeRatioImprovement: number;
  };
  recommendations: string[];
}

interface PortfolioOptimizerProps {
  currentProducts?: AISearchResult[];
  budget?: number;
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon?: 'short' | 'medium' | 'long';
}

export function PortfolioOptimizer({
  currentProducts = [],
  budget: initialBudget = 100000,
  riskTolerance = 'moderate',
  timeHorizon = 'medium'
}: PortfolioOptimizerProps) {
  const [optimization, setOptimization] = useState<PortfolioOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [targetReturn, setTargetReturn] = useState(15);
  const [maxRisk, setMaxRisk] = useState(25);
  const [budget, setBudget] = useState(initialBudget);
  const [showOptimized, setShowOptimized] = useState(true);

  useEffect(() => {
    if (currentProducts.length > 0) {
      optimizePortfolio();
    }
  }, [currentProducts, targetReturn, maxRisk, riskTolerance]);

  const optimizePortfolio = async () => {
    setIsOptimizing(true);
    
    try {
      // Simulate AI optimization process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await performPortfolioOptimization();
      setOptimization(result);
      
    } catch (error) {
      console.error('Portfolio optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const performPortfolioOptimization = async (): Promise<PortfolioOptimizationResult> => {
    // Generate mock current portfolio
    const originalPortfolio: PortfolioItem[] = currentProducts.slice(0, 5).map((product, index) => {
      const allocation = Math.random() * 30 + 10; // 10-40%
      const quantity = Math.floor(budget * (allocation / 100) / product.currentPrice);
      
      return {
        product,
        allocation,
        quantity,
        investmentAmount: quantity * product.currentPrice,
        expectedReturn: product.aiInsights.profitabilityScore / 5, // Convert to expected return
        risk: product.aiInsights.riskScore,
        diversificationScore: Math.random() * 30 + 70
      };
    });

    // Apply AI optimization algorithm (simplified)
    const optimizedPortfolio: PortfolioItem[] = originalPortfolio.map(item => {
      // AI optimization logic
      const riskTolerantMultiplier = riskTolerance === 'aggressive' ? 1.3 : 
                                   riskTolerance === 'conservative' ? 0.7 : 1.0;
      
      // Optimize allocation based on risk-return profile
      let newAllocation = item.allocation;
      
      // Increase allocation for high-return, low-risk products
      if (item.expectedReturn > 15 && item.risk < 30) {
        newAllocation *= 1.2;
      }
      
      // Decrease allocation for high-risk products if conservative
      if (item.risk > 40 && riskTolerance === 'conservative') {
        newAllocation *= 0.8;
      }
      
      // Apply risk tolerance multiplier
      newAllocation *= riskTolerantMultiplier;
      
      // Normalize to ensure total doesn't exceed 100%
      newAllocation = Math.min(newAllocation, 35);
      
      const newQuantity = Math.floor(budget * (newAllocation / 100) / item.product.currentPrice);
      
      return {
        ...item,
        allocation: newAllocation,
        quantity: newQuantity,
        investmentAmount: newQuantity * item.product.currentPrice,
        diversificationScore: item.diversificationScore + Math.random() * 10
      };
    });

    // Normalize allocations to sum to 100%
    const totalAllocation = optimizedPortfolio.reduce((sum, item) => sum + item.allocation, 0);
    optimizedPortfolio.forEach(item => {
      item.allocation = (item.allocation / totalAllocation) * 100;
    });

    // Calculate improvements
    const originalReturn = originalPortfolio.reduce((sum, item) => 
      sum + (item.expectedReturn * item.allocation / 100), 0);
    const optimizedReturn = optimizedPortfolio.reduce((sum, item) => 
      sum + (item.expectedReturn * item.allocation / 100), 0);
    
    const originalRisk = Math.sqrt(originalPortfolio.reduce((sum, item) => 
      sum + Math.pow(item.risk * item.allocation / 100, 2), 0));
    const optimizedRisk = Math.sqrt(optimizedPortfolio.reduce((sum, item) => 
      sum + Math.pow(item.risk * item.allocation / 100, 2), 0));

    const originalDiversification = originalPortfolio.reduce((sum, item) => 
      sum + (item.diversificationScore * item.allocation / 100), 0);
    const optimizedDiversification = optimizedPortfolio.reduce((sum, item) => 
      sum + (item.diversificationScore * item.allocation / 100), 0);

    const originalSharpe = originalReturn / originalRisk;
    const optimizedSharpe = optimizedReturn / optimizedRisk;

    return {
      originalPortfolio,
      optimizedPortfolio,
      improvements: {
        expectedReturnIncrease: ((optimizedReturn - originalReturn) / originalReturn) * 100,
        riskReduction: ((originalRisk - optimizedRisk) / originalRisk) * 100,
        diversificationImprovement: ((optimizedDiversification - originalDiversification) / originalDiversification) * 100,
        sharpeRatioImprovement: ((optimizedSharpe - originalSharpe) / originalSharpe) * 100
      },
      recommendations: [
        '高収益・低リスク商品の比重を増加',
        '相関の低い商品を組み合わせてリスク分散',
        '季節性の異なる商品でバランス調整',
        '定期的なリバランシングを推奨'
      ]
    };
  };

  const getCurrentPortfolio = () => {
    return showOptimized ? optimization?.optimizedPortfolio : optimization?.originalPortfolio;
  };

  const getPortfolioChartData = () => {
    const portfolio = getCurrentPortfolio();
    if (!portfolio) return null;

    return {
      labels: portfolio.map(item => item.product.title.slice(0, 20) + '...'),
      datasets: [{
        data: portfolio.map(item => item.allocation),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(147, 51, 234, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)',
          'rgb(147, 51, 234)',
        ],
        borderWidth: 2,
      }]
    };
  };

  const getRiskReturnScatterData = () => {
    const portfolio = getCurrentPortfolio();
    if (!portfolio) return null;

    return {
      datasets: [{
        label: 'リスク・リターン分析',
        data: portfolio.map(item => ({
          x: item.risk,
          y: item.expectedReturn,
          label: item.product.title
        })),
        backgroundColor: portfolio.map((_, index) => [
          'rgba(59, 130, 246, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(251, 191, 36, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(147, 51, 234, 0.6)',
        ][index]),
        borderColor: portfolio.map((_, index) => [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)',
          'rgb(147, 51, 234)',
        ][index]),
        pointRadius: 8,
      }]
    };
  };

  if (!optimization) {
    if (currentProducts.length === 0) {
      return (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">ポートフォリオ最適化</h3>
          <p className="text-gray-600 mb-4">
            商品を追加してポートフォリオの最適化を開始してください
          </p>
          <Button onClick={optimizePortfolio} disabled>
            商品を追加
          </Button>
        </Card>
      );
    }

    return (
      <Card className="p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium">ポートフォリオを最適化中...</p>
        <p className="text-sm text-gray-500 mt-2">AIが最適な配分を計算しています</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">📊 ポートフォリオ最適化</h2>
            <p className="text-gray-600">AIが最適なリスク・リターン配分を提案します</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm">表示:</label>
              <select
                value={showOptimized ? 'optimized' : 'original'}
                onChange={(e) => setShowOptimized(e.target.value === 'optimized')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="original">現在のポートフォリオ</option>
                <option value="optimized">最適化後</option>
              </select>
            </div>
            <Button onClick={optimizePortfolio} disabled={isOptimizing} size="sm">
              {isOptimizing ? '最適化中...' : '再最適化'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Optimization Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">最適化パラメータ</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">目標リターン (%)</label>
            <Input
              type="number"
              value={targetReturn}
              onChange={(e) => setTargetReturn(Number(e.target.value))}
              min="5"
              max="50"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">最大リスク (%)</label>
            <Input
              type="number"
              value={maxRisk}
              onChange={(e) => setMaxRisk(Number(e.target.value))}
              min="5"
              max="50"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">投資予算</label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              min="10000"
              max="10000000"
              step="10000"
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Improvement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">期待リターン改善</p>
              <p className="text-2xl font-bold text-green-600">
                +{optimization.improvements.expectedReturnIncrease.toFixed(1)}%
              </p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">リスク軽減</p>
              <p className="text-2xl font-bold text-blue-600">
                -{optimization.improvements.riskReduction.toFixed(1)}%
              </p>
            </div>
            <div className="text-3xl">🛡️</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">分散改善</p>
              <p className="text-2xl font-bold text-purple-600">
                +{optimization.improvements.diversificationImprovement.toFixed(1)}%
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">シャープレシオ</p>
              <p className="text-2xl font-bold text-orange-600">
                +{optimization.improvements.sharpeRatioImprovement.toFixed(1)}%
              </p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Allocation Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {showOptimized ? '最適化後の配分' : '現在の配分'}
          </h3>
          <div className="h-80 flex items-center justify-center">
            {getPortfolioChartData() && (
              <div className="w-64 h-64">
                <Pie data={getPortfolioChartData()!} />
              </div>
            )}
          </div>
        </Card>

        {/* Risk-Return Scatter Plot */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">リスク・リターン分析</h3>
          <div className="h-80">
            {getRiskReturnScatterData() && (
              <Scatter 
                data={getRiskReturnScatterData()!}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      display: true,
                      title: {
                        display: true,
                        text: 'リスク (%)'
                      }
                    },
                    y: {
                      display: true,
                      title: {
                        display: true,
                        text: '期待リターン (%)'
                      }
                    }
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: function(context: any) {
                          return `${context.raw.label}: リスク ${context.parsed.x}%, リターン ${context.parsed.y}%`;
                        }
                      }
                    }
                  }
                }}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Portfolio Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {showOptimized ? '最適化後のポートフォリオ詳細' : '現在のポートフォリオ詳細'}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">商品</th>
                <th className="text-right py-2">配分</th>
                <th className="text-right py-2">数量</th>
                <th className="text-right py-2">投資額</th>
                <th className="text-right py-2">期待リターン</th>
                <th className="text-right py-2">リスク</th>
                <th className="text-right py-2">分散スコア</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentPortfolio()?.map((item, index) => (
                <motion.tr
                  key={item.product.asin}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {item.product.imageUrl && (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.title}
                          className="w-10 h-10 object-cover rounded-md"
                        />
                      )}
                      <div>
                        <div className="font-medium truncate max-w-xs">
                          {item.product.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.product.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 font-medium">
                    {item.allocation.toFixed(1)}%
                  </td>
                  <td className="text-right py-3">
                    {item.quantity}個
                  </td>
                  <td className="text-right py-3">
                    ¥{item.investmentAmount.toLocaleString()}
                  </td>
                  <td className="text-right py-3 text-green-600">
                    {item.expectedReturn.toFixed(1)}%
                  </td>
                  <td className="text-right py-3">
                    <Badge 
                      variant={item.risk < 25 ? 'success' : item.risk < 40 ? 'default' : 'destructive'}
                    >
                      {item.risk.toFixed(0)}%
                    </Badge>
                  </td>
                  <td className="text-right py-3">
                    {item.diversificationScore.toFixed(0)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* AI Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">💡 AI推奨事項</h3>
        <div className="space-y-3">
          {optimization.recommendations.map((recommendation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
            >
              <div className="text-blue-600 mt-0.5">💡</div>
              <p className="text-gray-800">{recommendation}</p>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}