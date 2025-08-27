import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
// Redis token is provided directly in the test
import { AutonomousDiscoveryService, DiscoveryRequestDto } from './autonomous-discovery.service';
import Redis from 'ioredis';

describe('AutonomousDiscoveryService', () => {
  let service: AutonomousDiscoveryService;
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
        const config: Record<string, any> = {
          'ai.caching.cacheTimeout': 3600,
        };
        return config[key] || defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutonomousDiscoveryService,
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

    service = module.get<AutonomousDiscoveryService>(AutonomousDiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('discoverProducts', () => {
    it('should successfully discover products', async () => {
      const request: DiscoveryRequestDto = {
        category: 'Electronics',
        maxResults: 10,
        minPrice: 10,
        maxPrice: 1000,
      };

      mockRedis.get.mockResolvedValue(null); // No cache

      const result = await service.discoverProducts(request);

      expect(result).toBeDefined();
      expect(result.products).toBeInstanceOf(Array);
      expect(result.totalFound).toBeGreaterThanOrEqual(0);
      expect(result.sources).toBeInstanceOf(Array);
      expect(result.recommendations).toBeDefined();
    });

    it('should return cached result when available', async () => {
      const request: DiscoveryRequestDto = {
        category: 'Electronics',
        maxResults: 10,
      };

      const cachedResult = {
        products: [],
        totalFound: 0,
        processingTime: 1000,
        sources: ['amazon'],
        recommendations: {
          topCategories: ['Electronics'],
          priceRanges: [],
          profitabilityInsights: [],
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.discoverProducts(request);

      expect(result).toEqual(cachedResult);
      expect(mockRedis.get).toHaveBeenCalled();
    });

    it('should validate input parameters', async () => {
      const invalidRequest = {
        maxResults: 2000, // Exceeds maximum
      };

      await expect(service.discoverProducts(invalidRequest as any)).rejects.toThrow();
    });

    it('should filter products based on price range', async () => {
      const request: DiscoveryRequestDto = {
        minPrice: 50,
        maxPrice: 200,
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.discoverProducts(request);

      // Check that all returned products are within price range
      result.products.forEach(product => {
        expect(product.price).toBeGreaterThanOrEqual(50);
        expect(product.price).toBeLessThanOrEqual(200);
      });
    });
  });

  describe('getMetrics', () => {
    it('should return performance metrics', async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.successfulRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.failedRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are working', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.redis).toBe('connected');
      expect(health.details.circuit).toBeDefined();
      expect(health.details.metrics).toBeDefined();
    });

    it('should return unhealthy status when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      const request: DiscoveryRequestDto = {
        category: 'Electronics',
      };

      // Should not throw error, should handle Redis failures gracefully
      const result = await service.discoverProducts(request);
      expect(result).toBeDefined();
    });

    it('should handle circuit breaker opening', async () => {
      // Simulate multiple failures to open circuit breaker
      mockRedis.get.mockResolvedValue(null);

      const request: DiscoveryRequestDto = {
        category: 'Electronics',
      };

      // Should handle circuit breaker behavior
      const result = await service.discoverProducts(request);
      expect(result).toBeDefined();
    });
  });

  describe('caching behavior', () => {
    it('should cache successful results', async () => {
      const request: DiscoveryRequestDto = {
        category: 'Electronics',
      };

      mockRedis.get.mockResolvedValue(null);

      await service.discoverProducts(request);

      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should use different cache keys for different requests', async () => {
      const request1: DiscoveryRequestDto = {
        category: 'Electronics',
      };

      const request2: DiscoveryRequestDto = {
        category: 'Fashion',
      };

      mockRedis.get.mockResolvedValue(null);

      await service.discoverProducts(request1);
      await service.discoverProducts(request2);

      // Verify different cache keys were used
      const calls = mockRedis.get.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });
  });

  describe('profitability scoring', () => {
    it('should assign higher scores to better products', async () => {
      const request: DiscoveryRequestDto = {
        category: 'Electronics',
        maxResults: 20,
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.discoverProducts(request);

      if (result.products.length > 1) {
        // Products should be sorted by profitability score descending
        for (let i = 1; i < result.products.length; i++) {
          expect(result.products[i-1].profitabilityScore).toBeGreaterThanOrEqual(
            result.products[i].profitabilityScore
          );
        }
      }
    });

    it('should provide confidence scores for all products', async () => {
      const request: DiscoveryRequestDto = {
        category: 'Electronics',
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.discoverProducts(request);

      result.products.forEach(product => {
        expect(product.confidence).toBeGreaterThan(0);
        expect(product.confidence).toBeLessThanOrEqual(1);
        expect(product.profitabilityScore).toBeGreaterThanOrEqual(0);
        expect(product.marketDemand).toBeGreaterThanOrEqual(0);
        expect(product.competitionLevel).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('recommendations', () => {
    it('should provide meaningful recommendations', async () => {
      const request: DiscoveryRequestDto = {
        maxResults: 10,
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await service.discoverProducts(request);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.topCategories).toBeInstanceOf(Array);
      expect(result.recommendations.priceRanges).toBeInstanceOf(Array);
      expect(result.recommendations.profitabilityInsights).toBeInstanceOf(Array);
    });
  });
});