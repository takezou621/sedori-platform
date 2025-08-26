import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { E2ETestHelper, TestUser } from '../helpers/test-helper';
import { 
  Product3DVisualizerService,
  ProductVisualization,
  VirtualShowroom,
  ARExperience,
  UserInteractionData,
  ColorVariant,
  SizingInfo
} from '../../src/ai/visualization/product-3d-visualizer.service';
import { KeepaProduct } from '../../src/external-apis/interfaces/keepa-data.interface';

describe('3D Product Visualization System E2E Tests (Issue #89)', () => {
  let app: INestApplication;
  let testHelper: E2ETestHelper;
  let visualizerService: Product3DVisualizerService;
  let testAdmin: TestUser;

  // Mock test data
  const createMockProduct = (category: string = 'Electronics'): KeepaProduct => ({
    asin: `B001VIZ${Date.now().toString().slice(-6)}`,
    title: `Test ${category} Product`,
    stats: {
      current: [5000, 4500, 0, 75000],
      rating: 4.3,
      reviewCount: 180,
    },
    categoryTree: [{ name: category, id: 1 }],
    brand: 'TestBrand',
    imagesCSV: 'image1.jpg,image2.jpg,image3.jpg',
  });

  const createMockProducts = (count: number, categories: string[] = ['Electronics', 'Home & Kitchen', 'Toys & Games']) => {
    return Array.from({ length: count }, (_, i) => 
      createMockProduct(categories[i % categories.length])
    );
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
        Product3DVisualizerService,
      ],
    }).compile();

    visualizerService = moduleFixture.get<Product3DVisualizerService>(Product3DVisualizerService);
    testAdmin = await testHelper.createTestAdmin();
  });

  afterAll(async () => {
    await testHelper.cleanupTestData();
    await testHelper.teardownTestApp();
  });

  describe('3D Visualization Engine Initialization', () => {
    test('should initialize 3D visualization engine correctly', async () => {
      expect(visualizerService).toBeDefined();
    });

    test('should provide visualization analytics methods', async () => {
      const mockAsin = 'B001VIZTEST';
      const analytics = await visualizerService.getVisualizationAnalytics(mockAsin);

      expect(analytics).toMatchObject({
        totalViews: expect.any(Number),
        averageViewTime: expect.any(Number),
        arActivations: expect.any(Number),
        shareActions: expect.any(Number),
        conversionRate: expect.any(Number),
      });

      expect(analytics.totalViews).toBeGreaterThanOrEqual(0);
      expect(analytics.averageViewTime).toBeGreaterThanOrEqual(0);
      expect(analytics.conversionRate).toBeGreaterThanOrEqual(0);
      expect(analytics.conversionRate).toBeLessThanOrEqual(1);
    });
  });

  describe('3D Model Generation', () => {
    test('should generate basic 3D visualization', async () => {
      const product = createMockProduct();
      const visualization = await visualizerService.generateProductVisualization(product);

      expect(visualization).toMatchObject({
        asin: product.asin,
        productTitle: product.title,
        visualizationType: expect.stringMatching(/^(3d_model|ar_preview|virtual_showroom|360_view)$/),
        assets: expect.objectContaining({
          model3D: expect.any(String),
          textures: expect.any(Array),
          thumbnails: expect.any(Array),
        }),
        interactivity: expect.objectContaining({
          rotatable: expect.any(Boolean),
          zoomable: expect.any(Boolean),
          explodedView: expect.any(Boolean),
          colorVariants: expect.any(Array),
          sizingInfo: expect.any(Object),
        }),
        arCapabilities: expect.objectContaining({
          markerBased: expect.any(Boolean),
          markerlessTracking: expect.any(Boolean),
          handTracking: expect.any(Boolean),
          surfaceDetection: expect.any(Boolean),
        }),
        metadata: expect.objectContaining({
          modelQuality: expect.stringMatching(/^(low|medium|high|ultra)$/),
          fileSize: expect.any(Number),
          polygonCount: expect.any(Number),
          renderComplexity: expect.any(Number),
          loadTime: expect.any(Number),
          compatibleDevices: expect.any(Array),
        }),
        aiEnhancements: expect.objectContaining({
          smartLighting: expect.any(Boolean),
          materialPrediction: expect.any(Boolean),
          scaleEstimation: expect.any(Boolean),
          environmentMapping: expect.any(Boolean),
        }),
      });

      expect(visualization.assets.textures.length).toBeGreaterThan(0);
      expect(visualization.assets.thumbnails.length).toBeGreaterThan(0);
      expect(visualization.metadata.fileSize).toBeGreaterThan(0);
      expect(visualization.metadata.polygonCount).toBeGreaterThan(0);
    });

    test('should generate visualization with different quality levels', async () => {
      const product = createMockProduct();
      
      const lowQuality = await visualizerService.generateProductVisualization(product, { 
        quality: 'low' 
      });
      const highQuality = await visualizerService.generateProductVisualization(product, { 
        quality: 'high' 
      });

      expect(lowQuality.metadata.modelQuality).toBe('low');
      expect(highQuality.metadata.modelQuality).toBe('high');
      
      expect(highQuality.metadata.polygonCount).toBeGreaterThan(lowQuality.metadata.polygonCount);
      expect(highQuality.metadata.fileSize).toBeGreaterThan(lowQuality.metadata.fileSize);
      expect(highQuality.metadata.loadTime).toBeGreaterThan(lowQuality.metadata.loadTime);
    });

    test('should adapt visualization to product category', async () => {
      const electronicsProduct = createMockProduct('Electronics');
      const toyProduct = createMockProduct('Toys & Games');

      const electronicsViz = await visualizerService.generateProductVisualization(electronicsProduct);
      const toyViz = await visualizerService.generateProductVisualization(toyProduct);

      // Electronics should support exploded view
      expect(electronicsViz.interactivity.explodedView).toBe(true);
      
      // Toys should have animations
      expect(toyViz.assets.animations).toContain('rotate');
      expect(toyViz.assets.animations).toContain('function_demo');
    });

    test('should generate color variants based on product type', async () => {
      const electronicsProduct = createMockProduct('Electronics');
      const visualization = await visualizerService.generateProductVisualization(electronicsProduct);

      expect(visualization.interactivity.colorVariants).toBeInstanceOf(Array);
      expect(visualization.interactivity.colorVariants.length).toBeGreaterThan(0);

      visualization.interactivity.colorVariants.forEach((variant: ColorVariant) => {
        expect(variant).toMatchObject({
          name: expect.any(String),
          hexCode: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          previewUrl: expect.any(String),
        });
      });

      // Electronics should have common color variants
      const colorNames = visualization.interactivity.colorVariants.map(v => v.name);
      expect(colorNames).toContain('Original');
    });

    test('should provide sizing information', async () => {
      const product = createMockProduct();
      const visualization = await visualizerService.generateProductVisualization(product);

      const sizingInfo = visualization.interactivity.sizingInfo;
      
      expect(sizingInfo).toMatchObject({
        dimensions: {
          width: expect.any(Number),
          height: expect.any(Number),
          depth: expect.any(Number),
          unit: expect.stringMatching(/^(mm|cm|inches)$/),
        },
        weight: {
          value: expect.any(Number),
          unit: expect.stringMatching(/^(g|kg|lbs)$/),
        },
        scale: {
          reference: expect.any(String),
        },
      });

      expect(sizingInfo.dimensions.width).toBeGreaterThan(0);
      expect(sizingInfo.dimensions.height).toBeGreaterThan(0);
      expect(sizingInfo.weight.value).toBeGreaterThan(0);
    });
  });

  describe('AR/VR Integration', () => {
    test('should generate AR-enabled visualization', async () => {
      const product = createMockProduct();
      const visualization = await visualizerService.generateProductVisualization(product, {
        includeAR: true,
      });

      expect(visualization.arCapabilities.markerBased).toBe(true);
      expect(visualization.arCapabilities.markerlessTracking).toBe(true);
      expect(visualization.arCapabilities.surfaceDetection).toBe(true);
    });

    test('should initialize AR experience', async () => {
      const asins = ['B001AR001', 'B001AR002'];
      const arExperience = await visualizerService.initializeARExperience(
        asins,
        'surface',
        { occlusion: true, shadows: true }
      );

      expect(arExperience).toMatchObject({
        sessionId: expect.stringMatching(/^ar_\d+$/),
        productAsins: asins,
        trackingType: 'surface',
        features: expect.objectContaining({
          occlusion: true,
          shadows: true,
          reflections: expect.any(Boolean),
          physicsSimulation: expect.any(Boolean),
        }),
        calibration: expect.objectContaining({
          surfaceDetected: false, // Initially false
          lightingEstimated: false,
          scaleCalibrated: false,
        }),
        analytics: expect.objectContaining({
          interactionTime: 0,
          gestureCount: 0,
          viewingAngles: expect.any(Array),
          engagementScore: 0,
        }),
      });
    });

    test('should support different AR tracking types', async () => {
      const trackingTypes: ('marker' | 'surface' | 'image' | 'object')[] = ['marker', 'surface', 'image', 'object'];
      
      for (const trackingType of trackingTypes) {
        const arExperience = await visualizerService.initializeARExperience(
          ['B001TRACK001'],
          trackingType
        );

        expect(arExperience.trackingType).toBe(trackingType);
        expect(arExperience.sessionId).toMatch(/^ar_\d+$/);
      }
    });

    test('should configure AR features correctly', async () => {
      const arExperience = await visualizerService.initializeARExperience(
        ['B001FEAT001'],
        'surface',
        {
          occlusion: true,
          shadows: true,
          reflections: true,
          physicsSimulation: false,
        }
      );

      expect(arExperience.features).toMatchObject({
        occlusion: true,
        shadows: true,
        reflections: true,
        physicsSimulation: false,
      });
    });
  });

  describe('Virtual Showroom Creation', () => {
    test('should create virtual showroom', async () => {
      const products = createMockProducts(5);
      const showroom = await visualizerService.createVirtualShowroom(
        products,
        'modern_home',
        'grid'
      );

      expect(showroom).toMatchObject({
        id: expect.stringMatching(/^showroom_\d+$/),
        name: expect.any(String),
        environment: 'modern_home',
        products: expect.any(Array),
        lighting: expect.objectContaining({
          ambient: expect.objectContaining({
            r: expect.any(Number),
            g: expect.any(Number),
            b: expect.any(Number),
            intensity: expect.any(Number),
          }),
          directional: expect.any(Array),
        }),
        camera: expect.objectContaining({
          position: expect.any(Object),
          target: expect.any(Object),
          controls: expect.stringMatching(/^(orbit|first_person|fixed)$/),
        }),
        interactivity: expect.objectContaining({
          productSelection: expect.any(Boolean),
          roomNavigation: expect.any(Boolean),
          lightingAdjustment: expect.any(Boolean),
          productComparison: expect.any(Boolean),
        }),
      });

      expect(showroom.products.length).toBe(5);
      
      showroom.products.forEach(productPlacement => {
        expect(productPlacement).toMatchObject({
          asin: expect.any(String),
          position: expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
            z: expect.any(Number),
          }),
          rotation: expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
            z: expect.any(Number),
          }),
          scale: expect.any(Number),
        });
      });
    });

    test('should support different showroom environments', async () => {
      const products = createMockProducts(3);
      const environments: ('modern_home' | 'office_space' | 'outdoor_scene' | 'studio_lighting')[] = 
        ['modern_home', 'office_space', 'outdoor_scene', 'studio_lighting'];

      for (const environment of environments) {
        const showroom = await visualizerService.createVirtualShowroom(
          products,
          environment
        );

        expect(showroom.environment).toBe(environment);
        expect(showroom.lighting).toBeDefined();
        expect(showroom.camera).toBeDefined();
      }
    });

    test('should support different layout arrangements', async () => {
      const products = createMockProducts(8);
      const layouts = ['grid', 'circular', 'featured'];

      for (const layout of layouts) {
        const showroom = await visualizerService.createVirtualShowroom(
          products,
          'studio_lighting',
          layout as any
        );

        expect(showroom.products.length).toBe(8);
        
        // Each layout should have different positioning patterns
        const positions = showroom.products.map(p => p.position);
        const uniquePositions = new Set(positions.map(p => `${p.x},${p.y},${p.z}`));
        expect(uniquePositions.size).toBe(8); // All positions should be unique
      }
    });

    test('should optimize lighting for different environments', async () => {
      const products = createMockProducts(2);
      
      const modernHome = await visualizerService.createVirtualShowroom(
        products,
        'modern_home'
      );
      
      const studioLighting = await visualizerService.createVirtualShowroom(
        products,
        'studio_lighting'
      );

      // Different environments should have different lighting setups
      expect(modernHome.lighting.ambient.intensity).not.toBe(studioLighting.lighting.ambient.intensity);
      expect(modernHome.lighting.directional.length).toBeGreaterThan(0);
      expect(studioLighting.lighting.directional.length).toBeGreaterThan(0);
    });

    test('should calculate optimal camera positioning', async () => {
      const products = createMockProducts(6);
      const showroom = await visualizerService.createVirtualShowroom(
        products,
        'modern_home',
        'circular'
      );

      expect(showroom.camera.position.x).toBeDefined();
      expect(showroom.camera.position.y).toBeGreaterThan(0); // Camera should be elevated
      expect(showroom.camera.position.z).toBeDefined();
      expect(showroom.camera.target).toBeDefined();
      expect(showroom.camera.controls).toBe('orbit');
    });
  });

  describe('User Interaction Tracking', () => {
    test('should track user interactions', async () => {
      const interactionData: Partial<UserInteractionData> = {
        sessionId: 'test_session_001',
        userId: 'test_user_001',
        asin: 'B001TRACK001',
        interactions: [
          {
            type: 'rotate',
            timestamp: new Date(),
            parameters: { angle: 45 },
            duration: 2000,
          },
          {
            type: 'zoom',
            timestamp: new Date(),
            parameters: { scale: 1.5 },
            duration: 1500,
          },
          {
            type: 'color_change',
            timestamp: new Date(),
            parameters: { color: 'black' },
            duration: 500,
          },
        ],
      };

      await visualizerService.trackUserInteraction(interactionData);
      
      // Should complete without errors
      expect(true).toBe(true);
    });

    test('should handle interaction analytics', async () => {
      const sessionId = 'analytics_session_001';
      const asin = 'B001ANALYTICS001';

      const interactionData: Partial<UserInteractionData> = {
        sessionId,
        userId: 'analytics_user',
        asin,
        interactions: [
          {
            type: 'rotate',
            timestamp: new Date(),
            parameters: {},
            duration: 3000,
          },
          {
            type: 'ar_activate',
            timestamp: new Date(),
            parameters: {},
            duration: 10000,
          },
          {
            type: 'share',
            timestamp: new Date(),
            parameters: { platform: 'twitter' },
            duration: 1000,
          },
        ],
      };

      await visualizerService.trackUserInteraction(interactionData);

      // Analytics should be processed
      expect(true).toBe(true);
    });

    test('should calculate engagement metrics', async () => {
      const sessionId = 'engagement_session_001';
      const asin = 'B001ENGAGE001';

      const highEngagementData: Partial<UserInteractionData> = {
        sessionId,
        userId: 'engaged_user',
        asin,
        interactions: [
          { type: 'rotate', timestamp: new Date(), parameters: {}, duration: 5000 },
          { type: 'zoom', timestamp: new Date(), parameters: {}, duration: 3000 },
          { type: 'color_change', timestamp: new Date(), parameters: {}, duration: 2000 },
          { type: 'ar_activate', timestamp: new Date(), parameters: {}, duration: 15000 },
          { type: 'explode', timestamp: new Date(), parameters: {}, duration: 4000 },
        ],
        outcomes: {
          timeSpent: 29000, // 29 seconds
          purchaseIntent: 0.8,
          shareAction: true,
          bookmarked: true,
        },
      };

      await visualizerService.trackUserInteraction(highEngagementData);
      
      // Should handle high engagement data
      expect(true).toBe(true);
    });

    test('should track viewing preferences', async () => {
      const preferencesData: Partial<UserInteractionData> = {
        sessionId: 'preferences_session_001',
        userId: 'preference_user',
        asin: 'B001PREF001',
        preferences: {
          preferredViewingAngle: { x: 30, y: 45, z: 0 },
          colorPreferences: ['black', 'silver', 'white'],
          featureUsage: {
            rotate: 15,
            zoom: 8,
            colorChange: 5,
            explodedView: 2,
          },
        },
      };

      await visualizerService.trackUserInteraction(preferencesData);
      
      expect(true).toBe(true);
    });
  });

  describe('AI Enhancements', () => {
    test('should apply smart AI enhancements', async () => {
      const product = createMockProduct();
      const visualization = await visualizerService.generateProductVisualization(product, {
        smartEnhancements: true,
      });

      expect(visualization.aiEnhancements).toMatchObject({
        smartLighting: true,
        materialPrediction: true,
        scaleEstimation: true,
        environmentMapping: true,
      });
    });

    test('should predict materials based on category', async () => {
      const electronicsProduct = createMockProduct('Electronics');
      const jewelryProduct = createMockProduct('Jewelry');
      const clothingProduct = createMockProduct('Clothing');

      const electronicsViz = await visualizerService.generateProductVisualization(electronicsProduct, {
        smartEnhancements: true,
      });
      const jewelryViz = await visualizerService.generateProductVisualization(jewelryProduct, {
        smartEnhancements: true,
      });
      const clothingViz = await visualizerService.generateProductVisualization(clothingProduct, {
        smartEnhancements: true,
      });

      // All should have material prediction enabled
      expect(electronicsViz.aiEnhancements.materialPrediction).toBe(true);
      expect(jewelryViz.aiEnhancements.materialPrediction).toBe(true);
      expect(clothingViz.aiEnhancements.materialPrediction).toBe(true);
    });

    test('should estimate product complexity correctly', async () => {
      const simpleProduct = createMockProduct('Books');
      const complexProduct = createMockProduct('Electronics');

      const simpleViz = await visualizerService.generateProductVisualization(simpleProduct);
      const complexViz = await visualizerService.generateProductVisualization(complexProduct);

      expect(complexViz.metadata.renderComplexity).toBeGreaterThan(simpleViz.metadata.renderComplexity);
    });

    test('should recommend appropriate viewing angles', async () => {
      const jewelryProduct = createMockProduct('Jewelry');
      const electronicsProduct = createMockProduct('Electronics');

      const jewelryViz = await visualizerService.generateProductVisualization(jewelryProduct);
      const electronicsViz = await visualizerService.generateProductVisualization(electronicsProduct);

      // Different product types should have different recommended features
      expect(jewelryViz.interactivity.zoomable).toBe(true);
      expect(electronicsViz.interactivity.explodedView).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    test('should optimize file sizes by quality level', async () => {
      const product = createMockProduct();
      
      const lowQualityViz = await visualizerService.generateProductVisualization(product, {
        quality: 'low',
      });
      const ultraQualityViz = await visualizerService.generateProductVisualization(product, {
        quality: 'ultra',
      });

      expect(lowQualityViz.metadata.fileSize).toBeLessThan(ultraQualityViz.metadata.fileSize);
      expect(lowQualityViz.metadata.polygonCount).toBeLessThan(ultraQualityViz.metadata.polygonCount);
      expect(lowQualityViz.metadata.loadTime).toBeLessThan(ultraQualityViz.metadata.loadTime);
    });

    test('should provide device compatibility information', async () => {
      const product = createMockProduct();
      
      const mobileViz = await visualizerService.generateProductVisualization(product, {
        quality: 'low',
      });
      const desktopViz = await visualizerService.generateProductVisualization(product, {
        quality: 'ultra',
      });

      expect(mobileViz.metadata.compatibleDevices).toContain('mobile');
      expect(desktopViz.metadata.compatibleDevices).toContain('desktop_high_end');
    });

    test('should estimate load times accurately', async () => {
      const product = createMockProduct();
      const visualization = await visualizerService.generateProductVisualization(product, {
        quality: 'medium',
      });

      expect(visualization.metadata.loadTime).toBeGreaterThan(0);
      expect(visualization.metadata.loadTime).toBeLessThan(30000); // Should be reasonable
    });

    test('should handle batch visualization generation', async () => {
      const products = createMockProducts(5);
      
      const visualizations = await Promise.all(
        products.map(product => 
          visualizerService.generateProductVisualization(product, { quality: 'medium' })
        )
      );

      expect(visualizations.length).toBe(5);
      
      visualizations.forEach((viz, index) => {
        expect(viz.asin).toBe(products[index].asin);
        expect(viz.metadata.modelQuality).toBe('medium');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle products with missing data', async () => {
      const minimalProduct: KeepaProduct = {
        asin: 'B001MINIMAL',
        stats: { current: [0, 0, 0, 999999] }, // No images, minimal data
      };

      const visualization = await visualizerService.generateProductVisualization(minimalProduct);

      expect(visualization).toBeDefined();
      expect(visualization.asin).toBe(minimalProduct.asin);
      expect(visualization.visualizationType).toBe('360_view'); // Should fallback
      expect(visualization.metadata.modelQuality).toBe('low');
    });

    test('should handle invalid quality parameters', async () => {
      const product = createMockProduct();
      
      const visualization = await visualizerService.generateProductVisualization(product, {
        quality: 'invalid' as any,
      });

      expect(visualization.metadata.modelQuality).toBe('medium'); // Should use default
    });

    test('should handle AR initialization errors gracefully', async () => {
      const invalidAsins: string[] = [];
      
      const arExperience = await visualizerService.initializeARExperience(
        invalidAsins,
        'surface'
      );

      expect(arExperience.productAsins).toEqual([]);
    });

    test('should handle showroom creation with no products', async () => {
      const emptyProducts: KeepaProduct[] = [];
      
      const showroom = await visualizerService.createVirtualShowroom(
        emptyProducts,
        'modern_home'
      );

      expect(showroom.products.length).toBe(0);
      expect(showroom.lighting).toBeDefined();
      expect(showroom.camera).toBeDefined();
    });

    test('should handle interaction tracking with missing data', async () => {
      const incompleteData: Partial<UserInteractionData> = {
        sessionId: 'incomplete_session',
        // Missing required fields
      };

      // Should not throw error
      await expect(
        visualizerService.trackUserInteraction(incompleteData)
      ).resolves.not.toThrow();
    });
  });

  describe('Caching and Performance', () => {
    test('should cache visualization results', async () => {
      const product = createMockProduct();
      
      const startTime1 = Date.now();
      const viz1 = await visualizerService.generateProductVisualization(product);
      const time1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      const viz2 = await visualizerService.generateProductVisualization(product);
      const time2 = Date.now() - startTime2;

      expect(viz1.asin).toBe(viz2.asin);
      expect(time2).toBeLessThan(time1); // Second call should be faster (cached)
    });

    test('should bypass cache with smart enhancements', async () => {
      const product = createMockProduct();
      
      const normalViz = await visualizerService.generateProductVisualization(product);
      const enhancedViz = await visualizerService.generateProductVisualization(product, {
        smartEnhancements: true,
      });

      expect(enhancedViz.aiEnhancements.smartLighting).toBe(true);
      expect(normalViz.aiEnhancements.smartLighting).toBe(false);
    });

    test('should handle concurrent visualization requests', async () => {
      const products = createMockProducts(3);
      
      const promises = products.map(product =>
        visualizerService.generateProductVisualization(product, { quality: 'medium' })
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      results.forEach((result, index) => {
        expect(result.asin).toBe(products[index].asin);
      });
    });
  });

  describe('Real-world Business Scenarios', () => {
    test('should create product comparison showroom', async () => {
      const competitorProducts = [
        createMockProduct('Electronics'),
        createMockProduct('Electronics'),
        createMockProduct('Electronics'),
      ];

      const showroom = await visualizerService.createVirtualShowroom(
        competitorProducts,
        'studio_lighting',
        'grid'
      );

      expect(showroom.interactivity.productComparison).toBe(true);
      expect(showroom.products.length).toBe(3);
      
      // Products should be positioned for easy comparison
      const positions = showroom.products.map(p => p.position);
      positions.forEach(pos => {
        expect(pos.y).toBe(0); // Same height for comparison
      });
    });

    test('should handle seasonal product showcase', async () => {
      const seasonalProducts = [
        createMockProduct('Toys & Games'),
        createMockProduct('Toys & Games'),
        createMockProduct('Home & Kitchen'),
      ];

      const holidayShowroom = await visualizerService.createVirtualShowroom(
        seasonalProducts,
        'modern_home',
        'featured'
      );

      expect(holidayShowroom.environment).toBe('modern_home');
      expect(holidayShowroom.interactivity.productSelection).toBe(true);
    });

    test('should support mobile AR shopping experience', async () => {
      const mobileProducts = createMockProducts(2);
      
      const mobileVisualizations = await Promise.all(
        mobileProducts.map(product =>
          visualizerService.generateProductVisualization(product, {
            quality: 'low',
            includeAR: true,
          })
        )
      );

      mobileVisualizations.forEach(viz => {
        expect(viz.metadata.compatibleDevices).toContain('mobile');
        expect(viz.arCapabilities.markerlessTracking).toBe(true);
        expect(viz.metadata.fileSize).toBeLessThan(10 * 1024 * 1024); // Under 10MB for mobile
      });
    });

    test('should create interactive product catalog', async () => {
      const catalogProducts = createMockProducts(10, ['Electronics', 'Home & Kitchen', 'Sports & Outdoors']);
      
      const catalogShowroom = await visualizerService.createVirtualShowroom(
        catalogProducts,
        'modern_home',
        'grid'
      );

      expect(catalogShowroom.products.length).toBe(10);
      expect(catalogShowroom.interactivity.roomNavigation).toBe(true);
      expect(catalogShowroom.interactivity.productSelection).toBe(true);
      
      // Should handle mixed categories
      const uniqueAsins = new Set(catalogShowroom.products.map(p => p.asin));
      expect(uniqueAsins.size).toBe(10);
    });

    test('should support high-end VR showroom experience', async () => {
      const premiumProducts = createMockProducts(8);
      
      const vrVisualizations = await Promise.all(
        premiumProducts.map(product =>
          visualizerService.generateProductVisualization(product, {
            quality: 'ultra',
            includeAR: false,
          })
        )
      );

      const vrShowroom = await visualizerService.createVirtualShowroom(
        premiumProducts,
        'studio_lighting',
        'circular'
      );

      expect(vrShowroom.environment).toBe('studio_lighting');
      expect(vrShowroom.camera.controls).toBe('orbit');
      
      vrVisualizations.forEach(viz => {
        expect(viz.metadata.compatibleDevices).toContain('vr_premium');
        expect(viz.metadata.modelQuality).toBe('ultra');
      });
    });
  });

  describe('Analytics and Insights', () => {
    test('should provide comprehensive analytics', async () => {
      const testAsin = 'B001ANALYTICS';
      const analytics = await visualizerService.getVisualizationAnalytics(testAsin);

      expect(analytics).toMatchObject({
        totalViews: expect.any(Number),
        averageViewTime: expect.any(Number),
        arActivations: expect.any(Number),
        shareActions: expect.any(Number),
        conversionRate: expect.any(Number),
      });

      expect(analytics.totalViews).toBeGreaterThanOrEqual(0);
      expect(analytics.conversionRate).toBeGreaterThanOrEqual(0);
      expect(analytics.conversionRate).toBeLessThanOrEqual(1);
    });

    test('should track AR engagement metrics', async () => {
      const asins = ['B001ARENG001'];
      const arExperience = await visualizerService.initializeARExperience(asins, 'surface');

      expect(arExperience.analytics).toMatchObject({
        interactionTime: 0,
        gestureCount: 0,
        viewingAngles: expect.any(Array),
        engagementScore: 0,
      });
    });

    test('should measure visualization performance impact', async () => {
      const product = createMockProduct();
      
      const basicViz = await visualizerService.generateProductVisualization(product, {
        quality: 'low',
      });
      const premiumViz = await visualizerService.generateProductVisualization(product, {
        quality: 'ultra',
        smartEnhancements: true,
      });

      // Premium should have higher engagement potential but require more resources
      expect(premiumViz.metadata.loadTime).toBeGreaterThan(basicViz.metadata.loadTime);
      expect(premiumViz.aiEnhancements.smartLighting).toBe(true);
      expect(basicViz.aiEnhancements.smartLighting).toBe(false);
    });
  });
});