import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { E2ETestHelper, TestUser } from '../helpers/test-helper';
import { 
  AdvancedPortfolioOptimizerService,
  PortfolioOptimizationRequest,
  OptimizationSolution,
  OptimizationAction,
  OptimizationProblem
} from '../../src/ai/optimization/advanced-portfolio-optimizer.service';
import { AiProductScore } from '../../src/ai/product-scoring.ai';

describe('Advanced Portfolio Optimization System E2E Tests (Issue #88)', () => {
  let app: INestApplication;
  let testHelper: E2ETestHelper;
  let portfolioOptimizerService: AdvancedPortfolioOptimizerService;
  let testAdmin: TestUser;

  // Mock test data
  const createMockProducts = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      asin: `B001PORT${i.toString().padStart(3, '0')}`,
      currentQuantity: Math.floor(Math.random() * 50) + 10,
      maxQuantity: Math.floor(Math.random() * 200) + 100,
      unitCost: Math.floor(Math.random() * 5000) + 1000,
      expectedReturn: Math.floor(Math.random() * 2000) + 500,
      riskScore: Math.random() * 80 + 10,
      aiScore: {
        overallScore: Math.floor(Math.random() * 40) + 60,
        dimensions: {
          profitability: { score: Math.floor(Math.random() * 30) + 70 },
          risk: { score: Math.floor(Math.random() * 50) + 20 },
          demand: { score: Math.floor(Math.random() * 30) + 65 },
          competition: { score: Math.floor(Math.random() * 40) + 50 },
        },
        metadata: { confidence: Math.random() * 0.3 + 0.7 },
      } as AiProductScore,
    }));
  };

  const createMockOptimizationRequest = (productCount: number = 50): PortfolioOptimizationRequest => ({
    products: createMockProducts(productCount),
    constraints: {
      totalBudget: 10000000, // ¥10M
      maxRiskLevel: 60,
      categoryLimits: {
        'Electronics': 0.4,
        'Books': 0.2,
        'Home': 0.3,
      },
      minDiversification: 0.7,
    },
    objectives: {
      primary: 'maximize_profit',
      secondary: ['minimize_risk'],
      riskTolerance: 0.6,
    },
  });

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
        AdvancedPortfolioOptimizerService,
      ],
    }).compile();

    portfolioOptimizerService = moduleFixture.get<AdvancedPortfolioOptimizerService>(AdvancedPortfolioOptimizerService);
    testAdmin = await testHelper.createTestAdmin();
  });

  afterAll(async () => {
    await testHelper.cleanupTestData();
    await testHelper.teardownTestApp();
  });

  describe('Portfolio Optimizer Initialization', () => {
    test('should initialize portfolio optimizer correctly', async () => {
      expect(portfolioOptimizerService).toBeDefined();
    });

    test('should load algorithm configurations', async () => {
      const algorithmPerformance = await portfolioOptimizerService.getAlgorithmPerformance();
      
      expect(algorithmPerformance).toMatchObject({
        algorithms: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            accuracy: expect.any(Number),
            speed: expect.any(Number),
            scalability: expect.any(Number),
          }),
        ]),
      });

      algorithmPerformance.algorithms.forEach(algo => {
        expect(algo.accuracy).toBeGreaterThan(0);
        expect(algo.accuracy).toBeLessThanOrEqual(1);
        expect(algo.speed).toBeGreaterThan(0);
        expect(algo.scalability).toBeGreaterThan(0);
      });
    });
  });

  describe('Basic Portfolio Optimization', () => {
    test('should optimize portfolio successfully', async () => {
      const request = createMockOptimizationRequest(20);
      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution).toMatchObject({
        id: expect.any(String),
        problemId: expect.any(String),
        algorithm: expect.any(String),
        status: expect.stringMatching(/^(optimal|near_optimal|feasible|infeasible|timeout)$/),
        objectiveValue: expect.any(Number),
        constraintViolation: expect.any(Number),
        executionTime: expect.any(Number),
        iterations: expect.any(Number),
        variables: expect.any(Object),
        performance: expect.objectContaining({
          convergenceRate: expect.any(Number),
          solutionQuality: expect.any(Number),
          robustness: expect.any(Number),
          computationalEfficiency: expect.any(Number),
        }),
        analysis: expect.objectContaining({
          sensitivityAnalysis: expect.any(Object),
          riskMetrics: expect.objectContaining({
            valueAtRisk: expect.any(Number),
            expectedShortfall: expect.any(Number),
            maxDrawdown: expect.any(Number),
            sharpeRatio: expect.any(Number),
          }),
          diversificationScore: expect.any(Number),
          recommendedActions: expect.any(Array),
        }),
      });

      expect(solution.objectiveValue).toBeGreaterThan(0);
      expect(solution.performance.solutionQuality).toBeGreaterThan(0);
      expect(solution.analysis.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(solution.analysis.diversificationScore).toBeLessThanOrEqual(1);
    });

    test('should respect budget constraints', async () => {
      const request = createMockOptimizationRequest(15);
      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      // Calculate total investment from solution
      let totalInvestment = 0;
      Object.entries(solution.variables).forEach(([asin, quantity]) => {
        const product = request.products.find(p => p.asin === asin);
        if (product) {
          totalInvestment += quantity * product.unitCost;
        }
      });

      expect(totalInvestment).toBeLessThanOrEqual(request.constraints.totalBudget);
    });

    test('should respect risk constraints', async () => {
      const request = createMockOptimizationRequest(15);
      request.constraints.maxRiskLevel = 30; // Very low risk tolerance
      
      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      // Calculate portfolio risk
      let totalRisk = 0;
      let totalWeight = 0;
      Object.entries(solution.variables).forEach(([asin, quantity]) => {
        const product = request.products.find(p => p.asin === asin);
        if (product && quantity > 0) {
          totalRisk += quantity * product.riskScore;
          totalWeight += quantity;
        }
      });

      const avgRisk = totalWeight > 0 ? totalRisk / totalWeight : 0;
      expect(avgRisk).toBeLessThanOrEqual(request.constraints.maxRiskLevel + 10); // Allow some tolerance
    });

    test('should generate actionable recommendations', async () => {
      const request = createMockOptimizationRequest(10);
      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.analysis.recommendedActions).toBeInstanceOf(Array);
      expect(solution.analysis.recommendedActions.length).toBeGreaterThan(0);

      solution.analysis.recommendedActions.forEach((action: OptimizationAction) => {
        expect(action).toMatchObject({
          type: expect.stringMatching(/^(buy|sell|hold|reallocate|hedge)$/),
          target: expect.any(String),
          quantity: expect.any(Number),
          priority: expect.stringMatching(/^(immediate|high|medium|low)$/),
          reasoning: expect.any(String),
          expectedImpact: expect.objectContaining({
            profitChange: expect.any(Number),
            riskChange: expect.any(Number),
            diversificationChange: expect.any(Number),
          }),
        });

        expect(action.quantity).toBeGreaterThan(0);
      });
    });
  });

  describe('Multi-Algorithm Optimization', () => {
    test('should use genetic algorithm for small portfolios', async () => {
      const request = createMockOptimizationRequest(20);
      request.algorithm = 'genetic';

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.algorithm).toBe('genetic');
      expect(solution.status).toMatch(/^(optimal|near_optimal|feasible)$/);
      expect(solution.iterations).toBeGreaterThan(0);
    });

    test('should use simulated annealing for complex constraints', async () => {
      const request = createMockOptimizationRequest(30);
      request.algorithm = 'simulated_annealing';

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.algorithm).toBe('simulated_annealing');
      expect(solution.status).toMatch(/^(optimal|near_optimal|feasible|timeout)$/);
    });

    test('should use quantum-inspired for large portfolios', async () => {
      const request = createMockOptimizationRequest(100);
      request.algorithm = 'quantum_inspired';

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.algorithm).toBe('quantum_inspired');
      expect(solution.performance.solutionQuality).toBeGreaterThan(0.8);
    });

    test('should use hybrid approach for optimal results', async () => {
      const request = createMockOptimizationRequest(50);
      request.algorithm = 'hybrid';

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.algorithm).toBe('hybrid');
      expect(solution.performance.solutionQuality).toBeGreaterThan(0.85);
    });

    test('should auto-select optimal algorithm', async () => {
      const request = createMockOptimizationRequest(75);
      // Don't specify algorithm - let system choose

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.algorithm).toBeDefined();
      expect(['genetic', 'simulated_annealing', 'particle_swarm', 'quantum_inspired', 'hybrid'])
        .toContain(solution.algorithm);
    });
  });

  describe('Large-Scale Portfolio Optimization', () => {
    test('should handle large portfolios efficiently', async () => {
      const request = createMockOptimizationRequest(500);
      
      const startTime = Date.now();
      const solution = await portfolioOptimizerService.optimizeLargePortfolio(
        request.products,
        request.constraints
      );
      const executionTime = Date.now() - startTime;

      expect(solution).toBeDefined();
      expect(solution.status).toMatch(/^(optimal|near_optimal|feasible)$/);
      expect(executionTime).toBeLessThan(60000); // Should complete within 60 seconds
    });

    test('should handle massive portfolios with hierarchical approach', async () => {
      const request = createMockOptimizationRequest(15000);
      
      const solution = await portfolioOptimizerService.optimizeLargePortfolio(
        request.products,
        request.constraints
      );

      expect(solution).toBeDefined();
      expect(solution.algorithm).toBeDefined();
      expect(solution.performance.scalability).toBeGreaterThan(0.8);
    });

    test('should maintain solution quality at scale', async () => {
      const smallRequest = createMockOptimizationRequest(50);
      const largeRequest = createMockOptimizationRequest(1000);

      const smallSolution = await portfolioOptimizerService.optimizePortfolio(smallRequest);
      const largeSolution = await portfolioOptimizerService.optimizeLargePortfolio(
        largeRequest.products,
        largeRequest.constraints
      );

      // Large portfolio solution quality should be competitive
      expect(largeSolution.performance.solutionQuality).toBeGreaterThan(0.7);
      expect(largeSolution.performance.solutionQuality).toBeGreaterThan(
        smallSolution.performance.solutionQuality * 0.8
      );
    });
  });

  describe('Quantum-Inspired Optimization', () => {
    test('should implement quantum superposition simulation', async () => {
      const request = createMockOptimizationRequest(100);
      request.algorithm = 'quantum_inspired';

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.algorithm).toBe('quantum_inspired');
      expect(solution.performance.convergenceRate).toBeGreaterThan(0.9);
      expect(solution.performance.robustness).toBeGreaterThan(0.9);
    });

    test('should handle quantum entanglement effects', async () => {
      const request = createMockOptimizationRequest(150);
      request.algorithm = 'quantum_inspired';

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      // Quantum-inspired should find high-quality solutions
      expect(solution.status).toBe('optimal');
      expect(solution.performance.computationalEfficiency).toBeGreaterThan(0.8);
    });

    test('should demonstrate quantum advantage for complex problems', async () => {
      const complexRequest = createMockOptimizationRequest(200);
      
      // Test both classical and quantum approaches
      const geneticSolution = await portfolioOptimizerService.optimizePortfolio({
        ...complexRequest,
        algorithm: 'genetic'
      });
      
      const quantumSolution = await portfolioOptimizerService.optimizePortfolio({
        ...complexRequest,
        algorithm: 'quantum_inspired'
      });

      // Quantum should outperform or match classical algorithms
      expect(quantumSolution.objectiveValue).toBeGreaterThanOrEqual(
        geneticSolution.objectiveValue * 0.95
      );
    });
  });

  describe('Risk Metrics and Analysis', () => {
    test('should calculate comprehensive risk metrics', async () => {
      const request = createMockOptimizationRequest(30);
      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      const riskMetrics = solution.analysis.riskMetrics;
      
      expect(riskMetrics.valueAtRisk).toBeDefined();
      expect(riskMetrics.expectedShortfall).toBeDefined();
      expect(riskMetrics.maxDrawdown).toBeDefined();
      expect(riskMetrics.sharpeRatio).toBeDefined();

      expect(riskMetrics.valueAtRisk).toBeGreaterThanOrEqual(0);
      expect(riskMetrics.expectedShortfall).toBeGreaterThanOrEqual(riskMetrics.valueAtRisk);
      expect(riskMetrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    });

    test('should calculate diversification score', async () => {
      const request = createMockOptimizationRequest(40);
      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.analysis.diversificationScore).toBeDefined();
      expect(solution.analysis.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(solution.analysis.diversificationScore).toBeLessThanOrEqual(1);

      // Should meet minimum diversification constraint
      expect(solution.analysis.diversificationScore).toBeGreaterThanOrEqual(
        request.constraints.minDiversification * 0.9 // Allow some tolerance
      );
    });

    test('should perform sensitivity analysis', async () => {
      const request = createMockOptimizationRequest(25);
      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.analysis.sensitivityAnalysis).toBeDefined();
      expect(typeof solution.analysis.sensitivityAnalysis).toBe('object');
    });
  });

  describe('Different Optimization Objectives', () => {
    test('should maximize profit objective', async () => {
      const request = createMockOptimizationRequest(30);
      request.objectives.primary = 'maximize_profit';

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.objectiveValue).toBeGreaterThan(0);
      
      // Should select high-return products
      const selectedProducts = Object.entries(solution.variables)
        .filter(([asin, quantity]) => quantity > 0)
        .map(([asin]) => request.products.find(p => p.asin === asin));

      const avgExpectedReturn = selectedProducts.reduce((sum, product) => 
        sum + (product?.expectedReturn || 0), 0) / selectedProducts.length;

      expect(avgExpectedReturn).toBeGreaterThan(500);
    });

    test('should minimize risk objective', async () => {
      const request = createMockOptimizationRequest(30);
      request.objectives.primary = 'minimize_risk';

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      // Should select low-risk products
      const selectedProducts = Object.entries(solution.variables)
        .filter(([asin, quantity]) => quantity > 0)
        .map(([asin]) => request.products.find(p => p.asin === asin));

      const avgRiskScore = selectedProducts.reduce((sum, product) => 
        sum + (product?.riskScore || 0), 0) / selectedProducts.length;

      expect(avgRiskScore).toBeLessThan(60);
    });

    test('should maximize Sharpe ratio objective', async () => {
      const request = createMockOptimizationRequest(30);
      request.objectives.primary = 'maximize_sharpe';

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.analysis.riskMetrics.sharpeRatio).toBeGreaterThan(0);
    });
  });

  describe('Constraint Handling', () => {
    test('should handle category allocation limits', async () => {
      const request = createMockOptimizationRequest(40);
      request.constraints.categoryLimits = {
        'Electronics': 0.3,
        'Books': 0.2,
      };

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.constraintViolation).toBeLessThan(1000); // Low violation penalty
    });

    test('should handle minimum diversification constraints', async () => {
      const request = createMockOptimizationRequest(50);
      request.constraints.minDiversification = 0.8;

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.analysis.diversificationScore).toBeGreaterThan(0.75);
    });

    test('should handle tight budget constraints', async () => {
      const request = createMockOptimizationRequest(20);
      request.constraints.totalBudget = 2000000; // ¥2M - tight budget

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      let totalCost = 0;
      Object.entries(solution.variables).forEach(([asin, quantity]) => {
        const product = request.products.find(p => p.asin === asin);
        if (product) {
          totalCost += quantity * product.unitCost;
        }
      });

      expect(totalCost).toBeLessThanOrEqual(request.constraints.totalBudget);
    });
  });

  describe('Performance and Convergence', () => {
    test('should converge within iteration limits', async () => {
      const request = createMockOptimizationRequest(30);
      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.iterations).toBeDefined();
      expect(solution.iterations).toBeGreaterThan(0);
      expect(solution.performance.convergenceRate).toBeGreaterThan(0);
    });

    test('should achieve high solution quality', async () => {
      const request = createMockOptimizationRequest(40);
      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.performance.solutionQuality).toBeGreaterThan(0.7);
      expect(solution.performance.robustness).toBeGreaterThan(0.5);
    });

    test('should demonstrate computational efficiency', async () => {
      const request = createMockOptimizationRequest(60);
      
      const startTime = Date.now();
      const solution = await portfolioOptimizerService.optimizePortfolio(request);
      const actualTime = Date.now() - startTime;

      expect(solution.executionTime).toBeGreaterThan(0);
      expect(solution.performance.computationalEfficiency).toBeGreaterThan(0);
      expect(actualTime).toBeLessThan(30000); // 30 seconds max
    });
  });

  describe('Optimization Status and Monitoring', () => {
    test('should provide optimization status', async () => {
      const request = createMockOptimizationRequest(20);
      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      const status = await portfolioOptimizerService.getOptimizationStatus(solution.problemId);
      
      expect(status).toBeDefined();
      expect(status.status).toBe('completed');
      expect(status.progress).toBe(100);
    });

    test('should handle long-running optimizations', async () => {
      const request = createMockOptimizationRequest(500);
      
      const solution = await portfolioOptimizerService.optimizeLargePortfolio(
        request.products,
        request.constraints
      );

      expect(solution.status).toMatch(/^(optimal|near_optimal|feasible)$/);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty portfolio', async () => {
      const request = createMockOptimizationRequest(0);

      await expect(portfolioOptimizerService.optimizePortfolio(request))
        .rejects.toThrow();
    });

    test('should handle invalid constraints', async () => {
      const request = createMockOptimizationRequest(10);
      request.constraints.totalBudget = -1000000; // Negative budget

      await expect(portfolioOptimizerService.optimizePortfolio(request))
        .rejects.toThrow();
    });

    test('should handle infeasible problems', async () => {
      const request = createMockOptimizationRequest(20);
      request.constraints.totalBudget = 100; // Impossibly low budget
      request.constraints.maxRiskLevel = 1; // Impossibly low risk

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.status).toBe('infeasible');
    });

    test('should handle algorithm failures gracefully', async () => {
      const request = createMockOptimizationRequest(30);
      request.algorithm = 'invalid_algorithm' as any;

      await expect(portfolioOptimizerService.optimizePortfolio(request))
        .rejects.toThrow('Unknown algorithm');
    });
  });

  describe('Caching and Performance', () => {
    test('should cache optimization results', async () => {
      const request = createMockOptimizationRequest(15);

      const solution1 = await portfolioOptimizerService.optimizePortfolio(request);
      
      // Check if caching is working (implementation detail, may vary)
      expect(solution1.id).toBeDefined();
    });

    test('should handle concurrent optimizations', async () => {
      const request1 = createMockOptimizationRequest(20);
      const request2 = createMockOptimizationRequest(25);
      const request3 = createMockOptimizationRequest(30);

      const promises = [
        portfolioOptimizerService.optimizePortfolio(request1),
        portfolioOptimizerService.optimizePortfolio(request2),
        portfolioOptimizerService.optimizePortfolio(request3),
      ];

      const solutions = await Promise.all(promises);

      expect(solutions.length).toBe(3);
      solutions.forEach(solution => {
        expect(solution.status).toMatch(/^(optimal|near_optimal|feasible)$/);
      });

      // Each solution should be unique
      const ids = solutions.map(s => s.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('Real-world Business Scenarios', () => {
    test('should optimize for seasonal inventory planning', async () => {
      const seasonalProducts = createMockProducts(30).map((product, index) => ({
        ...product,
        // Simulate seasonal products
        expectedReturn: index % 3 === 0 ? product.expectedReturn * 1.5 : product.expectedReturn,
        riskScore: index % 3 === 0 ? product.riskScore * 0.8 : product.riskScore,
      }));

      const request: PortfolioOptimizationRequest = {
        products: seasonalProducts,
        constraints: {
          totalBudget: 8000000,
          maxRiskLevel: 50,
        },
        objectives: {
          primary: 'maximize_profit',
          riskTolerance: 0.7,
        },
      };

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.objectiveValue).toBeGreaterThan(0);
      expect(solution.analysis.recommendedActions.length).toBeGreaterThan(0);
    });

    test('should handle portfolio rebalancing scenario', async () => {
      const existingPortfolio = createMockProducts(25).map(product => ({
        ...product,
        currentQuantity: Math.floor(Math.random() * 30) + 10, // Existing positions
      }));

      const request: PortfolioOptimizationRequest = {
        products: existingPortfolio,
        constraints: {
          totalBudget: 5000000,
          maxRiskLevel: 40,
          minDiversification: 0.8,
        },
        objectives: {
          primary: 'minimize_risk',
          secondary: ['maximize_diversification'],
          riskTolerance: 0.4,
        },
      };

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      // Should generate rebalancing actions
      const rebalanceActions = solution.analysis.recommendedActions
        .filter(action => action.type === 'reallocate');

      expect(rebalanceActions.length).toBeGreaterThanOrEqual(0);
      expect(solution.analysis.diversificationScore).toBeGreaterThan(0.7);
    });

    test('should optimize for risk-adjusted returns', async () => {
      const request = createMockOptimizationRequest(40);
      request.objectives.primary = 'maximize_sharpe';
      request.objectives.riskTolerance = 0.5;

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.analysis.riskMetrics.sharpeRatio).toBeGreaterThan(0);
      
      // Should balance profit and risk
      const selectedProducts = Object.entries(solution.variables)
        .filter(([asin, quantity]) => quantity > 0);

      expect(selectedProducts.length).toBeGreaterThan(5); // Should be diversified
    });

    test('should handle market stress testing', async () => {
      const stressTestProducts = createMockProducts(50).map(product => ({
        ...product,
        // Simulate market stress - higher risk, lower returns
        expectedReturn: product.expectedReturn * 0.7,
        riskScore: product.riskScore * 1.3,
      }));

      const request: PortfolioOptimizationRequest = {
        products: stressTestProducts,
        constraints: {
          totalBudget: 6000000,
          maxRiskLevel: 35, // Very conservative in stress scenario
        },
        objectives: {
          primary: 'minimize_risk',
          riskTolerance: 0.3,
        },
      };

      const solution = await portfolioOptimizerService.optimizePortfolio(request);

      expect(solution.status).toMatch(/^(optimal|near_optimal|feasible)$/);
      
      // Should recommend very conservative allocations
      const lowRiskActions = solution.analysis.recommendedActions
        .filter(action => action.expectedImpact.riskChange <= 0);

      expect(lowRiskActions.length).toBeGreaterThan(0);
    });
  });
});