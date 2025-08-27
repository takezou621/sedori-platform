import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
// Redis token is provided directly in the test
import { 
  AdvancedPortfolioOptimizerService, 
  PortfolioOptimizationRequestDto,
  OptimizationObjective 
} from './advanced-portfolio-optimizer.service';
import Redis from 'ioredis';

describe('AdvancedPortfolioOptimizerService', () => {
  let service: AdvancedPortfolioOptimizerService;
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
        AdvancedPortfolioOptimizerService,
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

    service = module.get<AdvancedPortfolioOptimizerService>(AdvancedPortfolioOptimizerService);
  });

  const createValidRequest = (): PortfolioOptimizationRequestDto => ({
    portfolioId: 'test-portfolio-1',
    assets: [
      {
        id: 'asset-1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        category: 'Technology',
        currentPrice: 150,
        historicalReturns: [0.02, 0.015, -0.01, 0.025, 0.01, 0.03, -0.005, 0.02, 0.015, -0.01, 0.025, 0.01],
        expectedReturn: 0.12,
        volatility: 0.2,
        marketCap: 3000000000000,
        beta: 1.2,
        currentWeight: 0.3,
      },
      {
        id: 'asset-2',
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        category: 'Technology',
        currentPrice: 2500,
        historicalReturns: [0.025, 0.01, -0.015, 0.02, 0.005, 0.035, 0.01, 0.015, 0.02, -0.005, 0.03, 0.015],
        expectedReturn: 0.14,
        volatility: 0.25,
        marketCap: 1500000000000,
        beta: 1.1,
        currentWeight: 0.25,
      },
      {
        id: 'asset-3',
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        category: 'Automotive',
        currentPrice: 800,
        historicalReturns: [0.05, -0.02, 0.03, -0.01, 0.04, -0.015, 0.025, 0.01, -0.02, 0.035, 0.02, -0.01],
        expectedReturn: 0.18,
        volatility: 0.4,
        marketCap: 800000000000,
        beta: 1.8,
        currentWeight: 0.2,
      },
      {
        id: 'asset-4',
        symbol: 'BND',
        name: 'Vanguard Total Bond Market ETF',
        category: 'Bonds',
        currentPrice: 80,
        historicalReturns: [0.005, 0.002, -0.001, 0.003, 0.001, 0.004, 0.002, 0.003, 0.001, -0.001, 0.005, 0.002],
        expectedReturn: 0.03,
        volatility: 0.05,
        marketCap: 300000000000,
        beta: 0.1,
        currentWeight: 0.25,
      },
    ],
    objective: OptimizationObjective.MAXIMIZE_SHARPE,
    investmentAmount: 100000,
    riskTolerance: 0.5,
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('optimizePortfolio', () => {
    it('should successfully optimize portfolio', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null); // No cache

      const result = await service.optimizePortfolio(request);

      expect(result).toBeDefined();
      expect(result.portfolioId).toBe(request.portfolioId);
      expect(result.objective).toBe(OptimizationObjective.MAXIMIZE_SHARPE);
      expect(result.allocations).toBeInstanceOf(Array);
      expect(result.allocations).toHaveLength(4); // Same as input assets
      expect(result.riskMetrics).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();
      expect(result.optimization).toBeDefined();
      expect(result.scenarios).toBeInstanceOf(Array);
      expect(result.rebalancing).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.backtesting).toBeDefined();
    });

    it('should return cached result when available', async () => {
      const request = createValidRequest();

      const cachedResult = {
        portfolioId: 'cached-portfolio',
        objective: OptimizationObjective.MAXIMIZE_SHARPE,
        allocations: [],
        riskMetrics: {
          portfolioVolatility: 0.15,
          valueAtRisk: 0.05,
          conditionalValueAtRisk: 0.07,
          maxDrawdown: 0.12,
          betaToMarket: 1.0,
          correlationToMarket: 0.8,
          diversificationRatio: 1.2,
          concentrationRisk: 0.3,
          trackingError: 0.02,
          informationRatio: 0.5,
        },
        performanceMetrics: {
          expectedReturn: 0.1,
          realizedReturn: 0.09,
          volatility: 0.15,
          sharpeRatio: 0.6,
          sortinoRatio: 0.8,
          calmarRatio: 0.7,
          maxDrawdown: 0.12,
          winRate: 0.6,
          profitFactor: 1.5,
          averageWin: 0.02,
          averageLoss: -0.015,
        },
        optimization: {
          iterations: 1000,
          convergenceScore: 0.95,
          optimizationTime: 2500,
          objectiveValue: 0.6,
          constraintsSatisfied: true,
        },
        scenarios: [],
        rebalancing: {
          frequency: 21,
          nextRebalanceDate: new Date(),
          expectedCost: 50,
          recommendations: [],
        },
        insights: {
          strengths: [],
          weaknesses: [],
          opportunities: [],
          threats: [],
          recommendations: [],
        },
        backtesting: {
          period: '5 years',
          totalReturn: 0.85,
          annualizedReturn: 0.131,
          sharpeRatio: 1.15,
          maxDrawdown: 0.18,
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.optimizePortfolio(request);

      expect(result.portfolioId).toBe(cachedResult.portfolioId);
    });

    it('should validate input parameters', async () => {
      const invalidRequest = {
        assets: [], // Empty assets array
      };

      await expect(service.optimizePortfolio(invalidRequest as any)).rejects.toThrow();
    });

    it('should optimize for different objectives', async () => {
      const objectives = [
        OptimizationObjective.MAXIMIZE_RETURN,
        OptimizationObjective.MINIMIZE_RISK,
        OptimizationObjective.TARGET_RETURN,
        OptimizationObjective.EQUAL_WEIGHT,
      ];

      for (const objective of objectives) {
        const request = createValidRequest();
        request.objective = objective;
        if (objective === OptimizationObjective.TARGET_RETURN) {
          request.targetReturn = 0.10;
        }

        mockRedis.get.mockResolvedValue(null);

        const result = await service.optimizePortfolio(request);

        expect(result.objective).toBe(objective);
        expect(result.allocations).toBeInstanceOf(Array);
      }
    });

    it('should provide proper asset allocations', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);

      result.allocations.forEach(allocation => {
        expect(allocation.assetId).toBeDefined();
        expect(allocation.symbol).toBeDefined();
        expect(allocation.name).toBeDefined();
        expect(allocation.recommendedWeight).toBeGreaterThanOrEqual(0);
        expect(allocation.recommendedWeight).toBeLessThanOrEqual(1);
        expect(allocation.targetValue).toBeGreaterThanOrEqual(0);
        expect(allocation.expectedReturn).toBeGreaterThan(-1);
        expect(allocation.riskContribution).toBeGreaterThanOrEqual(0);
        expect(allocation.reasoning).toBeInstanceOf(Array);
      });

      // Total weights should sum to approximately 1
      const totalWeight = result.allocations.reduce((sum, alloc) => sum + alloc.recommendedWeight, 0);
      expect(totalWeight).toBeCloseTo(1, 2);
    });

    it('should calculate comprehensive risk metrics', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);

      expect(result.riskMetrics.portfolioVolatility).toBeGreaterThan(0);
      expect(result.riskMetrics.valueAtRisk).toBeGreaterThan(0);
      expect(result.riskMetrics.conditionalValueAtRisk).toBeGreaterThan(0);
      expect(result.riskMetrics.maxDrawdown).toBeGreaterThan(0);
      expect(result.riskMetrics.betaToMarket).toBeGreaterThan(0);
      expect(result.riskMetrics.correlationToMarket).toBeGreaterThan(-1);
      expect(result.riskMetrics.correlationToMarket).toBeLessThan(1);
      expect(result.riskMetrics.diversificationRatio).toBeGreaterThan(0);
      expect(result.riskMetrics.concentrationRisk).toBeGreaterThan(0);
      expect(result.riskMetrics.concentrationRisk).toBeLessThanOrEqual(1);
    });

    it('should provide performance metrics', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);

      expect(result.performanceMetrics.expectedReturn).toBeGreaterThan(-1);
      expect(result.performanceMetrics.volatility).toBeGreaterThan(0);
      expect(result.performanceMetrics.sharpeRatio).toBeGreaterThan(-5); // Can be negative
      expect(result.performanceMetrics.sortinoRatio).toBeGreaterThan(-5);
      expect(result.performanceMetrics.winRate).toBeGreaterThan(0);
      expect(result.performanceMetrics.winRate).toBeLessThanOrEqual(1);
    });

    it('should provide scenario analysis', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);

      expect(result.scenarios).toBeInstanceOf(Array);
      expect(result.scenarios.length).toBeGreaterThan(0);

      result.scenarios.forEach(scenario => {
        expect(scenario.name).toBeDefined();
        expect(scenario.probability).toBeGreaterThan(0);
        expect(scenario.probability).toBeLessThanOrEqual(1);
        expect(scenario.expectedReturn).toBeGreaterThan(-1);
        expect(scenario.portfolioValue).toBeGreaterThan(0);
      });

      // Should have marked worst and best cases
      const worstCase = result.scenarios.find(s => s.worstCase);
      const bestCase = result.scenarios.find(s => s.bestCase);
      expect(worstCase || bestCase).toBeDefined(); // At least one should be marked
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return service performance metrics', async () => {
      const metrics = await service.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalOptimizations).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
      expect(metrics.averageImprovement).toBeGreaterThanOrEqual(0);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('getMarketRegimes', () => {
    it('should return market regime analysis', async () => {
      const regimes = await service.getMarketRegimes();

      expect(regimes).toBeInstanceOf(Array);
      expect(regimes.length).toBeGreaterThan(0);

      regimes.forEach(regime => {
        expect(['bull', 'bear', 'sideways', 'volatile']).toContain(regime.regime);
        expect(regime.probability).toBeGreaterThan(0);
        expect(regime.probability).toBeLessThanOrEqual(1);
        expect(regime.expectedDuration).toBeGreaterThan(0);
        expect(regime.characteristics).toBeDefined();
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are working', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.redis).toBe('connected');
      expect(health.details.circuit).toBeDefined();
      expect(health.details.marketData).toBeDefined();
      expect(health.details.performance).toBeDefined();
    });

    it('should return unhealthy status when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBeDefined();
    });
  });

  describe('portfolio insights', () => {
    it('should provide SWOT analysis', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);

      expect(result.insights.strengths).toBeInstanceOf(Array);
      expect(result.insights.weaknesses).toBeInstanceOf(Array);
      expect(result.insights.opportunities).toBeInstanceOf(Array);
      expect(result.insights.threats).toBeInstanceOf(Array);
      expect(result.insights.recommendations).toBeInstanceOf(Array);

      // Should provide meaningful insights
      const totalInsights = 
        result.insights.strengths.length +
        result.insights.weaknesses.length +
        result.insights.opportunities.length +
        result.insights.threats.length +
        result.insights.recommendations.length;
      
      expect(totalInsights).toBeGreaterThan(0);
    });

    it('should provide rebalancing recommendations', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);

      expect(result.rebalancing.frequency).toBeGreaterThan(0);
      expect(result.rebalancing.nextRebalanceDate).toBeInstanceOf(Date);
      expect(result.rebalancing.expectedCost).toBeGreaterThanOrEqual(0);
      expect(result.rebalancing.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('error handling', () => {
    it('should handle insufficient historical data', async () => {
      const request = createValidRequest();
      request.assets[0].historicalReturns = [0.01]; // Only one data point

      await expect(service.optimizePortfolio(request)).rejects.toThrow();
    });

    it('should handle Redis failures gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      const request = createValidRequest();

      const result = await service.optimizePortfolio(request);
      expect(result).toBeDefined();
    });

    it('should handle optimization convergence issues', async () => {
      const request = createValidRequest();
      // Create scenario that might cause convergence issues
      request.assets.forEach(asset => {
        asset.volatility = 0; // Zero volatility might cause issues
      });

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);
      expect(result).toBeDefined();
    });
  });

  describe('constraint handling', () => {
    it('should respect weight constraints', async () => {
      const request = createValidRequest();
      request.assets[0].minWeight = 0.1;
      request.assets[0].maxWeight = 0.4;

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);

      const allocation = result.allocations.find(a => a.assetId === 'asset-1');
      expect(allocation).toBeDefined();
      expect(allocation!.recommendedWeight).toBeGreaterThanOrEqual(0.1 - 0.01); // Small margin
      expect(allocation!.recommendedWeight).toBeLessThanOrEqual(0.4 + 0.01); // Small margin
    });

    it('should handle short selling constraints', async () => {
      const request = createValidRequest();
      request.allowShortSelling = false;

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);

      result.allocations.forEach(allocation => {
        expect(allocation.recommendedWeight).toBeGreaterThanOrEqual(0);
      });
    });

    it('should respect target return constraints', async () => {
      const request = createValidRequest();
      request.objective = OptimizationObjective.TARGET_RETURN;
      request.targetReturn = 0.10;

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);

      // Expected return should be close to target
      expect(result.performanceMetrics.expectedReturn).toBeCloseTo(0.10, 1);
    });
  });

  describe('backtesting', () => {
    it('should provide backtesting results', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.optimizePortfolio(request);

      expect(result.backtesting.period).toBeDefined();
      expect(result.backtesting.totalReturn).toBeGreaterThan(-1);
      expect(result.backtesting.annualizedReturn).toBeGreaterThan(-1);
      expect(result.backtesting.sharpeRatio).toBeGreaterThan(-5);
      expect(result.backtesting.maxDrawdown).toBeGreaterThan(0);
      
      if (result.backtesting.benchmark) {
        expect(result.backtesting.benchmark.name).toBeDefined();
        expect(result.backtesting.benchmark.return).toBeGreaterThan(-1);
        expect(result.backtesting.benchmark.alpha).toBeDefined();
        expect(result.backtesting.benchmark.beta).toBeGreaterThan(0);
      }
    });
  });
});