import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
// Redis token is provided directly in the test
import { 
  SupplyChainOptimizerService, 
  SupplyChainOptimizationRequestDto,
  OptimizationStrategy 
} from './supply-chain-optimizer.service';
import Redis from 'ioredis';

describe('SupplyChainOptimizerService', () => {
  let service: SupplyChainOptimizerService;
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
          'ai.caching.cacheTimeout': 7200,
        };
        return config[key] || defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplyChainOptimizerService,
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

    service = module.get<SupplyChainOptimizerService>(SupplyChainOptimizerService);
  });

  const createValidRequest = (): SupplyChainOptimizationRequestDto => ({
    products: [
      {
        id: 'product-1',
        name: 'Test Product 1',
        category: 'Electronics',
        demandForecast: [100, 120, 110, 130],
        currentStock: 50,
        unitCost: 25,
        leadTime: 7,
        minOrderQuantity: 10,
        maxOrderQuantity: 1000,
      },
      {
        id: 'product-2',
        name: 'Test Product 2',
        category: 'Electronics',
        demandForecast: [80, 90, 85, 95],
        currentStock: 30,
        unitCost: 15,
        leadTime: 5,
      },
    ],
    suppliers: [
      {
        id: 'supplier-1',
        name: 'Test Supplier 1',
        location: 'Asia',
        capacity: 500,
        leadTime: 14,
        reliability: 0.9,
        costPerUnit: 20,
        qualityRating: 8.5,
        sustainabilityScore: 75,
      },
      {
        id: 'supplier-2',
        name: 'Test Supplier 2',
        location: 'Europe',
        capacity: 300,
        leadTime: 10,
        reliability: 0.95,
        costPerUnit: 22,
        qualityRating: 9.0,
        sustainabilityScore: 85,
      },
    ],
    strategy: OptimizationStrategy.BALANCED,
    planningHorizon: 90,
    riskTolerance: 0.3,
    budget: 50000,
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('optimizeSupplyChain', () => {
    it('should successfully optimize supply chain', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null); // No cache

      const result = await service.optimizeSupplyChain(request);

      expect(result).toBeDefined();
      expect(result.strategy).toBe(OptimizationStrategy.BALANCED);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(result.kpis).toBeDefined();
      expect(result.alternativeScenarios).toBeInstanceOf(Array);
      expect(result.insights).toBeDefined();
    });

    it('should return cached result when available', async () => {
      const request = createValidRequest();

      const cachedResult = {
        strategy: OptimizationStrategy.BALANCED,
        recommendations: [],
        summary: {
          totalCost: 10000,
          totalLeadTime: 12,
          averageRisk: 0.2,
          costSavings: 1000,
          expectedServiceLevel: 0.95,
          sustainabilityScore: 80,
        },
        kpis: {
          inventoryTurnover: 4,
          fillRate: 0.95,
          costPerUnit: 20,
          supplierDiversification: 0.5,
          onTimeDeliveryRate: 0.9,
          qualityScore: 8.75,
        },
        alternativeScenarios: [],
        insights: {
          bottlenecks: [],
          opportunities: [],
          risks: [],
          recommendations: [],
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.optimizeSupplyChain(request);

      expect(result.strategy).toBe(cachedResult.strategy);
      expect(result.summary.totalCost).toBe(cachedResult.summary.totalCost);
    });

    it('should validate input parameters', async () => {
      const invalidRequest = {
        products: [], // Empty products array
        suppliers: [],
      };

      await expect(service.optimizeSupplyChain(invalidRequest as any)).rejects.toThrow();
    });

    it('should optimize for different strategies', async () => {
      const strategies = [
        OptimizationStrategy.COST_MINIMIZATION,
        OptimizationStrategy.RISK_MINIMIZATION,
        OptimizationStrategy.TIME_MINIMIZATION,
        OptimizationStrategy.SUSTAINABILITY,
      ];

      for (const strategy of strategies) {
        const request = createValidRequest();
        request.strategy = strategy;

        mockRedis.get.mockResolvedValue(null);

        const result = await service.optimizeSupplyChain(request);

        expect(result.strategy).toBe(strategy);
        expect(result.recommendations).toBeInstanceOf(Array);
      }
    });

    it('should provide supplier recommendations with risk factors', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizeSupplyChain(request);

      result.recommendations.forEach(recommendation => {
        expect(recommendation.supplierId).toBeDefined();
        expect(recommendation.productId).toBeDefined();
        expect(recommendation.recommendedQuantity).toBeGreaterThan(0);
        expect(recommendation.orderDate).toBeInstanceOf(Date);
        expect(recommendation.expectedDeliveryDate).toBeInstanceOf(Date);
        expect(recommendation.totalCost).toBeGreaterThan(0);
        expect(recommendation.confidenceScore).toBeGreaterThan(0);
        expect(recommendation.confidenceScore).toBeLessThanOrEqual(1);
        expect(recommendation.reasoning).toBeInstanceOf(Array);
        expect(recommendation.riskFactors).toBeInstanceOf(Array);
      });
    });

    it('should calculate meaningful KPIs', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizeSupplyChain(request);

      expect(result.kpis.inventoryTurnover).toBeGreaterThan(0);
      expect(result.kpis.fillRate).toBeGreaterThan(0);
      expect(result.kpis.fillRate).toBeLessThanOrEqual(1);
      expect(result.kpis.costPerUnit).toBeGreaterThan(0);
      expect(result.kpis.supplierDiversification).toBeGreaterThan(0);
      expect(result.kpis.supplierDiversification).toBeLessThanOrEqual(1);
      expect(result.kpis.onTimeDeliveryRate).toBeGreaterThan(0);
      expect(result.kpis.onTimeDeliveryRate).toBeLessThanOrEqual(1);
      expect(result.kpis.qualityScore).toBeGreaterThan(0);
    });

    it('should provide alternative scenarios', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizeSupplyChain(request);

      expect(result.alternativeScenarios).toBeInstanceOf(Array);
      expect(result.alternativeScenarios.length).toBeGreaterThan(0);

      result.alternativeScenarios.forEach(scenario => {
        expect(scenario.name).toBeDefined();
        expect(scenario.strategy).toBeDefined();
        expect(scenario.estimatedCost).toBeGreaterThan(0);
        expect(scenario.estimatedRisk).toBeGreaterThanOrEqual(0);
        expect(scenario.tradeoffs).toBeInstanceOf(Array);
      });
    });
  });

  describe('updateSupplierMetrics', () => {
    it('should update supplier performance metrics', async () => {
      const supplierId = 'test-supplier';
      const metrics = {
        onTimeDeliveryRate: 0.92,
        qualityDefectRate: 0.03,
        costPerformance: 0.88,
      };

      await expect(
        service.updateSupplierMetrics(supplierId, metrics)
      ).resolves.not.toThrow();

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return service performance metrics', async () => {
      const metrics = await service.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalOptimizations).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
      expect(metrics.averageCostSavings).toBeGreaterThanOrEqual(0);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
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
      expect(health.details.models).toBeDefined();
      expect(health.details.suppliers).toBeDefined();
      expect(health.details.performance).toBeDefined();
    });

    it('should return unhealthy status when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBeDefined();
    });
  });

  describe('optimization insights', () => {
    it('should provide actionable insights', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizeSupplyChain(request);

      expect(result.insights.bottlenecks).toBeInstanceOf(Array);
      expect(result.insights.opportunities).toBeInstanceOf(Array);
      expect(result.insights.risks).toBeInstanceOf(Array);
      expect(result.insights.recommendations).toBeInstanceOf(Array);

      // Should provide at least some insights
      const totalInsights = 
        result.insights.bottlenecks.length +
        result.insights.opportunities.length +
        result.insights.risks.length +
        result.insights.recommendations.length;
      
      expect(totalInsights).toBeGreaterThan(0);
    });

    it('should identify cost savings opportunities', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizeSupplyChain(request);

      expect(result.summary.costSavings).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid supplier configurations', async () => {
      const request = createValidRequest();
      request.suppliers = []; // No suppliers

      await expect(service.optimizeSupplyChain(request)).rejects.toThrow();
    });

    it('should handle Redis failures gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      const request = createValidRequest();

      const result = await service.optimizeSupplyChain(request);
      expect(result).toBeDefined();
    });

    it('should handle optimization algorithm failures', async () => {
      const request = createValidRequest();
      // Create scenario that might cause optimization challenges
      request.suppliers.forEach(supplier => {
        supplier.capacity = 1; // Very low capacity
      });

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizeSupplyChain(request);
      expect(result).toBeDefined();
    });
  });

  describe('demand forecasting', () => {
    it('should enhance demand forecasts', async () => {
      const request = createValidRequest();
      request.products[0].demandForecast = [100, 110, 120, 130, 125]; // Growing trend

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizeSupplyChain(request);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle seasonal demand patterns', async () => {
      const request = createValidRequest();
      // Simulate seasonal pattern
      request.products[0].demandForecast = [100, 80, 60, 80, 100, 120, 140, 160, 140, 120, 100, 80];

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizeSupplyChain(request);

      expect(result).toBeDefined();
    });
  });

  describe('constraint handling', () => {
    it('should respect budget constraints', async () => {
      const request = createValidRequest();
      request.budget = 1000; // Very low budget

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizeSupplyChain(request);

      expect(result.summary.totalCost).toBeLessThanOrEqual(request.budget! * 1.1); // Allow 10% margin
    });

    it('should respect supplier capacity constraints', async () => {
      const request = createValidRequest();
      // Set very high demand
      request.products.forEach(product => {
        product.demandForecast = [10000, 10000, 10000, 10000];
      });

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizeSupplyChain(request);

      // Total recommended quantity should not exceed supplier capacities
      const totalRecommendedQuantity = result.recommendations.reduce(
        (sum, rec) => sum + rec.recommendedQuantity, 0
      );
      const totalSupplierCapacity = request.suppliers.reduce(
        (sum, supplier) => sum + supplier.capacity, 0
      );

      expect(totalRecommendedQuantity).toBeLessThanOrEqual(totalSupplierCapacity * 1.1); // Allow margin
    });
  });
});