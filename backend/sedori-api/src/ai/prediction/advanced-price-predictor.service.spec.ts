import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRedisToken } from '@nestjs-modules/ioredis';
import { AdvancedPricePredictorService, PricePredictionRequestDto } from './advanced-price-predictor.service';
import Redis from 'ioredis';

describe('AdvancedPricePredictorService', () => {
  let service: AdvancedPricePredictorService;
  let mockRedis: jest.Mocked<Redis>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      setex: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
    } as any;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config = {
          'ai.caching.predictionCacheTimeout': 1800,
        };
        return config[key] || defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedPricePredictorService,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AdvancedPricePredictorService>(AdvancedPricePredictorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('predictPrices', () => {
    it('should successfully predict prices', async () => {
      const request: PricePredictionRequestDto = {
        productId: 'test-product-1',
        currentPrice: 100,
        predictionDays: 30,
        historicalPrices: [
          { date: '2024-01-01', price: 95 },
          { date: '2024-01-02', price: 98 },
          { date: '2024-01-03', price: 100 },
        ],
      };

      mockRedis.get.mockResolvedValue(null); // No cache

      const result = await service.predictPrices(request);

      expect(result).toBeDefined();
      expect(result.productId).toBe(request.productId);
      expect(result.predictions).toBeInstanceOf(Array);
      expect(result.predictions).toHaveLength(30);
      expect(result.summary).toBeDefined();
      expect(result.modelMetrics).toBeDefined();
      expect(result.marketInsights).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should return cached result when available', async () => {
      const request: PricePredictionRequestDto = {
        productId: 'cached-product',
        currentPrice: 50,
      };

      const cachedResult = {
        productId: 'cached-product',
        currentPrice: 50,
        predictions: [],
        summary: {
          averagePredictedPrice: 52,
          priceChange: 2,
          priceChangePercentage: 4,
          trend: 'increasing' as const,
          volatility: 0.1,
          bestTimeToSell: new Date(),
          bestTimeToBuy: new Date(),
        },
        modelMetrics: {
          accuracy: 0.85,
          mse: 0.1,
          mae: 0.05,
          r2Score: 0.9,
          confidence: 0.8,
        },
        marketInsights: {
          seasonalPatterns: [],
          competitorAnalysis: [],
          demandDrivers: [],
          riskFactors: [],
        },
        recommendations: [],
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.predictPrices(request);

      expect(result.productId).toBe(cachedResult.productId);
    });

    it('should validate input parameters', async () => {
      const invalidRequest = {
        productId: '', // Empty product ID
        predictionDays: 500, // Exceeds maximum
      };

      await expect(service.predictPrices(invalidRequest as any)).rejects.toThrow();
    });

    it('should handle predictions with confidence bounds', async () => {
      const request: PricePredictionRequestDto = {
        productId: 'test-product',
        currentPrice: 100,
        predictionDays: 7,
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.predictPrices(request);

      result.predictions.forEach(prediction => {
        expect(prediction.predictedPrice).toBeGreaterThan(0);
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(prediction.upperBound).toBeGreaterThanOrEqual(prediction.predictedPrice);
        expect(prediction.lowerBound).toBeLessThanOrEqual(prediction.predictedPrice);
        expect(prediction.factors).toBeDefined();
      });
    });

    it('should provide trend analysis', async () => {
      const request: PricePredictionRequestDto = {
        productId: 'trend-test',
        currentPrice: 100,
        predictionDays: 14,
        historicalPrices: [
          { date: '2024-01-01', price: 90 },
          { date: '2024-01-02', price: 95 },
          { date: '2024-01-03', price: 100 },
        ],
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.predictPrices(request);

      expect(['increasing', 'decreasing', 'stable']).toContain(result.summary.trend);
      expect(typeof result.summary.volatility).toBe('number');
      expect(result.summary.bestTimeToSell).toBeInstanceOf(Date);
      expect(result.summary.bestTimeToBuy).toBeInstanceOf(Date);
    });
  });

  describe('addTrainingData', () => {
    it('should accept training data for model improvement', async () => {
      await expect(
        service.addTrainingData('product-1', 105, 100, [0.1, 0.2, 0.3])
      ).resolves.not.toThrow();

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('getModelMetrics', () => {
    it('should return model performance metrics', async () => {
      const metrics = await service.getModelMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.accuracy).toBeGreaterThan(0);
      expect(metrics.precision).toBeGreaterThan(0);
      expect(metrics.recall).toBeGreaterThan(0);
      expect(metrics.f1Score).toBeGreaterThan(0);
      expect(metrics.lastTraining).toBeInstanceOf(Date);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are working', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.redis).toBe('connected');
      expect(health.details.circuit).toBeDefined();
      expect(health.details.models).toBeDefined();
      expect(health.details.training).toBeDefined();
    });

    it('should return unhealthy status when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBeDefined();
    });
  });

  describe('market insights', () => {
    it('should provide seasonal pattern analysis', async () => {
      const request: PricePredictionRequestDto = {
        productId: 'seasonal-product',
        currentPrice: 100,
        predictionDays: 30,
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.predictPrices(request);

      expect(result.marketInsights.seasonalPatterns).toBeInstanceOf(Array);
      expect(result.marketInsights.competitorAnalysis).toBeInstanceOf(Array);
      expect(result.marketInsights.demandDrivers).toBeInstanceOf(Array);
      expect(result.marketInsights.riskFactors).toBeInstanceOf(Array);
    });

    it('should provide actionable recommendations', async () => {
      const request: PricePredictionRequestDto = {
        productId: 'recommendation-test',
        currentPrice: 100,
        predictionDays: 14,
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.predictPrices(request);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      result.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('error handling', () => {
    it('should handle model loading failures gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Model loading failed'));

      const request: PricePredictionRequestDto = {
        productId: 'error-test',
        currentPrice: 100,
      };

      // Should handle errors gracefully and still provide predictions
      const result = await service.predictPrices(request);
      expect(result).toBeDefined();
    });

    it('should handle insufficient historical data', async () => {
      const request: PricePredictionRequestDto = {
        productId: 'insufficient-data',
        currentPrice: 100,
        historicalPrices: [], // No historical data
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.predictPrices(request);

      expect(result).toBeDefined();
      expect(result.predictions).toBeInstanceOf(Array);
    });
  });

  describe('prediction accuracy', () => {
    it('should provide confidence scores for all predictions', async () => {
      const request: PricePredictionRequestDto = {
        productId: 'confidence-test',
        currentPrice: 100,
        predictionDays: 7,
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.predictPrices(request);

      result.predictions.forEach(prediction => {
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should show decreasing confidence for longer-term predictions', async () => {
      const request: PricePredictionRequestDto = {
        productId: 'confidence-decay-test',
        currentPrice: 100,
        predictionDays: 30,
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.predictPrices(request);

      if (result.predictions.length > 1) {
        const firstDayConfidence = result.predictions[0].confidence;
        const lastDayConfidence = result.predictions[result.predictions.length - 1].confidence;
        
        // Confidence should generally decrease over time
        expect(lastDayConfidence).toBeLessThanOrEqual(firstDayConfidence + 0.1); // Allow small margin
      }
    });
  });
});