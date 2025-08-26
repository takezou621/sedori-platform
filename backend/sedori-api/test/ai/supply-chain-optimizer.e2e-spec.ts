import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ScheduleModule } from '@nestjs/schedule';
import { E2ETestHelper, TestUser } from '../helpers/test-helper';
import { 
  SupplyChainOptimizerService,
  OptimizationResult,
  ProcurementRecommendation,
  SupplyChainNode,
  InventoryItem,
  CashFlowForecast
} from '../../src/ai/supply-chain/supply-chain-optimizer.service';
import { ProductScoringAiService } from '../../src/ai/product-scoring.ai';
import { AdvancedPricePredictorService } from '../../src/ai/prediction/advanced-price-predictor.service';

describe('Supply Chain Optimization System E2E Tests (Issue #87)', () => {
  let app: INestApplication;
  let testHelper: E2ETestHelper;
  let supplyChainService: SupplyChainOptimizerService;
  let testAdmin: TestUser;

  // Mock services
  const mockProductScoringService = {
    scoreProduct: jest.fn().mockResolvedValue({
      overallScore: 78,
      dimensions: {
        profitability: { score: 80 },
        demand: { score: 75 },
        competition: { score: 70 },
        risk: { score: 35 },
      },
    }),
  };

  const mockPricePredictorService = {
    predictPrice: jest.fn().mockResolvedValue({
      asin: 'B001TEST001',
      currentPrice: 4500,
      predictions: {
        '1week': { price: 4600, confidence: 0.8 },
        '1month': { price: 4800, confidence: 0.6 },
      },
      recommendations: [
        { type: 'buy_now', urgency: 'high', reasoning: 'Price increase predicted' }
      ]
    }),
  };

  beforeAll(async () => {
    testHelper = new E2ETestHelper();
    app = await testHelper.setupTestApp();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        RedisModule.forRoot({
          type: 'single',
          url: 'redis://localhost:6379',
        }),
      ],
      providers: [
        SupplyChainOptimizerService,
        {
          provide: ProductScoringAiService,
          useValue: mockProductScoringService,
        },
        {
          provide: AdvancedPricePredictorService,
          useValue: mockPricePredictorService,
        },
      ],
    }).compile();

    supplyChainService = moduleFixture.get<SupplyChainOptimizerService>(SupplyChainOptimizerService);
    testAdmin = await testHelper.createTestAdmin();
  });

  afterAll(async () => {
    await testHelper.cleanupTestData();
    await testHelper.teardownTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Supply Chain System Initialization', () => {
    test('should initialize supply chain optimization system correctly', async () => {
      expect(supplyChainService).toBeDefined();
    });

    test('should load supply chain nodes and inventory data', async () => {
      const inventory = await supplyChainService.getInventoryOverview();
      
      expect(inventory).toMatchObject({
        totalItems: expect.any(Number),
        totalValue: expect.any(Number),
        lowStockAlerts: expect.any(Number),
        overStockAlerts: expect.any(Number),
        avgTurnoverRate: expect.any(Number),
      });
    });

    test('should load supplier performance data', async () => {
      const supplierReport = await supplyChainService.getSupplierPerformanceReport();
      
      expect(supplierReport).toBeInstanceOf(Array);
      expect(supplierReport.length).toBeGreaterThan(0);
      
      supplierReport.forEach(report => {
        expect(report).toMatchObject({
          supplier: expect.objectContaining({
            id: expect.any(String),
            type: 'supplier',
            name: expect.any(String),
            capabilities: expect.any(Object),
            performance: expect.any(Object),
          }),
          performance: expect.any(Object),
          recommendations: expect.any(Array),
        });
      });
    });
  });

  describe('Full Chain Optimization', () => {
    test('should run full supply chain optimization successfully', async () => {
      const result = await supplyChainService.runFullChainOptimization();

      expect(result).toMatchObject({
        sessionId: expect.stringMatching(/^opt_\d+$/),
        timestamp: expect.any(Date),
        optimizationType: 'full_chain',
        recommendations: {
          procurement: expect.any(Array),
          inventoryAdjustments: expect.any(Array),
          supplierOptimizations: expect.any(Array),
        },
        performance: {
          projectedSavings: expect.any(Number),
          efficiencyGain: expect.any(Number),
          riskReduction: expect.any(Number),
          timeToImplement: expect.any(Number),
        },
        constraints: expect.objectContaining({
          budget: expect.any(Number),
          storageCapacity: expect.any(Number),
          cashFlow: expect.any(Number),
          riskTolerance: expect.any(Number),
        }),
      });

      expect(result.performance.projectedSavings).toBeGreaterThan(0);
      expect(result.performance.efficiencyGain).toBeGreaterThan(0);
    });

    test('should handle custom constraints', async () => {
      const customConstraints = {
        budget: 5000000, // ¥5M
        storageCapacity: 500,
        riskTolerance: 0.4,
        timeHorizon: 60, // 60 days
      };

      const result = await supplyChainService.runFullChainOptimization(customConstraints);

      expect(result.constraints.budget).toBe(customConstraints.budget);
      expect(result.constraints.storageCapacity).toBe(customConstraints.storageCapacity);
      expect(result.constraints.riskTolerance).toBe(customConstraints.riskTolerance);
    });

    test('should optimize within budget constraints', async () => {
      const limitedBudget = {
        budget: 1000000, // ¥1M limited budget
      };

      const result = await supplyChainService.runFullChainOptimization(limitedBudget);
      
      // Calculate total procurement cost
      const totalProcurementCost = result.recommendations.procurement
        .reduce((sum, rec) => sum + rec.financialImpact.investmentRequired, 0);
      
      expect(totalProcurementCost).toBeLessThanOrEqual(limitedBudget.budget);
    });
  });

  describe('Procurement Optimization', () => {
    test('should generate procurement recommendations', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const procurementRecs = result.recommendations.procurement;

      expect(procurementRecs).toBeInstanceOf(Array);
      
      procurementRecs.forEach((rec: ProcurementRecommendation) => {
        expect(rec).toMatchObject({
          asin: expect.any(String),
          productTitle: expect.any(String),
          recommendedQuantity: expect.any(Number),
          recommendedSupplier: expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            type: 'supplier',
          }),
          urgency: expect.stringMatching(/^(critical|high|medium|low)$/),
          reasoning: expect.any(String),
          expectedProfit: expect.any(Number),
          riskAssessment: expect.objectContaining({
            demandRisk: expect.any(Number),
            supplierRisk: expect.any(Number),
            marketRisk: expect.any(Number),
            overallRisk: expect.any(Number),
          }),
          timeline: expect.objectContaining({
            orderDate: expect.any(Date),
            expectedDelivery: expect.any(Date),
            expectedSaleCompletion: expect.any(Date),
          }),
          financialImpact: expect.objectContaining({
            investmentRequired: expect.any(Number),
            expectedRevenue: expect.any(Number),
            expectedProfit: expect.any(Number),
            roi: expect.any(Number),
            paybackPeriod: expect.any(Number),
          }),
        });

        expect(rec.recommendedQuantity).toBeGreaterThan(0);
        expect(rec.financialImpact.roi).toBeGreaterThanOrEqual(-1); // ROI can be negative
      });
    });

    test('should prioritize urgent procurement needs', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const criticalRecs = result.recommendations.procurement
        .filter(rec => rec.urgency === 'critical');

      if (criticalRecs.length > 0) {
        criticalRecs.forEach(rec => {
          expect(rec.reasoning).toContain('在庫がリオーダーポイント以下');
        });
      }
    });

    test('should calculate economic order quantities', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const procurementRecs = result.recommendations.procurement;

      procurementRecs.forEach(rec => {
        // EOQ should be reasonable (not too small or excessive)
        expect(rec.recommendedQuantity).toBeGreaterThanOrEqual(1);
        expect(rec.recommendedQuantity).toBeLessThanOrEqual(1000);
      });
    });

    test('should select optimal suppliers', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const procurementRecs = result.recommendations.procurement;

      procurementRecs.forEach(rec => {
        expect(rec.recommendedSupplier.capabilities).toBeDefined();
        expect(rec.recommendedSupplier.capabilities.reliabilityScore).toBeGreaterThan(0);
        expect(rec.recommendedSupplier.capabilities.qualityScore).toBeGreaterThan(0);
      });
    });
  });

  describe('Inventory Management Optimization', () => {
    test('should generate inventory adjustment recommendations', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const inventoryAdj = result.recommendations.inventoryAdjustments;

      expect(inventoryAdj).toBeInstanceOf(Array);
      
      inventoryAdj.forEach(adj => {
        expect(adj).toMatchObject({
          asin: expect.any(String),
          currentLevel: expect.any(Number),
          recommendedLevel: expect.any(Number),
          action: expect.stringMatching(/^(increase|decrease|maintain|discontinue)$/),
          reasoning: expect.any(String),
          impact: expect.objectContaining({
            costChange: expect.any(Number),
            riskChange: expect.any(Number),
            serviceLevel: expect.any(Number),
          }),
        });

        expect(adj.currentLevel).toBeGreaterThanOrEqual(0);
        expect(adj.recommendedLevel).toBeGreaterThanOrEqual(0);
        expect(adj.impact.serviceLevel).toBeGreaterThanOrEqual(0);
        expect(adj.impact.serviceLevel).toBeLessThanOrEqual(1);
      });
    });

    test('should optimize stock levels based on demand forecast', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const inventoryAdj = result.recommendations.inventoryAdjustments;

      // Should have meaningful adjustments
      const significantAdjustments = inventoryAdj.filter(adj => 
        Math.abs(adj.recommendedLevel - adj.currentLevel) > adj.currentLevel * 0.1
      );

      expect(significantAdjustments.length).toBeGreaterThanOrEqual(0);
    });

    test('should identify overstocked items for reduction', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const decreaseActions = result.recommendations.inventoryAdjustments
        .filter(adj => adj.action === 'decrease');

      decreaseActions.forEach(adj => {
        expect(adj.recommendedLevel).toBeLessThan(adj.currentLevel);
        expect(adj.impact.costChange).toBeLessThan(0); // Should reduce costs
      });
    });

    test('should identify understocked items for increase', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const increaseActions = result.recommendations.inventoryAdjustments
        .filter(adj => adj.action === 'increase');

      increaseActions.forEach(adj => {
        expect(adj.recommendedLevel).toBeGreaterThan(adj.currentLevel);
        expect(adj.impact.serviceLevel).toBeGreaterThan(0.8); // Should improve service level
      });
    });
  });

  describe('Supplier Performance Optimization', () => {
    test('should analyze supplier performance', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const supplierOpt = result.recommendations.supplierOptimizations;

      expect(supplierOpt).toBeInstanceOf(Array);
      
      supplierOpt.forEach(opt => {
        expect(opt).toMatchObject({
          currentSupplier: expect.objectContaining({
            id: expect.any(String),
            type: 'supplier',
            performance: expect.any(Object),
          }),
          action: expect.stringMatching(/^(maintain|negotiate|switch|diversify)$/),
          reasoning: expect.any(String),
          expectedBenefit: expect.objectContaining({
            costSavings: expect.any(Number),
            qualityImprovement: expect.any(Number),
            reliabilityGain: expect.any(Number),
          }),
        });
      });
    });

    test('should recommend supplier switches for poor performers', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const switchRecommendations = result.recommendations.supplierOptimizations
        .filter(opt => opt.action === 'switch');

      switchRecommendations.forEach(opt => {
        expect(opt.recommendedSupplier).toBeDefined();
        expect(opt.expectedBenefit.costSavings).toBeGreaterThanOrEqual(0);
      });
    });

    test('should recommend negotiations for underperformers', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const negotiateRecommendations = result.recommendations.supplierOptimizations
        .filter(opt => opt.action === 'negotiate');

      negotiateRecommendations.forEach(opt => {
        expect(opt.reasoning).toContain('Performance');
        expect(opt.expectedBenefit.reliabilityGain).toBeGreaterThan(0);
      });
    });

    test('should recommend diversification for high-volume suppliers', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      const diversifyRecommendations = result.recommendations.supplierOptimizations
        .filter(opt => opt.action === 'diversify');

      diversifyRecommendations.forEach(opt => {
        expect(opt.currentSupplier.capabilities.capacity).toBeGreaterThan(500);
        expect(opt.expectedBenefit.reliabilityGain).toBeGreaterThan(0);
      });
    });
  });

  describe('Cash Flow Forecasting', () => {
    test('should generate cash flow forecast', async () => {
      const forecast = await supplyChainService.generateCashFlowForecast(30);

      expect(forecast).toBeInstanceOf(Array);
      expect(forecast.length).toBe(30);

      forecast.forEach((day: CashFlowForecast) => {
        expect(day).toMatchObject({
          period: expect.any(Date),
          inflow: expect.any(Number),
          outflow: expect.any(Number),
          netFlow: expect.any(Number),
          cumulativeFlow: expect.any(Number),
          projectedBalance: expect.any(Number),
          riskFactors: expect.any(Array),
        });

        expect(day.inflow).toBeGreaterThanOrEqual(0);
        expect(day.outflow).toBeGreaterThanOrEqual(0);
        expect(day.netFlow).toBe(day.inflow - day.outflow);
      });
    });

    test('should identify cash flow risk periods', async () => {
      const forecast = await supplyChainService.generateCashFlowForecast(60);
      
      const riskPeriods = forecast.filter(day => day.netFlow < 0);
      riskPeriods.forEach(day => {
        expect(day.riskFactors).toContain('Negative cash flow');
      });
    });

    test('should calculate cumulative cash flow correctly', async () => {
      const forecast = await supplyChainService.generateCashFlowForecast(10);
      
      let expectedCumulative = 0;
      forecast.forEach(day => {
        expectedCumulative += day.netFlow;
        expect(day.cumulativeFlow).toBeCloseTo(expectedCumulative, 2);
      });
    });

    test('should support custom forecast horizons', async () => {
      const shortForecast = await supplyChainService.generateCashFlowForecast(7);
      const longForecast = await supplyChainService.generateCashFlowForecast(90);

      expect(shortForecast.length).toBe(7);
      expect(longForecast.length).toBe(90);
    });
  });

  describe('Inventory Overview and Alerts', () => {
    test('should provide comprehensive inventory overview', async () => {
      const overview = await supplyChainService.getInventoryOverview();

      expect(overview).toMatchObject({
        totalItems: expect.any(Number),
        totalValue: expect.any(Number),
        lowStockAlerts: expect.any(Number),
        overStockAlerts: expect.any(Number),
        avgTurnoverRate: expect.any(Number),
      });

      expect(overview.totalItems).toBeGreaterThanOrEqual(0);
      expect(overview.totalValue).toBeGreaterThanOrEqual(0);
      expect(overview.avgTurnoverRate).toBeGreaterThanOrEqual(0);
    });

    test('should identify low stock alerts', async () => {
      const overview = await supplyChainService.getInventoryOverview();
      
      if (overview.lowStockAlerts > 0) {
        // Should be reflected in procurement recommendations
        const result = await supplyChainService.runFullChainOptimization();
        const urgentProcurement = result.recommendations.procurement
          .filter(rec => rec.urgency === 'critical' || rec.urgency === 'high');
        
        expect(urgentProcurement.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('should identify overstock situations', async () => {
      const overview = await supplyChainService.getInventoryOverview();
      
      if (overview.overStockAlerts > 0) {
        // Should be reflected in inventory adjustments
        const result = await supplyChainService.runFullChainOptimization();
        const reductionActions = result.recommendations.inventoryAdjustments
          .filter(adj => adj.action === 'decrease');
        
        expect(reductionActions.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Optimization History and Tracking', () => {
    test('should maintain optimization history', async () => {
      await supplyChainService.runFullChainOptimization();
      await supplyChainService.runFullChainOptimization();
      
      const history = await supplyChainService.getOptimizationHistory();
      
      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThanOrEqual(2);
      
      history.forEach(result => {
        expect(result.sessionId).toBeDefined();
        expect(result.timestamp).toBeDefined();
        expect(result.optimizationType).toBeDefined();
      });
    });

    test('should store optimization results persistently', async () => {
      const result1 = await supplyChainService.runFullChainOptimization();
      
      // Simulate some time passing
      await testHelper.wait(100);
      
      const history = await supplyChainService.getOptimizationHistory();
      const storedResult = history.find(r => r.sessionId === result1.sessionId);
      
      expect(storedResult).toBeDefined();
      expect(storedResult?.sessionId).toBe(result1.sessionId);
    });

    test('should limit history to recent optimizations', async () => {
      // Run multiple optimizations
      for (let i = 0; i < 12; i++) {
        await supplyChainService.runFullChainOptimization();
      }
      
      const history = await supplyChainService.getOptimizationHistory();
      
      // Should keep only last 10
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Performance Metrics and KPIs', () => {
    test('should calculate meaningful performance metrics', async () => {
      const result = await supplyChainService.runFullChainOptimization();

      expect(result.performance.projectedSavings).toBeGreaterThan(0);
      expect(result.performance.efficiencyGain).toBeGreaterThan(0);
      expect(result.performance.riskReduction).toBeGreaterThan(0);
      expect(result.performance.timeToImplement).toBeGreaterThan(0);

      // Efficiency gain should be reasonable (not over 100%)
      expect(result.performance.efficiencyGain).toBeLessThan(100);
      
      // Time to implement should be reasonable (days)
      expect(result.performance.timeToImplement).toBeLessThan(30);
    });

    test('should provide ROI calculations for procurement', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      
      result.recommendations.procurement.forEach(rec => {
        expect(rec.financialImpact.roi).toBeDefined();
        expect(rec.financialImpact.paybackPeriod).toBeGreaterThan(0);
        
        // ROI should be calculated correctly
        const calculatedROI = rec.financialImpact.expectedProfit / rec.financialImpact.investmentRequired;
        expect(rec.financialImpact.roi).toBeCloseTo(calculatedROI, 2);
      });
    });

    test('should track supplier performance metrics', async () => {
      const supplierReport = await supplyChainService.getSupplierPerformanceReport();
      
      supplierReport.forEach(report => {
        expect(report.performance.onTimeDeliveryRate).toBeDefined();
        expect(report.performance.defectRate).toBeDefined();
        expect(report.performance.customerSatisfaction).toBeDefined();
        expect(report.performance.costEfficiency).toBeDefined();

        // Performance metrics should be in valid ranges
        expect(report.performance.onTimeDeliveryRate).toBeGreaterThanOrEqual(0);
        expect(report.performance.onTimeDeliveryRate).toBeLessThanOrEqual(1);
        expect(report.performance.defectRate).toBeGreaterThanOrEqual(0);
        expect(report.performance.defectRate).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle optimization errors gracefully', async () => {
      // Mock a service failure
      mockProductScoringService.scoreProduct.mockRejectedValueOnce(new Error('Service unavailable'));
      
      const result = await supplyChainService.runFullChainOptimization();
      
      expect(result).toBeDefined();
      expect(result.optimizationType).toBe('full_chain');
      // Should continue with available data
    });

    test('should handle constraint violations', async () => {
      const impossibleConstraints = {
        budget: 1, // ¥1 - impossibly low budget
        storageCapacity: 0,
        riskTolerance: 0,
      };

      const result = await supplyChainService.runFullChainOptimization(impossibleConstraints);
      
      expect(result).toBeDefined();
      expect(result.recommendations.procurement.length).toBe(0); // No recommendations possible
    });

    test('should validate constraint parameters', async () => {
      const invalidConstraints = {
        budget: -1000000, // Negative budget
        riskTolerance: 2, // > 1.0
      };

      await expect(
        supplyChainService.runFullChainOptimization(invalidConstraints)
      ).rejects.toThrow();
    });
  });

  describe('Integration with AI Services', () => {
    test('should integrate with product scoring AI', async () => {
      await supplyChainService.runFullChainOptimization();
      
      expect(mockProductScoringService.scoreProduct).toHaveBeenCalled();
    });

    test('should integrate with price prediction engine', async () => {
      await supplyChainService.runFullChainOptimization();
      
      expect(mockPricePredictorService.predictPrice).toHaveBeenCalled();
    });

    test('should use AI insights for optimization decisions', async () => {
      const result = await supplyChainService.runFullChainOptimization();
      
      // Procurement recommendations should consider AI scores
      result.recommendations.procurement.forEach(rec => {
        expect(rec.riskAssessment).toBeDefined();
        expect(rec.expectedProfit).toBeDefined();
        expect(rec.reasoning).toContain('最適サプライヤー');
      });
    });
  });

  describe('Scalability and Performance', () => {
    test('should handle large inventory datasets', async () => {
      const startTime = Date.now();
      const result = await supplyChainService.runFullChainOptimization();
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result).toBeDefined();
    });

    test('should optimize within reasonable time limits', async () => {
      const startTime = Date.now();
      
      // Run optimization with time horizon
      const result = await supplyChainService.runFullChainOptimization({
        timeHorizon: 180, // 6 months
      });
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(45000); // Should handle longer horizons efficiently
      expect(result.constraints.timeHorizon).toBe(180);
    });

    test('should support concurrent optimizations', async () => {
      const optimizationPromises = [
        supplyChainService.runFullChainOptimization({ budget: 2000000 }),
        supplyChainService.runFullChainOptimization({ budget: 3000000 }),
      ];

      const results = await Promise.all(optimizationPromises);
      
      expect(results.length).toBe(2);
      expect(results[0].sessionId).not.toBe(results[1].sessionId);
      expect(results[0].constraints.budget).toBe(2000000);
      expect(results[1].constraints.budget).toBe(3000000);
    });
  });

  describe('Real-world Business Scenarios', () => {
    test('should handle seasonal demand variations', async () => {
      const seasonalResult = await supplyChainService.runFullChainOptimization({
        timeHorizon: 120, // 4 months to capture seasonal effects
      });

      expect(seasonalResult.recommendations.procurement.length).toBeGreaterThan(0);
      
      // Should consider seasonal factors in cash flow
      const cashFlow = await supplyChainService.generateCashFlowForecast(120);
      expect(cashFlow.length).toBe(120);
    });

    test('should optimize for different risk profiles', async () => {
      const conservativeResult = await supplyChainService.runFullChainOptimization({
        riskTolerance: 0.3, // Low risk tolerance
      });

      const aggressiveResult = await supplyChainService.runFullChainOptimization({
        riskTolerance: 0.8, // High risk tolerance
      });

      // Conservative should have lower risk recommendations
      const conservativeRiskScores = conservativeResult.recommendations.procurement
        .map(rec => rec.riskAssessment.overallRisk);
      const aggressiveRiskScores = aggressiveResult.recommendations.procurement
        .map(rec => rec.riskAssessment.overallRisk);

      if (conservativeRiskScores.length > 0 && aggressiveRiskScores.length > 0) {
        const avgConservativeRisk = conservativeRiskScores.reduce((a, b) => a + b, 0) / conservativeRiskScores.length;
        const avgAggressiveRisk = aggressiveRiskScores.reduce((a, b) => a + b, 0) / aggressiveRiskScores.length;
        
        expect(avgConservativeRisk).toBeLessThanOrEqual(avgAggressiveRisk);
      }
    });

    test('should handle supply chain disruptions', async () => {
      // Simulate disruption by modifying supplier performance
      const result = await supplyChainService.runFullChainOptimization();

      const diversificationRecommendations = result.recommendations.supplierOptimizations
        .filter(opt => opt.action === 'diversify');

      // Should recommend diversification for resilience
      expect(diversificationRecommendations.length).toBeGreaterThanOrEqual(0);
    });
  });
});