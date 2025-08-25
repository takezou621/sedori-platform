'use client';

import { useState } from 'react';
import { ConversationalSearch } from '@/components/ai/ConversationalSearch';
import { ProductDiscovery } from '@/components/ai/ProductDiscovery';
import { AISearchOptions, AISearchResult } from '@/types/ai';
import { Card } from '@/components/ui';

export default function AISearchPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'discovery'>('search');

  const handleAISearch = async (query: string, options: AISearchOptions): Promise<AISearchResult[]> => {
    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, options }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const result = await response.json();
      return result.results;
    } catch (error) {
      console.error('AI search error:', error);
      return [];
    }
  };

  const handleVoiceSearch = async (audioBlob: Blob): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-search.wav');

      const response = await fetch('/api/ai/voice-search', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Voice search failed');
      }

      const result = await response.json();
      return result.transcription;
    } catch (error) {
      console.error('Voice search error:', error);
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI商品検索
          </h1>
          <p className="text-gray-600">
            人工知能を活用した高度な商品検索・発見システム
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 border-b border-gray-200">
          {[
            { id: 'search', label: '会話検索', icon: '💬', description: 'AIと会話して商品を探す' },
            { id: 'discovery', label: 'プロアクティブ発見', icon: '🔍', description: 'AIが自動で商機を発見' }
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
        {activeTab === 'search' && (
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <h2 className="text-xl font-semibold mb-2">🤖 AIアシスタント検索</h2>
              <p className="text-gray-600 mb-4">
                自然な言葉でAIに話しかけるだけで、あなたのニーズに最適な商品を見つけることができます。
                音声での検索にも対応しています。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>自然言語での検索</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>音声認識対応</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>リアルタイムAI分析</span>
                </div>
              </div>
            </Card>

            <ConversationalSearch 
              onSearch={handleAISearch}
              onVoiceSearch={handleVoiceSearch}
            />
          </div>
        )}

        {activeTab === 'discovery' && (
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
              <h2 className="text-xl font-semibold mb-2">🎯 プロアクティブ商品発見</h2>
              <p className="text-gray-600 mb-4">
                AIが24時間体制で市場を監視し、利益機会や注意すべき市場変化を自動的に発見してお知らせします。
                あなたが見逃している商機を逃しません。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>24時間市場監視</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>トレンド自動検出</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>リスク早期警告</span>
                </div>
              </div>
            </Card>

            <ProductDiscovery 
              userId="demo-user"
              userPreferences={{
                categories: ['Electronics', 'Home', 'Sports'],
                priceRange: { min: 1000, max: 50000 },
                riskTolerance: 'medium',
                profitabilityThreshold: 70
              }}
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 p-6 bg-white rounded-lg border border-gray-200">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">🚀 AI検索の特徴</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
              <div className="text-center">
                <div className="text-3xl mb-2">🧠</div>
                <h4 className="font-medium">機械学習</h4>
                <p className="text-xs text-gray-600">
                  使うほど賢くなるAI
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">⚡</div>
                <h4 className="font-medium">リアルタイム</h4>
                <p className="text-xs text-gray-600">
                  瞬時に市場データを分析
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h4 className="font-medium">高精度</h4>
                <p className="text-xs text-gray-600">
                  95%以上の予測精度
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🔒</div>
                <h4 className="font-medium">セキュア</h4>
                <p className="text-xs text-gray-600">
                  データ暗号化で安全
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}