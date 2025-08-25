'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechSynthesis } from '@/lib/speech';
import { AISearchOptions, AISearchResult } from '@/types/ai';
import { Button, Card, Badge, Input } from '@/components/ui';
import { ProductCard } from '@/components/products/ProductCard';

interface ConversationalSearchProps {
  onSearch: (query: string, options: AISearchOptions) => Promise<AISearchResult[]>;
  onVoiceSearch?: (audioBlob: Blob) => Promise<string>;
}

interface SearchMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  searchResults?: AISearchResult[];
  voiceEnabled?: boolean;
}

export function ConversationalSearch({ 
  onSearch, 
  onVoiceSearch 
}: ConversationalSearchProps) {
  const [messages, setMessages] = useState<SearchMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [searchResults, setSearchResults] = useState<AISearchResult[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<AISearchOptions>({});
  const [showFilters, setShowFilters] = useState(false);

  const { speak, cancel, speaking, voices } = useSpeechSynthesis();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: SearchMessage = {
      id: 'welcome',
      type: 'ai',
      content: 'こんにちは！AI検索アシスタントです。商品について何でもお聞きください。例：「利益率の高い商品を探して」「価格が上昇している商品は？」',
      timestamp: new Date(),
      voiceEnabled: true
    };
    
    setMessages([welcomeMessage]);
    
    if (voiceEnabled) {
      speak({
        text: welcomeMessage.content,
        voice: voices.find(v => v.lang.includes('ja')),
        rate: 1,
        pitch: 1
      });
    }
  }, []);

  const handleSearch = async (query: string, isVoice = false) => {
    if (!query.trim()) return;

    // Add user message
    const userMessage: SearchMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentQuery('');
    setIsProcessing(true);

    try {
      // Process natural language query to extract search parameters
      const searchOptions = await processNaturalLanguageQuery(query);
      
      // Combine with advanced filters
      const finalOptions = { ...advancedFilters, ...searchOptions };
      
      // Perform search
      const results = await onSearch(query, finalOptions);
      setSearchResults(results);

      // Generate AI response
      const aiResponse = generateSearchResponse(query, results, finalOptions);
      
      const aiMessage: SearchMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        searchResults: results,
        voiceEnabled: voiceEnabled
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Speak response if voice is enabled
      if (voiceEnabled && !isVoice) {
        speak({
          text: aiResponse,
          voice: voices.find(v => v.lang.includes('ja')),
          rate: 1,
          pitch: 1
        });
      }

    } catch (error) {
      console.error('Search failed:', error);
      
      const errorMessage: SearchMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: '申し訳ございません。検索中にエラーが発生しました。もう一度お試しください。',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        if (onVoiceSearch) {
          setIsProcessing(true);
          try {
            const transcription = await onVoiceSearch(audioBlob);
            if (transcription) {
              await handleSearch(transcription, true);
            }
          } catch (error) {
            console.error('Voice search failed:', error);
          } finally {
            setIsProcessing(false);
          }
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopVoiceRecording();
        }
      }, 30000);

    } catch (error) {
      console.error('Failed to start voice recording:', error);
      alert('音声録音を開始できませんでした。マイクの権限を確認してください。');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processNaturalLanguageQuery = async (query: string): Promise<AISearchOptions> => {
    const lowerQuery = query.toLowerCase();
    const options: AISearchOptions = {};

    // Extract profitability requirements
    if (lowerQuery.includes('利益率') || lowerQuery.includes('儲かる') || lowerQuery.includes('利益')) {
      if (lowerQuery.includes('高い') || lowerQuery.includes('良い')) {
        options.minProfitabilityScore = 70;
      }
    }

    // Extract risk preferences
    if (lowerQuery.includes('リスク')) {
      if (lowerQuery.includes('低い') || lowerQuery.includes('安全')) {
        options.maxRiskLevel = 'low';
      } else if (lowerQuery.includes('高い') || lowerQuery.includes('危険')) {
        options.maxRiskLevel = 'high';
      } else {
        options.maxRiskLevel = 'medium';
      }
    }

    // Extract price ranges
    if (lowerQuery.includes('安い') || lowerQuery.includes('低価格')) {
      options.priceRange = { min: 0, max: 5000 };
    } else if (lowerQuery.includes('高い') || lowerQuery.includes('高価格')) {
      options.priceRange = { min: 10000, max: 100000 };
    }

    // Extract trending requirements
    if (lowerQuery.includes('上昇') || lowerQuery.includes('トレンド') || lowerQuery.includes('人気')) {
      options.naturalLanguageQuery = '価格上昇トレンド';
    }

    // Set limit based on query intent
    if (lowerQuery.includes('たくさん') || lowerQuery.includes('多く')) {
      options.limit = 50;
    } else if (lowerQuery.includes('少し') || lowerQuery.includes('いくつか')) {
      options.limit = 10;
    } else {
      options.limit = 20;
    }

    return options;
  };

  const generateSearchResponse = (
    query: string,
    results: AISearchResult[],
    options: AISearchOptions
  ): string => {
    const resultCount = results.length;
    
    let response = `「${query}」の検索結果を${resultCount}件見つけました。`;

    if (resultCount === 0) {
      return response + ' 検索条件を変更して再度お試しください。';
    }

    // Analyze results
    const avgScore = results.reduce((sum, r) => sum + r.aiScore, 0) / results.length;
    const highScoreProducts = results.filter(r => r.aiScore > 80).length;
    const avgPrice = results.reduce((sum, r) => sum + r.currentPrice, 0) / results.length;

    response += `\n\n📊 分析結果：\n`;
    response += `• 平均AIスコア: ${avgScore.toFixed(0)}点\n`;
    response += `• 高評価商品: ${highScoreProducts}件\n`;
    response += `• 平均価格: ¥${avgPrice.toLocaleString()}\n`;

    if (highScoreProducts > 0) {
      const topProduct = results[0];
      response += `\n🏆 おすすめ商品:\n`;
      response += `「${topProduct.title}」\n`;
      response += `価格: ¥${topProduct.currentPrice.toLocaleString()}\n`;
      response += `AIスコア: ${topProduct.aiScore}点\n`;
      response += `利益率: ${topProduct.aiInsights.profitabilityScore}点`;
    }

    if (options.minProfitabilityScore) {
      response += `\n\n💰 利益率${options.minProfitabilityScore}点以上の商品に絞り込みました。`;
    }

    if (options.maxRiskLevel) {
      const riskText = options.maxRiskLevel === 'low' ? '低リスク' : 
                      options.maxRiskLevel === 'medium' ? '中リスク' : '高リスク';
      response += `\n\n⚡ ${riskText}商品に絞り込みました。`;
    }

    return response;
  };

  const handleQuickQuery = (query: string) => {
    setCurrentQuery(query);
    handleSearch(query);
  };

  const quickQueries = [
    '利益率の高い商品を探して',
    '価格が上昇している商品は？',
    'リスクの低い安全な商品',
    '1万円以下の商品',
    '今トレンドの商品',
    '在庫切れしそうな商品'
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Advanced Filters Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">AI会話検索</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              音声読み上げ
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              フィルター {showFilters ? '非表示' : '表示'}
            </Button>
          </div>
        </div>

        {/* Quick Query Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickQueries.map((query, index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              onClick={() => handleQuickQuery(query)}
              disabled={isProcessing}
              className="text-xs"
            >
              {query}
            </Button>
          ))}
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pt-4 border-t"
            >
              <div>
                <label className="block text-sm font-medium mb-1">最低利益率スコア</label>
                <select
                  value={advancedFilters.minProfitabilityScore || ''}
                  onChange={(e) => setAdvancedFilters(prev => ({
                    ...prev,
                    minProfitabilityScore: e.target.value ? Number(e.target.value) : undefined
                  }))}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">指定なし</option>
                  <option value="50">50点以上</option>
                  <option value="70">70点以上</option>
                  <option value="80">80点以上</option>
                  <option value="90">90点以上</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">最大リスクレベル</label>
                <select
                  value={advancedFilters.maxRiskLevel || ''}
                  onChange={(e) => setAdvancedFilters(prev => ({
                    ...prev,
                    maxRiskLevel: (e.target.value as any) || undefined
                  }))}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">指定なし</option>
                  <option value="low">低リスク</option>
                  <option value="medium">中リスク</option>
                  <option value="high">高リスク</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">価格帯</label>
                <select
                  onChange={(e) => {
                    const ranges: { [key: string]: { min: number; max: number } } = {
                      '0-5000': { min: 0, max: 5000 },
                      '5000-10000': { min: 5000, max: 10000 },
                      '10000-50000': { min: 10000, max: 50000 },
                      '50000+': { min: 50000, max: 1000000 }
                    };
                    
                    setAdvancedFilters(prev => ({
                      ...prev,
                      priceRange: e.target.value ? ranges[e.target.value] : undefined
                    }));
                  }}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">指定なし</option>
                  <option value="0-5000">¥0 - ¥5,000</option>
                  <option value="5000-10000">¥5,000 - ¥10,000</option>
                  <option value="10000-50000">¥10,000 - ¥50,000</option>
                  <option value="50000+">¥50,000以上</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages */}
        <Card className="p-4 h-96 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.type === 'ai'
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  <div className="whitespace-pre-line text-sm">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">AIが考えています...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex space-x-2">
            <Input
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              placeholder="商品について何でもお聞きください..."
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(currentQuery)}
              disabled={isProcessing || isRecording}
              className="flex-1"
            />
            <Button
              onClick={() => handleSearch(currentQuery)}
              disabled={isProcessing || !currentQuery.trim() || isRecording}
              className="px-3"
            >
              🔍
            </Button>
            <Button
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isProcessing}
              variant={isRecording ? 'secondary' : 'outline'}
              className="px-3"
            >
              {isRecording ? '🔴' : '🎤'}
            </Button>
          </div>
        </Card>

        {/* Search Results */}
        <Card className="p-4 h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            検索結果 ({searchResults.length}件)
          </h3>
          
          {searchResults.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p>検索を開始してください</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.slice(0, 10).map((result, index) => (
                <motion.div
                  key={result.asin}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-start gap-3">
                    {result.imageUrl && (
                      <img
                        src={result.imageUrl}
                        alt={result.title}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{result.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          AIスコア: {result.aiScore}
                        </Badge>
                        <Badge 
                          variant={result.aiInsights.profitabilityScore > 70 ? 'success' : 'outline'}
                        >
                          利益率: {result.aiInsights.profitabilityScore}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        ¥{result.currentPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}