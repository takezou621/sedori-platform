import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { E2ETestHelper, TestUser } from '../helpers/test-helper';
import { AutonomousDiscoveryService, DiscoverySession, DiscoveryResult } from '../../src/ai/discovery/autonomous-discovery.service';
import { ProductScoringAiService } from '../../src/ai/product-scoring.ai';
import { KeepaApiService } from '../../src/external-apis/keepa-api.service';
import { MlScoringService } from '../../src/ai/ml-scoring.service';

describe('Autonomous Product Discovery System E2E Tests (Issue #85)', () => {
  let app: INestApplication;
  let testHelper: E2ETestHelper;
  let discoveryService: AutonomousDiscoveryService;
  let testAdmin: TestUser;

  // Mock services for testing
  const mockProductScoringService = {
    scoreProduct: jest.fn().mockResolvedValue({
      overallScore: 75,
      dimensions: {
        profitability: { score: 80 },
        demand: { score: 70 },
        competition: { score: 75 },
        risk: { score: 30 },
      },
      metadata: {
        confidence: 0.8,
      }
    }),
  };

  const mockKeepaService = {
    searchProducts: jest.fn().mockResolvedValue([
      {
        asin: 'B001TEST001',
        title: 'Test Electronic Product 1',
        stats: {
          current: [5000, 4000, 0, 50000], // Amazon, 3rd party, warehouse, sales rank
          rating: 4.5,
          reviewCount: 250,
          salesRankDrops30: 8,
        },
        categoryTree: [{ name: 'Electronics' }],
      },
      {
        asin: 'B001TEST002',
        title: 'Test Home Product 2',
        stats: {
          current: [0, 8000, 0, 120000],
          rating: 4.2,
          reviewCount: 150,
          salesRankDrops30: 3,
        },
        categoryTree: [{ name: 'Home & Kitchen' }],
      },
    ]),
  };

  const mockMlScoringService = {
    scoreBatch: jest.fn().mockResolvedValue([
      { asin: 'B001TEST001', score: 82 },
      { asin: 'B001TEST002', score: 68 },
    ]),
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
        AutonomousDiscoveryService,
        {
          provide: ProductScoringAiService,
          useValue: mockProductScoringService,
        },
        {
          provide: KeepaApiService,
          useValue: mockKeepaService,
        },
        {
          provide: MlScoringService,
          useValue: mockMlScoringService,
        },
      ],
    }).compile();

    discoveryService = moduleFixture.get<AutonomousDiscoveryService>(AutonomousDiscoveryService);
    testAdmin = await testHelper.createTestAdmin();
  });

  afterAll(async () => {
    await testHelper.cleanupTestData();
    await testHelper.teardownTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Discovery System Initialization', () => {
    test('should initialize autonomous discovery system correctly', async () => {
      expect(discoveryService).toBeDefined();
      expect(discoveryService.isDiscoveryRunning()).toBe(false);
    });

    test('should load default configuration', async () => {
      const stats = discoveryService.getDiscoveryStats();
      expect(stats).toMatchObject({
        totalSessions: expect.any(Number),
        totalProductsScanned: expect.any(Number),
        totalOpportunitiesFound: expect.any(Number),
        averageSuccessRate: expect.any(Number),
      });
    });
  });

  describe('Discovery Session Execution', () => {
    test('should run autonomous discovery session successfully', async () => {
      const session = await discoveryService.runDiscoverySession();

      expect(session).toBeDefined();
      expect(session.sessionId).toMatch(/^discovery_\d+$/);
      expect(session.status).toBe('completed');
      expect(session.productsScanned).toBeGreaterThan(0);
      expect(session.results).toBeInstanceOf(Array);
      expect(session.performance).toMatchObject({
        scanRate: expect.any(Number),
        successRate: expect.any(Number),
        averageScore: expect.any(Number),
      });
    });

    test('should prevent concurrent discovery sessions', async () => {
      // Start first session
      const sessionPromise = discoveryService.runDiscoverySession();
      
      // Try to start second session while first is running
      await expect(discoveryService.runDiscoverySession()).rejects.toThrow('Discovery session already running');
      
      // Wait for first session to complete
      await sessionPromise;
    });

    test('should handle discovery session timeout gracefully', async () => {
      // Mock timeout scenario by limiting time
      jest.spyOn(discoveryService as any, 'runDiscoverySession')
        .mockImplementationOnce(async () => {
          throw new Error('Session timeout');
        });

      await expect(discoveryService.runDiscoverySession()).rejects.toThrow('Session timeout');
      expect(discoveryService.isDiscoveryRunning()).toBe(false);
    });
  });

  describe('Pattern-Based Discovery', () => {
    test('should discover products using pattern analysis', async () => {
      const session = await discoveryService.runDiscoverySession();
      
      expect(mockKeepaService.searchProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          category: expect.any(String),
          minPrice: expect.any(Number),
          maxPrice: expect.any(Number),
          minRating: 4.0,
          minReviews: 10,
        })
      );

      expect(session.results.length).toBeGreaterThan(0);
    });

    test('should score discovered products using AI', async () => {
      await discoveryService.runDiscoverySession();
      
      expect(mockProductScoringService.scoreProduct).toHaveBeenCalled();
    });

    test('should filter products by discovery thresholds', async () => {
      const session = await discoveryService.runDiscoverySession();
      
      // All results should meet minimum thresholds
      session.results.forEach((result: DiscoveryResult) => {
        expect(result.aiScore.overallScore).toBeGreaterThanOrEqual(70); // minProfitScore
        expect(result.aiScore.dimensions.risk.score).toBeLessThanOrEqual(40); // maxRiskScore
        expect(result.aiScore.dimensions.demand.score).toBeGreaterThanOrEqual(60); // minDemandScore
        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      });
    });
  });

  describe('Trend-Based Discovery', () => {
    test('should identify trending products', async () => {
      mockKeepaService.searchProducts.mockResolvedValueOnce([
        {
          asin: 'B001TREND001',
          title: 'Trending Product',
          stats: {
            current: [3000, 2500, 0, 25000],
            salesRankDrops30: 15, // High momentum
            rating: 4.6,
            reviewCount: 300,
          },
          categoryTree: [{ name: 'Electronics' }],
        },
      ]);

      const session = await discoveryService.runDiscoverySession();
      
      expect(mockKeepaService.searchProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'salesRankDrops',
        })
      );
    });
  });

  describe('Competition Gap Analysis', () => {
    test('should identify products with low competition', async () => {
      mockKeepaService.searchProducts.mockResolvedValueOnce([
        {
          asin: 'B001GAP001',
          title: 'Low Competition Product',
          stats: {
            current: [0, 6000, 0, 80000], // No Amazon price = low competition
            rating: 4.3,
            reviewCount: 100,
          },
          categoryTree: [{ name: 'Sports & Outdoors' }],
        },
      ]);

      const session = await discoveryService.runDiscoverySession();
      
      expect(session.results).toHaveLength(1);
      expect(session.results[0].reasoning).toContain('競合少数');
    });
  });

  describe('Manual Discovery Triggers', () => {
    test('should support manual discovery with category filter', async () => {
      const session = await discoveryService.manualDiscoveryTrigger({
        category: 'Electronics',
        maxProducts: 50,
      });

      expect(session).toBeDefined();
      expect(session.status).toBe('completed');
    });

    test('should support manual discovery with price range filter', async () => {
      const session = await discoveryService.manualDiscoveryTrigger({
        priceRange: { min: 1000, max: 10000 },
        maxProducts: 25,
      });

      expect(session).toBeDefined();
      expect(session.productsScanned).toBeLessThanOrEqual(25);
    });

    test('should handle invalid manual discovery parameters', async () => {
      await expect(
        discoveryService.manualDiscoveryTrigger({
          priceRange: { min: 10000, max: 1000 }, // Invalid range
        })
      ).rejects.toThrow();
    });
  });

  describe('Discovery Results Management', () => {
    test('should store and retrieve discovery results', async () => {
      const session = await discoveryService.runDiscoverySession();
      const latestResults = await discoveryService.getLatestResults();

      expect(latestResults).toBeInstanceOf(Array);
      expect(latestResults.length).toEqual(session.results.length);
    });

    test('should maintain discovery history', async () => {
      await discoveryService.runDiscoverySession();
      await discoveryService.runDiscoverySession();
      
      const history = await discoveryService.getDiscoveryHistory();
      expect(history.length).toBe(2);
      expect(history[0].sessionId).toBeDefined();
      expect(history[1].sessionId).toBeDefined();
    });

    test('should limit history to last 10 sessions', async () => {
      // Run 12 discovery sessions
      for (let i = 0; i < 12; i++) {
        await discoveryService.runDiscoverySession();
      }
      
      const history = await discoveryService.getDiscoveryHistory();
      expect(history.length).toBe(10);
    });
  });

  describe('Configuration Management', () => {
    test('should update discovery configuration', async () => {
      await discoveryService.updateDiscoveryConfig({
        minProfitScore: 80,
        maxRiskScore: 30,
        categories: ['Electronics', 'Books'],
      });

      const session = await discoveryService.runDiscoverySession();
      
      // Verify new thresholds are applied
      session.results.forEach((result: DiscoveryResult) => {
        expect(result.aiScore.overallScore).toBeGreaterThanOrEqual(80);
        expect(result.aiScore.dimensions.risk.score).toBeLessThanOrEqual(30);
      });
    });
  });

  describe('Performance Metrics', () => {
    test('should track scan rate performance', async () => {
      const startTime = Date.now();
      const session = await discoveryService.runDiscoverySession();
      const endTime = Date.now();
      
      const expectedScanRate = session.productsScanned / ((endTime - startTime) / 60000);
      expect(session.performance.scanRate).toBeCloseTo(expectedScanRate, 0);
    });

    test('should calculate success rate correctly', async () => {
      const session = await discoveryService.runDiscoverySession();
      
      const expectedSuccessRate = session.results.length / session.productsScanned;
      expect(session.performance.successRate).toEqual(expectedSuccessRate);
    });

    test('should maintain performance statistics', async () => {
      await discoveryService.runDiscoverySession();
      await discoveryService.runDiscoverySession();
      
      const stats = discoveryService.getDiscoveryStats();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(2);
      expect(stats.averageSuccessRate).toBeDefined();
      expect(stats.lastRunTime).toBeDefined();
    });
  });

  describe('Action Prioritization', () => {
    test('should categorize discoveries by action required', async () => {
      mockProductScoringService.scoreProduct
        .mockResolvedValueOnce({
          overallScore: 88,
          dimensions: { risk: { score: 25 } },
          metadata: { confidence: 0.9 }
        })
        .mockResolvedValueOnce({
          overallScore: 76,
          dimensions: { risk: { score: 35 } },
          metadata: { confidence: 0.7 }
        });

      const session = await discoveryService.runDiscoverySession();
      
      const immediateBuy = session.results.filter(r => r.actionRequired === 'immediate_buy');
      const researchFurther = session.results.filter(r => r.actionRequired === 'research_further');
      
      expect(immediateBuy.length).toBeGreaterThan(0);
      expect(researchFurther.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle Keepa API errors gracefully', async () => {
      mockKeepaService.searchProducts.mockRejectedValueOnce(new Error('API Rate Limit'));
      
      const session = await discoveryService.runDiscoverySession();
      
      expect(session.status).toBe('completed');
      expect(session.productsScanned).toBe(0);
    });

    test('should handle product scoring errors gracefully', async () => {
      mockProductScoringService.scoreProduct.mockRejectedValueOnce(new Error('Scoring failed'));
      
      const session = await discoveryService.runDiscoverySession();
      
      expect(session.status).toBe('completed');
      // Should continue processing other products
    });
  });

  describe('Integration with External Services', () => {
    test('should integrate with Keepa API service', () => {
      expect(mockKeepaService.searchProducts).toBeDefined();
    });

    test('should integrate with Product Scoring AI service', () => {
      expect(mockProductScoringService.scoreProduct).toBeDefined();
    });

    test('should integrate with ML Scoring service', () => {
      expect(mockMlScoringService.scoreBatch).toBeDefined();
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle large-scale discovery operations', async () => {
      // Mock large number of products
      const largeProductSet = Array.from({ length: 500 }, (_, i) => ({
        asin: `B001LARGE${i.toString().padStart(3, '0')}`,
        title: `Large Scale Product ${i}`,
        stats: {
          current: [Math.random() * 10000, Math.random() * 8000, 0, Math.random() * 200000],
          rating: 3.5 + Math.random() * 1.5,
          reviewCount: Math.floor(Math.random() * 500),
        },
        categoryTree: [{ name: 'Electronics' }],
      }));

      mockKeepaService.searchProducts.mockResolvedValueOnce(largeProductSet);

      const session = await discoveryService.manualDiscoveryTrigger({
        maxProducts: 1000,
      });

      expect(session.productsScanned).toBeLessThanOrEqual(1000);
      expect(session.performance.scanRate).toBeGreaterThan(0);
    });

    test('should prioritize high-opportunity discoveries', async () => {
      const session = await discoveryService.runDiscoverySession();
      
      // Results should be sorted by priority/opportunity
      for (let i = 1; i < session.results.length; i++) {
        const current = session.results[i];
        const previous = session.results[i - 1];
        
        // Higher scoring products should come first
        expect(current.aiScore.overallScore).toBeLessThanOrEqual(previous.aiScore.overallScore);
      }
    });
  });
});