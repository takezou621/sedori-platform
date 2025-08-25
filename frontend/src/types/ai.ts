// AI-enhanced types for Keepa integration
export interface PriceDataPoint {
  timestamp: string;
  price: number;
  source?: 'amazon' | 'keepa' | 'prediction';
}

export interface PricePrediction {
  timestamp: string;
  predictedPrice: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  probability: number;
}

export interface PriceAnomaly {
  timestamp: string;
  price: number;
  type: 'spike' | 'drop';
  severity: 'low' | 'medium' | 'high';
  possibleCause?: string;
}

export interface SeasonalityPattern {
  period: 'yearly' | 'quarterly' | 'monthly' | 'weekly';
  strength: number;
  peakPeriods: string[];
  lowPeriods: string[];
}

export interface KeepaPriceAnalysis {
  asin: string;
  analysis: {
    trend: 'rising' | 'falling' | 'stable' | 'volatile';
    trendStrength: number;
    volatility: number;
    seasonality: SeasonalityPattern[];
    anomalies: PriceAnomaly[];
    predictions: PricePrediction[];
    insights: string[];
    recommendations: ActionRecommendation[];
  };
  metadata: {
    analyzedAt: Date;
    dataPoints: number;
    confidenceScore: number;
    modelVersion: string;
  };
}

export interface ActionRecommendation {
  type: 'buy' | 'sell' | 'hold' | 'watch';
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string;
  confidence: number;
}

export interface KeepaAiInsights {
  asin: string;
  summary: string;
  marketPosition: 'leader' | 'follower' | 'niche' | 'declining';
  competitiveness: number;
  profitabilityScore: number;
  riskScore: number;
  demandIndicators: {
    salesRankTrend: 'improving' | 'stable' | 'declining';
    priceElasticity: number;
    marketSaturation: 'low' | 'medium' | 'high';
  };
  strategicRecommendations: string[];
  nextReviewDate: Date;
}

export interface ChartConfig {
  type: 'line' | 'candlestick' | 'bar' | 'area';
  timeRange: '7d' | '30d' | '90d' | '1y' | 'all';
  showPredictions: boolean;
  showAnomalies: boolean;
  showSeasonality: boolean;
  voiceEnabled: boolean;
}

export interface VoiceAnalysis {
  enabled: boolean;
  language: 'en' | 'ja';
  voice?: SpeechSynthesisVoice;
  speed: number;
  pitch: number;
}

export interface NaturalLanguageQuery {
  question: string;
  context: 'price' | 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  timeframe?: string;
  confidence?: number;
}

export interface AISearchOptions {
  minProfitabilityScore?: number;
  maxRiskLevel?: 'low' | 'medium' | 'high';
  category?: number;
  priceRange?: { min: number; max: number };
  limit?: number;
  naturalLanguageQuery?: string;
  voiceSearch?: boolean;
}

export interface AISearchResult {
  asin: string;
  title: string;
  currentPrice: number;
  aiScore: number;
  aiInsights: KeepaAiInsights;
  priceAnalysis: KeepaPriceAnalysis;
  imageUrl?: string;
  category?: string;
}

export interface MarketIntelligence {
  overallTrends: {
    priceDirection: 'up' | 'down' | 'stable';
    volatilityLevel: 'low' | 'medium' | 'high';
    seasonalFactors: string[];
  };
  topOpportunities: AISearchResult[];
  riskAlerts: {
    type: 'price_volatility' | 'market_saturation' | 'seasonal_decline';
    severity: 'low' | 'medium' | 'high';
    affectedProducts: string[];
    recommendation: string;
  }[];
  marketReports: {
    title: string;
    summary: string;
    keyInsights: string[];
    generatedAt: Date;
  }[];
}

export interface AIOptimizationMetrics {
  syncEfficiency: number;
  cacheHitRate: number;
  predictionAccuracy: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    api_calls: number;
  };
  qualityScores: {
    dataIntegrity: number;
    responseTime: number;
    errorRate: number;
  };
}