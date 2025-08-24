export interface KeepaProduct {
  asin: string;
  domainId: number;
  title: string;
  manufacturer: string;
  brand: string;
  model: string;
  categoryTree: KeepaCategory[];
  rootCategory: number;
  parentAsin?: string;
  variationAsins?: string[];
  imagesCSV: string;
  features?: string[];
  description?: string;
  stats: KeepaStats;
  csv: number[]; // Price history data
  availabilityAmazon?: number; // Current availability on Amazon
  offersSuccessful?: boolean;
  g?: KeepaOffers; // Current offers
  lastUpdate?: number; // Timestamp of last update
}

export interface KeepaCategory {
  catId: number;
  name: string;
}

export interface KeepaStats {
  current: number[]; // Current prices [Amazon, New, Used, Sales Rank, etc.]
  avg: number[]; // Average prices
  min: number[]; // Minimum prices
  max: number[]; // Maximum prices
  minInInterval: number[]; // Minimum in tracking interval
  maxInInterval: number[]; // Maximum in tracking interval
  out: number[]; // Out of stock percentage
  totalOffers: number; // Total number of offers tracked
  salesRankDrops30: number; // Sales rank drops in last 30 days
  salesRankDrops90: number; // Sales rank drops in last 90 days
  salesRankDrops180: number; // Sales rank drops in last 180 days
  rating?: number; // Average rating
  reviewCount?: number; // Number of reviews
  buyBoxPrice?: number; // Current buy box price
  buyBoxShipping?: number; // Current buy box shipping cost
  buyBoxIsUnqualified?: boolean;
  buyBoxIsMAP?: boolean;
  buyBoxWinner?: string; // Buy box winner seller name
}

export interface KeepaOffers {
  offerCSV?: string; // Offer history CSV
  liveOffersOrder: number[]; // Live offers order
}

export interface KeepaPriceHistory {
  asin: string;
  domainId: number;
  csv: number[]; // Raw price data [time1, price1, time2, price2, ...]
  timestamps: Date[]; // Converted timestamps
  amazonPrices: KeepaPrice[]; // Amazon price history
  newPrices: KeepaPrice[]; // New offer price history
  usedPrices: KeepaPrice[]; // Used offer price history
  salesRankHistory: KeepaPrice[]; // Sales rank history
  referralFeeRate?: number; // Current referral fee rate
}

export interface KeepaPrice {
  timestamp: Date;
  price: number; // Price in smallest currency unit (e.g., cents)
  isOutOfStock: boolean;
}

export interface KeepaAlert {
  alertId: string;
  asin: string;
  userId: string;
  domain: number;
  priceType: KeepaTrackingType;
  desiredPrice: number; // Target price for alert
  currentPrice?: number;
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
  notificationsSent: number;
  intervalMinutes: number; // Check interval
}

export enum KeepaTrackingType {
  AMAZON = 0,
  NEW = 1,
  USED = 2,
  SALES_RANK = 3,
  LISTPRICE = 4,
  COLLECTIBLE = 5,
  REFURBISHED = 6,
  NEW_FBM = 7,
  LIGHTNING_DEAL = 8,
  WAREHOUSE = 9,
  NEW_FBA = 10,
  COUNT_NEW = 11,
  COUNT_USED = 12,
  COUNT_REFURBISHED = 13,
  COUNT_COLLECTIBLE = 14,
  EXTRA_INFO_UPDATES = 15,
  RATING = 16,
  COUNT_REVIEWS = 17,
  BUY_BOX_SHIPPING = 18,
  USED_GOOD_SHIPPING = 19,
  USED_VERY_GOOD_SHIPPING = 20,
  USED_LIKE_NEW_SHIPPING = 21,
  COLLECTIBLE_GOOD_SHIPPING = 22,
  COLLECTIBLE_VERY_GOOD_SHIPPING = 23,
  COLLECTIBLE_LIKE_NEW_SHIPPING = 24,
  REFURBISHED_SHIPPING = 25,
  TRADE_IN = 26,
  EB_FEES = 27,
}

export interface KeepaApiResponse<T> {
  timestamp: number;
  tokensLeft: number;
  tokensConsumed: number;
  processingTimeInMs: number;
  version: string;
  data?: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface KeepaSearchRequest {
  key: string; // API key
  domain: number; // Amazon domain (1=.com, 2=.co.uk, 3=.de, 4=.fr, 5=.co.jp, etc.)
  type?: string; // Search type: 'product' or 'category'
  term?: string; // Search term
  category?: number; // Category ID
  author?: string; // Book author
  title?: string; // Book title
  page?: number; // Page number (0-based)
  perpage?: number; // Results per page (max 50)
  format?: number; // Output format
  minimal?: boolean; // Minimal response
}

export interface KeepaProductRequest {
  key: string; // API key
  domain: number; // Amazon domain
  asin?: string; // Single ASIN
  code?: string; // Multiple ASINs (comma-separated) or UPC/EAN
  days?: number; // History period in days
  stats?: number; // Include stats (default 365 days)
  update?: number; // Force update (hours since last update)
  history?: number; // Include price history (0=no, 1=yes)
  rating?: number; // Include rating history (0=no, 1=yes)
  offers?: number; // Include live offers (up to 20)
}

// AI Enhancement interfaces
export interface KeepaPriceAnalysis {
  asin: string;
  analysis: {
    trend: 'rising' | 'falling' | 'stable' | 'volatile';
    trendStrength: number; // 0-1
    volatility: number; // Standard deviation
    seasonality: SeasonalityPattern[];
    anomalies: PriceAnomaly[];
    predictions: PricePrediction[];
    insights: string[]; // AI-generated insights
    recommendations: ActionRecommendation[];
  };
  metadata: {
    analyzedAt: Date;
    dataPoints: number;
    confidenceScore: number;
    modelVersion: string;
  };
}

export interface SeasonalityPattern {
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  strength: number; // 0-1
  peakPeriods: string[]; // e.g., ["December", "March"]
  lowPeriods: string[];
}

export interface PriceAnomaly {
  timestamp: Date;
  price: number;
  type: 'drop' | 'spike' | 'gap';
  severity: 'low' | 'medium' | 'high';
  possibleCause?: string;
  duration?: number; // Duration in days
}

export interface PricePrediction {
  timestamp: Date;
  predictedPrice: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  probability: number; // Confidence level
}

export interface ActionRecommendation {
  type: 'buy' | 'sell' | 'watch' | 'avoid';
  reason: string;
  expectedProfit?: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string; // e.g., "within 30 days"
  confidence: number; // 0-1
}

export interface KeepaAiInsights {
  asin: string;
  summary: string; // AI-generated summary
  marketPosition: 'leader' | 'follower' | 'niche' | 'declining';
  competitiveness: number; // 0-100 score
  profitabilityScore: number; // 0-100 score
  riskScore: number; // 0-100 score
  demandIndicators: {
    salesRankTrend: 'improving' | 'stable' | 'declining';
    priceElasticity: number;
    marketSaturation: 'low' | 'medium' | 'high';
  };
  strategicRecommendations: string[];
  nextReviewDate: Date;
}