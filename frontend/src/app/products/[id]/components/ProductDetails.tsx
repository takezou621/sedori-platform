'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { Button, Badge, Card } from '@/components/ui';
import Image from 'next/image';
import { PriceChart } from '@/components/ai/PriceChart';
import { PatternRecognition } from '@/components/ai/PatternRecognition';
import { PriceDataPoint, KeepaPriceAnalysis, NaturalLanguageQuery } from '@/types/ai';

interface ProductDetailsProps {
  product: Product;
  onAddToCart: (productId: string, quantity: number) => void;
}

export function ProductDetails({ product, onAddToCart }: ProductDetailsProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [priceData, setPriceData] = useState<PriceDataPoint[]>([]);
  const [analysis, setAnalysis] = useState<KeepaPriceAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'patterns'>('overview');

  const profit = product.price - product.cost;
  const margin = profit > 0 ? ((profit / product.price) * 100).toFixed(0) : 0;
  const roi = product.cost > 0 ? ((profit / product.cost) * 100).toFixed(0) : 0;

  // Load AI price data when component mounts
  useEffect(() => {
    loadPriceAnalysis();
  }, [product.id]);

  const loadPriceAnalysis = async () => {
    try {
      // Generate mock data for demonstration
      const mockPriceData = generateMockPriceData(product);
      const mockAnalysis = generateMockAnalysis(product, mockPriceData);
      
      setPriceData(mockPriceData);
      setAnalysis(mockAnalysis);
    } catch (error) {
      console.error('Failed to load price analysis:', error);
    }
  };

  const handleNaturalLanguageQuery = async (query: NaturalLanguageQuery): Promise<string> => {
    try {
      const response = await fetch('/api/ai/nlp-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...query,
          asin: product.id,
          priceData,
          analysisData: analysis?.analysis
        }),
      });

      if (!response.ok) {
        throw new Error('NLP query failed');
      }

      const result = await response.json();
      return result.response;
    } catch (error) {
      console.error('Natural language query error:', error);
      return 'すみません、現在分析サービスが利用できません。しばらく後でお試しください。';
    }
  };

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      await onAddToCart(product.id, quantity);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  // Mock data generators for demonstration
  const generateMockPriceData = (product: Product): PriceDataPoint[] => {
    const data: PriceDataPoint[] = [];
    const basePrice = product.price;
    const days = 90;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic price fluctuations
      const randomFactor = 1 + (Math.random() - 0.5) * 0.2; // ±10% variation
      const trendFactor = 1 + (i / days - 0.5) * 0.1; // slight trend
      const price = Math.round(basePrice * randomFactor * trendFactor);
      
      data.push({
        timestamp: date.toISOString(),
        price: price,
        source: 'amazon'
      });
    }
    
    return data;
  };

  const generateMockAnalysis = (product: Product, priceData: PriceDataPoint[]): KeepaPriceAnalysis => {
    const prices = priceData.map(p => p.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const currentPrice = prices[prices.length - 1];
    
    // Calculate basic statistics
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const volatility = (Math.sqrt(variance) / avgPrice) * 100;
    
    // Determine trend
    const recentPrices = prices.slice(-10);
    const trendSlope = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
    const trend: 'rising' | 'falling' | 'stable' | 'volatile' = 
      volatility > 15 ? 'volatile' :
      trendSlope > 0.05 ? 'rising' :
      trendSlope < -0.05 ? 'falling' : 'stable';

    return {
      asin: product.id,
      analysis: {
        trend,
        trendStrength: Math.abs(trendSlope),
        volatility,
        seasonality: [],
        anomalies: [],
        predictions: [
          {
            timestamp: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            predictedPrice: currentPrice * (1 + trendSlope * 0.5),
            confidenceInterval: {
              lower: currentPrice * 0.9,
              upper: currentPrice * 1.1
            },
            probability: 0.75
          }
        ],
        insights: [
          `現在の価格は¥${currentPrice.toLocaleString()}で、平均価格の${((currentPrice / avgPrice - 1) * 100).toFixed(1)}%${currentPrice > avgPrice ? '上' : '下'}です。`,
          `ボラティリティは${volatility.toFixed(1)}%で${volatility > 15 ? '高く' : volatility > 10 ? '中程度' : '低く'}、${volatility > 15 ? 'リスクが高い' : '比較的安定した'}商品です。`,
          `トレンドは${trend === 'rising' ? '上昇' : trend === 'falling' ? '下降' : trend === 'stable' ? '安定' : '変動'}傾向にあります。`
        ],
        recommendations: currentPrice < avgPrice * 0.9 ? [{
          type: 'buy',
          reason: '現在価格が平均価格より10%以上低い',
          riskLevel: 'low',
          timeframe: '1週間以内',
          confidence: 0.8
        }] : currentPrice > avgPrice * 1.1 ? [{
          type: 'sell',
          reason: '現在価格が平均価格より10%以上高い',
          riskLevel: 'medium',
          timeframe: '2週間以内',
          confidence: 0.7
        }] : [{
          type: 'hold',
          reason: '価格が平均的な水準にある',
          riskLevel: 'low',
          timeframe: '様子見',
          confidence: 0.6
        }]
      },
      metadata: {
        analyzedAt: new Date(),
        dataPoints: priceData.length,
        confidenceScore: Math.min(priceData.length / 100, 0.9),
        modelVersion: '1.0'
      }
    };
  };

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-gray-200">
        {[
          { id: 'overview', label: '概要', icon: '📊' },
          { id: 'charts', label: 'AI価格分析', icon: '📈' },
          { id: 'patterns', label: 'パターン認識', icon: '🔍' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="aspect-square overflow-hidden rounded-lg border">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.title}
                width={400}
                height={400}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gray-100">
                <span className="text-gray-400">No Image Available</span>
              </div>
            )}
          </div>

      {/* Product Info */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
          <div className="mt-2 flex items-center space-x-2">
            <Badge variant="outline">{product.category}</Badge>
            {product.stock > 0 ? (
              <Badge variant="success">In Stock ({product.stock})</Badge>
            ) : (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </div>
        </div>

        <div className="prose max-w-none">
          <p className="text-gray-700">{product.description}</p>
        </div>

        {/* Pricing */}
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-3xl font-bold text-gray-900">${product.price.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Selling Price</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-700">${product.cost.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Cost Price</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
            <div>
              <div className="text-lg font-semibold text-green-600">{margin}%</div>
              <div className="text-sm text-gray-600">Profit Margin</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">{roi}%</div>
              <div className="text-sm text-gray-600">ROI</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="text-lg font-semibold text-green-600">
              ${profit.toFixed(2)} profit per unit
            </div>
          </div>
        </Card>

        {/* Add to Cart */}
        {product.stock > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Quantity:</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(quantity + 1)}
                  disabled={quantity >= product.stock}
                >
                  +
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleAddToCart}
              disabled={loading}
            >
              {loading ? 'Adding to Cart...' : `Add ${quantity} to Cart - $${(product.price * quantity).toFixed(2)}`}
            </Button>
          </div>
        )}

          {/* Product Meta */}
          <div className="text-sm text-gray-500 space-y-1">
            <div>Created: {new Date(product.createdAt).toLocaleDateString()}</div>
            <div>Updated: {new Date(product.updatedAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      )}

      {/* AI Price Charts Tab */}
      {activeTab === 'charts' && priceData.length > 0 && analysis && (
        <PriceChart
          asin={product.id}
          priceData={priceData}
          analysis={analysis}
          onNaturalLanguageQuery={handleNaturalLanguageQuery}
        />
      )}

      {/* Pattern Recognition Tab */}
      {activeTab === 'patterns' && priceData.length > 0 && analysis && (
        <PatternRecognition
          priceData={priceData}
          analysis={analysis}
          onPatternSelect={(pattern) => {
            console.log('Selected pattern:', pattern);
          }}
        />
      )}

      {/* Loading state for AI data */}
      {(activeTab === 'charts' || activeTab === 'patterns') && (!priceData.length || !analysis) && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">AIが価格データを分析中...</p>
            <p className="text-sm text-gray-500 mt-2">しばらくお待ちください</p>
          </div>
        </div>
      )}
    </div>
  );
}