export interface CompetitorPrice {
  source: string;
  price: number;
  url?: string;
  timestamp: Date;
  availability: 'in_stock' | 'out_of_stock' | 'limited' | 'unknown';
  shipping?: number;
  currency: string;
}

export interface MarketAnalysis {
  competitorPrices: CompetitorPrice[];
  demandScore: number;
  trendIndicator: 'rising' | 'falling' | 'stable';
  seasonalityScore: number;
  marketSaturation: 'low' | 'medium' | 'high';
  priceVolatility: number;
  recommendedPriceRange: {
    min: number;
    max: number;
    optimal: number;
  };
}

export interface ProductSearchResult {
  asin?: string;
  jan?: string;
  title: string;
  price: number;
  currency: string;
  availability: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  productUrl: string;
  seller?: string;
  rank?: number;
  category?: string;
}

export interface PriceHistory {
  date: Date;
  price: number;
  source: string;
}

export interface MarketTrend {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  trend: 'up' | 'down' | 'stable';
  percentage: number;
  confidence: number;
}