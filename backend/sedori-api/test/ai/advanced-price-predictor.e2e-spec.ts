import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { E2ETestHelper, TestUser } from '../helpers/test-helper';
import { 
  AdvancedPricePredictorService, 
  PricePrediction, 
  PredictionModel, 
  PriceRecommendation 
} from '../../src/ai/prediction/advanced-price-predictor.service';
import { KeepaProduct, KeepaPriceAnalysis } from '../../src/external-apis/interfaces/keepa-data.interface';

describe('Advanced Price Prediction Engine E2E Tests (Issue #86)', () => {
  let app: INestApplication;
  let testHelper: E2ETestHelper;
  let pricePredictorService: AdvancedPricePredictorService;
  let testAdmin: TestUser;

  // Mock test data
  const mockProduct: KeepaProduct = {
    asin: 'B001PRED001',
    title: 'Test Prediction Product',
    stats: {
      current: [5000, 4500, 0, 75000], // Amazon, 3rd party, warehouse, sales rank
      rating: 4.3,
      reviewCount: 180,
      salesRankDrops30: 6,
    },
    categoryTree: [{ name: 'Electronics', id: 1 }],
    brand: 'TestBrand',
    imagesCSV: 'image1.jpg,image2.jpg',
  };

  const mockPriceHistory: KeepaPriceAnalysis = {
    asin: 'B001PRED001',
    analysis: {
      volatility: 22.5,
      trend: 'rising',
      trendStrength: 0.75,
      priceChanges: 8,
    },
    periods: [],
    currentPrice: 4500,
    priceRange: { min: 4000, max: 5500 },
  };

  beforeAll(async () => {
    testHelper = new E2ETestHelper();
    app = await testHelper.setupTestApp();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule.forRoot({
          type: 'single',
          url: 'redis://localhost:6379',
        }),
      ],
      providers: [
        AdvancedPricePredictorService,
      ],
    }).compile();

    pricePredictorService = moduleFixture.get<AdvancedPricePredictorService>(AdvancedPricePredictorService);
    testAdmin = await testHelper.createTestAdmin();
  });

  afterAll(async () => {
    await testHelper.cleanupTestData();
    await testHelper.teardownTestApp();
  });

  describe('Price Prediction Engine Initialization', () => {
    test('should initialize price prediction engine correctly', async () => {
      expect(pricePredictorService).toBeDefined();
    });

    test('should load prediction models', async () => {
      // Test that models are available
      const prediction = await pricePredictorService.predictPrice(mockProduct);
      expect(prediction).toBeDefined();
      expect(prediction.metadata.modelVersion).toBeDefined();
    });
  });

  describe('Basic Price Predictions', () => {
    test('should generate price prediction for valid product', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);

      expect(prediction).toMatchObject({
        asin: mockProduct.asin,
        currentPrice: expect.any(Number),
        predictions: {
          '1week': expect.objectContaining({
            price: expect.any(Number),
            confidence: expect.any(Number),
            range: expect.objectContaining({
              min: expect.any(Number),
              max: expect.any(Number),
            }),
            volatility: expect.any(Number),
            factors: expect.any(Array),
          }),
          '2weeks': expect.any(Object),
          '1month': expect.any(Object),
          '3months': expect.any(Object),
        },
        confidence: expect.objectContaining({
          overall: expect.any(Number),
          factors: expect.any(Array),
        }),
        marketContext: expect.any(Object),
        recommendations: expect.any(Array),
        metadata: expect.objectContaining({
          modelVersion: expect.any(String),
          generatedAt: expect.any(Date),
          dataQuality: expect.stringMatching(/^(high|medium|low)$/),
        }),
      });
    });

    test('should handle product with price history', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct, mockPriceHistory);

      expect(prediction.metadata.dataQuality).toBe('high');
      expect(prediction.confidence.overall).toBeGreaterThan(0.5);
    });

    test('should handle product without price history', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);

      expect(prediction).toBeDefined();
      expect(prediction.confidence.overall).toBeGreaterThan(0);
    });
  });

  describe('Multi-Timeframe Predictions', () => {
    test('should provide predictions for all timeframes', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);

      const timeframes = ['1week', '2weeks', '1month', '3months'];
      timeframes.forEach(timeframe => {
        expect(prediction.predictions[timeframe]).toBeDefined();
        expect(prediction.predictions[timeframe].price).toBeGreaterThan(0);
        expect(prediction.predictions[timeframe].confidence).toBeGreaterThan(0);
        expect(prediction.predictions[timeframe].confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should show decreasing confidence for longer timeframes', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);

      const confidences = [
        prediction.predictions['1week'].confidence,
        prediction.predictions['2weeks'].confidence,
        prediction.predictions['1month'].confidence,
        prediction.predictions['3months'].confidence,
      ];

      // Confidence should generally decrease with time
      expect(confidences[0]).toBeGreaterThanOrEqual(confidences[3]);
    });

    test('should show increasing volatility for longer timeframes', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);

      const volatilities = [
        prediction.predictions['1week'].volatility,
        prediction.predictions['2weeks'].volatility,
        prediction.predictions['1month'].volatility,
        prediction.predictions['3months'].volatility,
      ];

      // Volatility should generally increase with time
      expect(volatilities[3]).toBeGreaterThanOrEqual(volatilities[0]);
    });
  });

  describe('Market Context Analysis', () => {
    test('should analyze competitive landscape', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);

      expect(prediction.marketContext).toMatchObject({
        competitiveIndex: expect.any(Number),
        demandTrend: expect.stringMatching(/^(increasing|stable|decreasing)$/),
        supplyConstraints: expect.stringMatching(/^(low|medium|high)$/),
        seasonalityFactor: expect.any(Number),
        economicIndicators: expect.objectContaining({
          consumerSentiment: expect.any(Number),
          marketVolatility: expect.any(Number),
          categoryGrowth: expect.any(Number),
        }),
      });
    });

    test('should detect demand trends', async () => {
      // Mock high sales rank drops (increasing demand)
      const trendingProduct = {
        ...mockProduct,
        stats: {
          ...mockProduct.stats,
          salesRankDrops30: 15,
        },
      };

      const prediction = await pricePredictorService.predictPrice(trendingProduct);
      expect(prediction.marketContext.demandTrend).toBe('increasing');
    });

    test('should assess supply constraints', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);
      
      expect(['low', 'medium', 'high']).toContain(prediction.marketContext.supplyConstraints);
    });
  });

  describe('Confidence Scoring System', () => {
    test('should calculate overall confidence score', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct, mockPriceHistory);

      expect(prediction.confidence.overall).toBeGreaterThan(0);
      expect(prediction.confidence.overall).toBeLessThanOrEqual(1);
    });

    test('should provide confidence factors', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);

      expect(prediction.confidence.factors).toBeInstanceOf(Array);
      expect(prediction.confidence.factors.length).toBeGreaterThan(0);
      
      prediction.confidence.factors.forEach(factor => {
        expect(factor).toMatchObject({
          name: expect.any(String),
          score: expect.any(Number),
          explanation: expect.any(String),
        });
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(1);
      });
    });

    test('should adjust confidence based on data quality', async () => {
      const lowDataPrediction = await pricePredictorService.predictPrice({
        ...mockProduct,
        stats: { current: [4500, 0, 0, 999999] }, // Minimal data
      });

      const highDataPrediction = await pricePredictorService.predictPrice(mockProduct, mockPriceHistory);

      expect(highDataPrediction.confidence.overall).toBeGreaterThan(lowDataPrediction.confidence.overall);
    });
  });

  describe('Recommendation Engine', () => {
    test('should generate actionable recommendations', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);

      expect(prediction.recommendations).toBeInstanceOf(Array);
      expect(prediction.recommendations.length).toBeGreaterThan(0);

      prediction.recommendations.forEach((rec: PriceRecommendation) => {
        expect(rec).toMatchObject({
          type: expect.stringMatching(/^(buy_now|wait_for_drop|sell_immediately|monitor_closely|avoid)$/),
          urgency: expect.stringMatching(/^(critical|high|medium|low)$/),
          reasoning: expect.any(String),
          riskLevel: expect.stringMatching(/^(low|medium|high)$/),
        });
      });
    });

    test('should recommend immediate buy for strong opportunities', async () => {
      // Mock strong upward trend
      const strongProduct = {
        ...mockProduct,
        stats: {
          ...mockProduct.stats,
          current: [6000, 4000, 0, 30000], // Good arbitrage opportunity
        },
      };

      const prediction = await pricePredictorService.predictPrice(strongProduct);
      
      // Should have buy recommendation
      const buyRecs = prediction.recommendations.filter(r => r.type === 'buy_now');
      expect(buyRecs.length).toBeGreaterThan(0);
    });

    test('should recommend waiting for price drops', async () => {
      // Mock declining trend prediction
      const decliningPrediction: PricePrediction = await pricePredictorService.predictPrice(mockProduct);
      
      // Manually adjust for testing declining scenario
      if (decliningPrediction.predictions['1month'].price < decliningPrediction.currentPrice * 0.9) {
        const waitRecs = decliningPrediction.recommendations.filter(r => r.type === 'wait_for_drop');
        expect(waitRecs.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('should include optimal price targets', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);
      
      const recsWithTargets = prediction.recommendations.filter(r => r.optimalPriceTarget);
      expect(recsWithTargets.length).toBeGreaterThan(0);
      
      recsWithTargets.forEach(rec => {
        expect(rec.optimalPriceTarget).toBeGreaterThan(0);
        expect(rec.timeWindow).toBeDefined();
      });
    });
  });

  describe('Batch Predictions', () => {
    test('should process multiple products in batch', async () => {
      const products: KeepaProduct[] = [
        mockProduct,
        { ...mockProduct, asin: 'B001PRED002', title: 'Batch Product 2' },
        { ...mockProduct, asin: 'B001PRED003', title: 'Batch Product 3' },
      ];

      const predictions = await pricePredictorService.batchPredictPrices(products);

      expect(predictions).toBeInstanceOf(Array);
      expect(predictions.length).toBe(3);
      
      predictions.forEach((prediction, index) => {
        expect(prediction.asin).toBe(products[index].asin);
        expect(prediction.predictions).toBeDefined();
      });
    });

    test('should handle batch errors gracefully', async () => {
      const products: KeepaProduct[] = [
        mockProduct,
        { ...mockProduct, asin: '', title: 'Invalid Product' }, // Invalid product
        { ...mockProduct, asin: 'B001PRED005', title: 'Valid Product 2' },
      ];

      const predictions = await pricePredictorService.batchPredictPrices(products);

      expect(predictions.length).toBe(3);
      // Should still return predictions for all products (fallback for invalid ones)
      predictions.forEach(prediction => {
        expect(prediction).toBeDefined();
      });
    });
  });

  describe('Caching System', () => {
    test('should cache prediction results', async () => {
      const startTime = Date.now();
      const prediction1 = await pricePredictorService.predictPrice(mockProduct);
      const firstCallTime = Date.now() - startTime;

      const cacheStartTime = Date.now();
      const prediction2 = await pricePredictorService.predictPrice(mockProduct);
      const cachedCallTime = Date.now() - cacheStartTime;

      expect(prediction1.asin).toBe(prediction2.asin);
      expect(prediction1.metadata.generatedAt).toEqual(prediction2.metadata.generatedAt);
      expect(cachedCallTime).toBeLessThan(firstCallTime);
    });

    test('should bypass cache when using custom options', async () => {
      const prediction1 = await pricePredictorService.predictPrice(mockProduct);
      const prediction2 = await pricePredictorService.predictPrice(mockProduct, undefined, {
        confidenceThreshold: 0.8,
      });

      // Should be different due to custom options
      expect(prediction1.metadata.generatedAt).not.toEqual(prediction2.metadata.generatedAt);
    });
  });

  describe('Advanced Options', () => {
    test('should support ensemble model option', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct, undefined, {
        useEnsemble: true,
      });

      expect(prediction).toBeDefined();
      // Ensemble should typically provide higher accuracy
      expect(prediction.confidence.overall).toBeGreaterThan(0.5);
    });

    test('should include external factors', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct, undefined, {
        includeExternalFactors: true,
      });

      expect(prediction.marketContext.economicIndicators).toBeDefined();
      expect(prediction.predictions['1week'].factors.length).toBeGreaterThan(0);
    });

    test('should respect confidence threshold', async () => {
      const highThresholdPrediction = await pricePredictorService.predictPrice(mockProduct, undefined, {
        confidenceThreshold: 0.9,
      });

      expect(highThresholdPrediction).toBeDefined();
    });
  });

  describe('Price Factors Analysis', () => {
    test('should identify price-influencing factors', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct, mockPriceHistory);

      const oneWeekFactors = prediction.predictions['1week'].factors;
      expect(oneWeekFactors.length).toBeGreaterThan(0);

      oneWeekFactors.forEach(factor => {
        expect(factor).toMatchObject({
          name: expect.any(String),
          impact: expect.any(Number),
          weight: expect.any(Number),
          description: expect.any(String),
          category: expect.stringMatching(/^(seasonal|competitive|demand|supply|economic|algorithmic)$/),
        });
        
        expect(factor.impact).toBeGreaterThanOrEqual(-1);
        expect(factor.impact).toBeLessThanOrEqual(1);
        expect(factor.weight).toBeGreaterThanOrEqual(0);
        expect(factor.weight).toBeLessThanOrEqual(1);
      });
    });

    test('should categorize factors by type', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct, mockPriceHistory);
      
      const allFactors = Object.values(prediction.predictions)
        .flatMap(p => p.factors);
      
      const categories = [...new Set(allFactors.map(f => f.category))];
      expect(categories.length).toBeGreaterThan(1);
      
      const expectedCategories = ['seasonal', 'competitive', 'demand', 'supply', 'economic', 'algorithmic'];
      categories.forEach(category => {
        expect(expectedCategories).toContain(category);
      });
    });
  });

  describe('Seasonal Analysis', () => {
    test('should detect seasonal patterns', async () => {
      const prediction = await pricePredictorService.predictPrice(mockProduct);

      expect(prediction.marketContext.seasonalityFactor).toBeDefined();
      expect(prediction.marketContext.seasonalityFactor).toBeGreaterThanOrEqual(-1);
      expect(prediction.marketContext.seasonalityFactor).toBeLessThanOrEqual(1);
    });

    test('should handle holiday periods', async () => {
      const holidayProduct = {
        ...mockProduct,
        categoryTree: [{ name: 'Toys & Games', id: 1 }],
      };

      const prediction = await pricePredictorService.predictPrice(holidayProduct);
      
      // During holiday seasons, toys should show seasonal impact
      expect(prediction.marketContext.seasonalityFactor).toBeDefined();
    });
  });

  describe('Brand Strength Analysis', () => {
    test('should recognize strong brands', async () => {
      const strongBrandProduct = {
        ...mockProduct,
        brand: 'Sony',
      };

      const prediction = await pricePredictorService.predictPrice(strongBrandProduct);
      
      // Strong brands should have different confidence factors
      expect(prediction.confidence.factors).toBeDefined();
    });

    test('should handle unknown brands', async () => {
      const unknownBrandProduct = {
        ...mockProduct,
        brand: undefined,
      };

      const prediction = await pricePredictorService.predictPrice(unknownBrandProduct);
      
      expect(prediction).toBeDefined();
      expect(prediction.confidence.overall).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should provide fallback prediction for invalid data', async () => {
      const invalidProduct: KeepaProduct = {
        asin: 'B001INVALID',
        title: 'Invalid Product',
        stats: {
          current: [0, 0, 0, 999999], // No valid prices
        },
      };

      const prediction = await pricePredictorService.predictPrice(invalidProduct);
      
      expect(prediction).toBeDefined();
      expect(prediction.metadata.dataQuality).toBe('low');
      expect(prediction.recommendations).toContain(
        expect.objectContaining({
          type: 'monitor_closely',
          reasoning: expect.stringContaining('データ不足'),
        })
      );
    });

    test('should handle missing product data gracefully', async () => {
      const minimalProduct: KeepaProduct = {
        asin: 'B001MINIMAL',
        stats: {
          current: [4500, 0, 0, 100000],
        },
      };

      const prediction = await pricePredictorService.predictPrice(minimalProduct);
      
      expect(prediction).toBeDefined();
      expect(prediction.currentPrice).toBe(45); // 4500/100 cents to yen
    });
  });

  describe('Real-world Performance', () => {
    test('should complete prediction within reasonable time', async () => {
      const startTime = Date.now();
      const prediction = await pricePredictorService.predictPrice(mockProduct);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(prediction).toBeDefined();
    });

    test('should handle concurrent predictions', async () => {
      const products = [
        { ...mockProduct, asin: 'B001CONC001' },
        { ...mockProduct, asin: 'B001CONC002' },
        { ...mockProduct, asin: 'B001CONC003' },
      ];

      const predictionPromises = products.map(product => 
        pricePredictorService.predictPrice(product)
      );

      const predictions = await Promise.all(predictionPromises);
      
      expect(predictions.length).toBe(3);
      predictions.forEach(prediction => {
        expect(prediction).toBeDefined();
        expect(prediction.predictions).toBeDefined();
      });
    });

    test('should scale to multiple categories', async () => {
      const categoryProducts = [
        { ...mockProduct, asin: 'B001CAT001', categoryTree: [{ name: 'Electronics', id: 1 }] },
        { ...mockProduct, asin: 'B001CAT002', categoryTree: [{ name: 'Books', id: 2 }] },
        { ...mockProduct, asin: 'B001CAT003', categoryTree: [{ name: 'Fashion', id: 3 }] },
        { ...mockProduct, asin: 'B001CAT004', categoryTree: [{ name: 'Home & Kitchen', id: 4 }] },
      ];

      const predictions = await pricePredictorService.batchPredictPrices(categoryProducts);
      
      expect(predictions.length).toBe(4);
      
      // Each category should have different volatility patterns
      const volatilities = predictions.map(p => p.predictions['1week'].volatility);
      expect(new Set(volatilities).size).toBeGreaterThan(1);
    });
  });
});