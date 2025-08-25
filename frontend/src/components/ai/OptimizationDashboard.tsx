'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { AIOptimizationMetrics } from '@/types/ai';
import { Card, Badge, Button } from '@/components/ui';

interface OptimizationData {
  sync: {
    metrics: {
      totalRequests: number;
      cacheHitRate: number;
      averageResponseTime: number;
      apiQuotaUtilization: number;
      predictiveAccuracy: number;
      syncEfficiency: number;
    };
    queue: Array<{
      productId: string;
      priority: number;
      importance: 'critical' | 'high' | 'medium' | 'low';
      lastSynced: string;
      predictedNextUpdate: string;
    }>;
  };
  resources: {
    metrics: {
      cpu: { usage: number; cores: number; load: number[] };
      memory: { total: number; used: number; usage: number };
      cache: { hitRate: number; size: number; evictions: number };
      network: { requestsPerSecond: number; responseTime: number };
    };
    recommendations: Array<{
      id: string;
      name: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      category: string;
      automatable: boolean;
    }>;
    status: {
      appliedCount: number;
      appliedOptimizations: string[];
      lastRun: string;
    };
  };
  summary: {
    totalOptimizations: number;
    syncQueueSize: number;
    criticalItems: number;
    systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  };
}

export function OptimizationDashboard() {
  const [data, setData] = useState<OptimizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sync' | 'resources'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadOptimizationData();
    
    if (autoRefresh) {
      const interval = setInterval(loadOptimizationData, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadOptimizationData = async () => {
    try {
      const response = await fetch('/api/ai/optimization/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        console.error('Failed to load optimization data');
        // Use mock data for demo
        setData(generateMockData());
      }
    } catch (error) {
      console.error('Error loading optimization data:', error);
      setData(generateMockData());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockData = (): OptimizationData => ({
    sync: {
      metrics: {
        totalRequests: 15847,
        cacheHitRate: 87.3,
        averageResponseTime: 245,
        apiQuotaUtilization: 34.2,
        predictiveAccuracy: 91.5,
        syncEfficiency: 76.8
      },
      queue: [
        {
          productId: 'B08N5WRWNW',
          priority: 95,
          importance: 'critical',
          lastSynced: new Date(Date.now() - 300000).toISOString(),
          predictedNextUpdate: new Date(Date.now() + 600000).toISOString()
        },
        {
          productId: 'B07XJ8C8F7',
          priority: 78,
          importance: 'high',
          lastSynced: new Date(Date.now() - 900000).toISOString(),
          predictedNextUpdate: new Date(Date.now() + 1800000).toISOString()
        }
      ]
    },
    resources: {
      metrics: {
        cpu: { usage: 45.2, cores: 8, load: [1.2, 1.8, 2.1] },
        memory: { total: 16000000000, used: 8500000000, usage: 53.1 },
        cache: { hitRate: 87.3, size: 512000000, evictions: 23 },
        network: { requestsPerSecond: 125.4, responseTime: 245 }
      },
      recommendations: [
        {
          id: 'cache_optimization',
          name: 'キャッシュ効率向上',
          description: 'キャッシュヒット率が改善可能です',
          impact: 'high',
          category: 'cache',
          automatable: true
        },
        {
          id: 'memory_cleanup',
          name: 'メモリ使用量最適化',
          description: '不要なキャッシュエントリを削除します',
          impact: 'medium',
          category: 'memory',
          automatable: true
        }
      ],
      status: {
        appliedCount: 5,
        appliedOptimizations: ['cache_optimization', 'memory_cleanup'],
        lastRun: new Date().toISOString()
      }
    },
    summary: {
      totalOptimizations: 5,
      syncQueueSize: 23,
      criticalItems: 3,
      systemHealth: 'good'
    }
  });

  const performOptimization = async () => {
    setIsOptimizing(true);
    try {
      const response = await fetch('/api/ai/optimization/resources/optimize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadOptimizationData();
      }
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return '🟢';
      case 'good': return '🔵';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">最適化データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">最適化データの読み込みに失敗しました</p>
        <Button onClick={loadOptimizationData} className="mt-4">
          再試行
        </Button>
      </div>
    );
  }

  // Chart data
  const resourceUsageData = {
    labels: ['CPU', 'メモリ', 'キャッシュ', 'ネットワーク'],
    datasets: [{
      data: [
        data.resources.metrics.cpu.usage,
        data.resources.metrics.memory.usage,
        100 - data.resources.metrics.cache.hitRate,
        Math.min(data.resources.metrics.network.responseTime / 10, 100)
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(34, 197, 94)',
        'rgb(251, 191, 36)',
        'rgb(239, 68, 68)',
      ],
      borderWidth: 2,
    }]
  };

  const syncEfficiencyData = {
    labels: ['ヒット率', '予測精度', '効率性', 'API使用率'],
    datasets: [{
      label: '同期最適化メトリクス',
      data: [
        data.sync.metrics.cacheHitRate,
        data.sync.metrics.predictiveAccuracy,
        data.sync.metrics.syncEfficiency,
        data.sync.metrics.apiQuotaUtilization
      ],
      backgroundColor: 'rgba(34, 197, 94, 0.6)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 2,
      fill: false,
    }]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⚡ AI最適化ダッシュボード</h1>
            <p className="text-gray-600 mt-1">システムパフォーマンスと同期最適化の監視</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <div className="flex items-center gap-2">
                <span>システム状態:</span>
                <span className={`font-bold ${getHealthColor(data.summary.systemHealth)}`}>
                  {getHealthIcon(data.summary.systemHealth)}
                  {data.summary.systemHealth === 'excellent' ? '優秀' :
                   data.summary.systemHealth === 'good' ? '良好' :
                   data.summary.systemHealth === 'warning' ? '警告' : '危険'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                onClick={performOptimization}
                disabled={isOptimizing}
                size="sm"
              >
                {isOptimizing ? '最適化中...' : '最適化実行'}
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
              <p className="text-sm font-medium text-gray-600">適用最適化</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.summary.totalOptimizations}
              </p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
          <div className="mt-2">
            <Badge variant="success">アクティブ</Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">同期キュー</p>
              <p className="text-2xl font-bold text-green-600">
                {data.summary.syncQueueSize}
              </p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
          <div className="mt-2">
            <Badge variant={data.summary.criticalItems > 5 ? 'destructive' : 'outline'}>
              緊急: {data.summary.criticalItems}件
            </Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">キャッシュヒット率</p>
              <p className="text-2xl font-bold text-purple-600">
                {data.sync.metrics.cacheHitRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
          <div className="mt-2">
            <Badge variant={data.sync.metrics.cacheHitRate > 85 ? 'success' : 'default'}>
              {data.sync.metrics.cacheHitRate > 85 ? '最適' : '改善可能'}
            </Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均応答時間</p>
              <p className="text-2xl font-bold text-orange-600">
                {data.sync.metrics.averageResponseTime}ms
              </p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
          <div className="mt-2">
            <Badge variant={data.sync.metrics.averageResponseTime < 500 ? 'success' : 'default'}>
              {data.sync.metrics.averageResponseTime < 500 ? '高速' : '標準'}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-gray-200">
        {[
          { id: 'overview', label: '概要', icon: '📊' },
          { id: 'sync', label: '同期最適化', icon: '🔄' },
          { id: 'resources', label: 'リソース最適化', icon: '⚙️' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">リソース使用状況</h3>
              <div className="h-80 flex items-center justify-center">
                <div className="w-64 h-64">
                  <Doughnut data={resourceUsageData} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">同期効率メトリクス</h3>
              <div className="h-80">
                <Bar
                  data={syncEfficiencyData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: function(value) {
                            return value + '%';
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'sync' && (
          <motion.div
            key="sync"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-4">
                <h4 className="font-semibold mb-2">総リクエスト数</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {data.sync.metrics.totalRequests.toLocaleString()}
                </p>
              </Card>
              <Card className="p-4">
                <h4 className="font-semibold mb-2">予測精度</h4>
                <p className="text-2xl font-bold text-green-600">
                  {data.sync.metrics.predictiveAccuracy.toFixed(1)}%
                </p>
              </Card>
              <Card className="p-4">
                <h4 className="font-semibold mb-2">API使用率</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {data.sync.metrics.apiQuotaUtilization.toFixed(1)}%
                </p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">同期キュー（上位項目）</h3>
              <div className="space-y-3">
                {data.sync.queue.map((item, index) => (
                  <div key={item.productId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium">{item.productId}</div>
                      <div className="text-sm text-gray-500">
                        最終同期: {new Date(item.lastSynced).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          item.importance === 'critical' ? 'destructive' :
                          item.importance === 'high' ? 'default' : 'outline'
                        }
                      >
                        {item.importance === 'critical' ? '緊急' :
                         item.importance === 'high' ? '高' : 
                         item.importance === 'medium' ? '中' : '低'}
                      </Badge>
                      <div className="text-sm text-gray-500 mt-1">
                        優先度: {item.priority}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'resources' && (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-4">
                <h4 className="font-semibold mb-2">CPU使用率</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {data.resources.metrics.cpu.usage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {data.resources.metrics.cpu.cores}コア
                </p>
              </Card>
              <Card className="p-4">
                <h4 className="font-semibold mb-2">メモリ使用量</h4>
                <p className="text-2xl font-bold text-green-600">
                  {data.resources.metrics.memory.usage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {(data.resources.metrics.memory.used / 1024 / 1024 / 1024).toFixed(1)}GB / {(data.resources.metrics.memory.total / 1024 / 1024 / 1024).toFixed(1)}GB
                </p>
              </Card>
              <Card className="p-4">
                <h4 className="font-semibold mb-2">キャッシュサイズ</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {(data.resources.metrics.cache.size / 1024 / 1024).toFixed(0)}MB
                </p>
                <p className="text-xs text-gray-500">
                  エビクション: {data.resources.metrics.cache.evictions}
                </p>
              </Card>
              <Card className="p-4">
                <h4 className="font-semibold mb-2">RPS</h4>
                <p className="text-2xl font-bold text-orange-600">
                  {data.resources.metrics.network.requestsPerSecond.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">
                  応答時間: {data.resources.metrics.network.responseTime}ms
                </p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">最適化推奨事項</h3>
              <div className="space-y-4">
                {data.resources.recommendations.map((rec, index) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{rec.name}</h4>
                        <Badge
                          variant={rec.impact === 'high' ? 'destructive' : 
                                  rec.impact === 'medium' ? 'default' : 'outline'}
                        >
                          {rec.impact === 'high' ? '高影響' : 
                           rec.impact === 'medium' ? '中影響' : '低影響'}
                        </Badge>
                        <Badge variant="outline">{rec.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                    <div className="text-right">
                      {rec.automatable && (
                        <Badge variant="success">自動適用可能</Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">適用済み最適化</h3>
              <div className="flex flex-wrap gap-2">
                {data.resources.status.appliedOptimizations.map((opt) => (
                  <Badge key={opt} variant="success">
                    ✓ {opt}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                最終実行: {new Date(data.resources.status.lastRun).toLocaleString('ja-JP')}
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}