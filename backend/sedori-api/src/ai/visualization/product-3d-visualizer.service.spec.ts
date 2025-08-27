import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
// Redis token is provided directly in the test
import { 
  Product3DVisualizerService, 
  Product3DVisualizationRequestDto,
  ModelFormat,
  QualityLevel,
  AnimationType 
} from './product-3d-visualizer.service';
import Redis from 'ioredis';

describe('Product3DVisualizerService', () => {
  let service: Product3DVisualizerService;
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
        Product3DVisualizerService,
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

    service = module.get<Product3DVisualizerService>(Product3DVisualizerService);
  });

  const createValidRequest = (): Product3DVisualizationRequestDto => ({
    productId: 'test-product-1',
    productName: 'Test Product',
    category: 'Electronics',
    imageUrls: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
    ],
    productDescription: 'A test electronic product',
    outputFormat: ModelFormat.GLB,
    quality: QualityLevel.MEDIUM,
    animations: [AnimationType.ROTATION, AnimationType.FLOATING],
    generateMaterials: true,
    generateTextures: true,
    maxPolygons: 5000,
    textureResolution: 1024,
    generateThumbnails: true,
    aiConfidenceThreshold: 0.8,
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateVisualization', () => {
    it('should successfully generate 3D visualization', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null); // No cache

      const result = await service.generateVisualization(request);

      expect(result).toBeDefined();
      expect(result.productId).toBe(request.productId);
      expect(result.generationId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.model).toBeDefined();
      expect(result.materials).toBeInstanceOf(Array);
      expect(result.animations).toBeInstanceOf(Array);
      expect(result.lighting).toBeInstanceOf(Array);
      expect(result.thumbnails).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.viewer).toBeDefined();
      expect(result.analytics).toBeDefined();
      expect(result.recommendations).toBeDefined();
    }, 30000); // Increase timeout for 3D generation

    it('should return cached result when available', async () => {
      const request = createValidRequest();

      const cachedResult = {
        productId: 'cached-product',
        generationId: 'cached-gen-id',
        status: 'completed' as const,
        model: {
          url: 'https://cdn.example.com/cached-model.glb',
          format: ModelFormat.GLB,
          fileSize: 1024,
          polygonCount: 2000,
          textureCount: 3,
          animationCount: 2,
          qualityLevel: QualityLevel.MEDIUM,
          optimized: {
            mobile: false,
            web: true,
            ar: false,
            vr: false,
          },
        },
        alternatives: [],
        materials: [],
        animations: [],
        lighting: [],
        camera: {
          position: [3, 2, 3] as [number, number, number],
          target: [0, 0, 0] as [number, number, number],
          fov: 45,
          near: 0.1,
          far: 1000,
          controlsEnabled: true,
          autoRotate: false,
          zoomLimits: { min: 1, max: 10 },
        },
        thumbnails: {
          small: 'thumb_small.jpg',
          medium: 'thumb_medium.jpg',
          large: 'thumb_large.jpg',
          preview: [],
        },
        metadata: {
          generatedAt: new Date(),
          processingTime: 10000,
          aiConfidence: 0.85,
          qualityScore: 0.8,
          optimizationApplied: [],
          sourceImages: 3,
          generationMethod: 'ai_photogrammetry_plus',
        },
        viewer: {
          embedCode: '<iframe></iframe>',
          directUrl: 'https://viewer.example.com',
          iframeUrl: 'https://viewer.example.com/embed',
          apiEndpoints: {
            loadModel: '/api/load',
            updateMaterial: '/api/material',
            playAnimation: '/api/animate',
            captureScreenshot: '/api/screenshot',
          },
        },
        analytics: {
          estimatedLoadTime: 2000,
          mobileCompatibility: true,
          arCompatibility: false,
          vrCompatibility: false,
          browserSupport: ['Chrome', 'Firefox', 'Safari'],
          performanceRating: 8,
        },
        recommendations: {
          optimization: [],
          enhancement: [],
          monetization: [],
          marketing: [],
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.generateVisualization(request);

      expect(result.productId).toBe(cachedResult.productId);
      expect(result.generationId).toBe(cachedResult.generationId);
    });

    it('should validate input parameters', async () => {
      const invalidRequest = {
        productId: '', // Empty product ID
        maxPolygons: 5000, // Valid polygon count
        imageUrls: ['https://example.com/image1.jpg'], // Add required field
      };

      await expect(service.generateVisualization(invalidRequest as any)).rejects.toThrow();
    }, 10000);

    it('should generate different quality levels', async () => {
      const qualityLevels = [QualityLevel.LOW, QualityLevel.MEDIUM, QualityLevel.HIGH, QualityLevel.ULTRA];

      for (const quality of qualityLevels) {
        const request = createValidRequest();
        request.quality = quality;

        mockRedis.get.mockResolvedValue(null);

        const result = await service.generateVisualization(request);

        expect(result.model.qualityLevel).toBe(quality);
        
        // Verify polygon count correlates with quality
        if (quality === QualityLevel.LOW) {
          expect(result.model.polygonCount).toBeLessThan(2000);
        } else if (quality === QualityLevel.ULTRA) {
          expect(result.model.polygonCount).toBeGreaterThan(5000);
        }
      }
    }, 60000); // Extended timeout for multiple generations
  });

  describe('model generation', () => {
    it('should generate model with proper format', async () => {
      const request = createValidRequest();
      request.outputFormat = ModelFormat.GLTF;

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.model.format).toBe(ModelFormat.GLTF);
      expect(result.model.url).toContain('.gltf');
    });

    it('should generate materials when requested', async () => {
      const request = createValidRequest();
      request.generateMaterials = true;
      request.generateTextures = true;

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.materials.length).toBeGreaterThan(0);
      
      result.materials.forEach(material => {
        expect(material.id).toBeDefined();
        expect(material.name).toBeDefined();
        expect(['pbr', 'phong', 'lambert', 'toon', 'unlit']).toContain(material.type);
        expect(material.properties).toBeDefined();
        expect(material.properties.baseColor).toBeDefined();
        expect(material.properties.metallic).toBeGreaterThanOrEqual(0);
        expect(material.properties.metallic).toBeLessThanOrEqual(1);
        expect(material.properties.roughness).toBeGreaterThanOrEqual(0);
        expect(material.properties.roughness).toBeLessThanOrEqual(1);
      });
    });

    it('should generate animations when requested', async () => {
      const request = createValidRequest();
      request.animations = [AnimationType.ROTATION, AnimationType.PULSE, AnimationType.EXPLODED_VIEW];

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.animations.length).toBe(3);
      
      result.animations.forEach(animation => {
        expect(animation.id).toBeDefined();
        expect(animation.name).toBeDefined();
        expect(request.animations).toContain(animation.type);
        expect(animation.duration).toBeGreaterThan(0);
        expect(typeof animation.loop).toBe('boolean');
        expect(typeof animation.autoplay).toBe('boolean');
        expect(animation.keyframes).toBeInstanceOf(Array);
        expect(animation.keyframes.length).toBeGreaterThan(0);
      });
    });

    it('should optimize for mobile when requested', async () => {
      const request = createValidRequest();
      request.optimizeForMobile = true;

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.model.optimized.mobile).toBe(true);
      expect(result.model.polygonCount).toBeLessThan(3000); // Mobile optimization
      expect(result.analytics.mobileCompatibility).toBe(true);
    });

    it('should generate AR/VR optimized models', async () => {
      const request = createValidRequest();
      request.enableAR = true;
      request.enableVR = true;

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.model.optimized.ar).toBe(true);
      expect(result.model.optimized.vr).toBe(true);
      expect(result.analytics.arCompatibility).toBe(true);
      expect(result.analytics.vrCompatibility).toBe(true);
    });
  });

  describe('getGenerationStatus', () => {
    it('should return generation status and progress', async () => {
      const generationId = 'test-generation-id';
      
      const mockStatusData = {
        status: 'processing',
        stages: [
          { name: 'image_analysis', status: 'completed', progress: 100 },
          { name: 'model_generation', status: 'running', progress: 50 },
          { name: 'optimization', status: 'pending', progress: 0 },
        ],
        progress: 50,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockStatusData));

      const status = await service.getGenerationStatus(generationId);

      expect(status).toBeDefined();
      expect(status!.status).toBe('processing');
      expect(status!.stages).toBeInstanceOf(Array);
      expect(status!.progress).toBeGreaterThanOrEqual(0);
      expect(status!.progress).toBeLessThanOrEqual(100);
    });

    it('should return null for non-existent generation', async () => {
      mockRedis.get.mockResolvedValue(null);

      const status = await service.getGenerationStatus('non-existent-id');

      expect(status).toBeNull();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return service performance metrics', async () => {
      const metrics = await service.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalGenerations).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.averageQualityScore).toBeGreaterThan(0);
      expect(metrics.averageQualityScore).toBeLessThanOrEqual(1);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
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
      expect(health.details.generation).toBeDefined();
      expect(health.details.performance).toBeDefined();
    });

    it('should return unhealthy status when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBeDefined();
    });
  });

  describe('analytics and recommendations', () => {
    it('should provide performance analytics', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.analytics.estimatedLoadTime).toBeGreaterThan(0);
      expect(typeof result.analytics.mobileCompatibility).toBe('boolean');
      expect(typeof result.analytics.arCompatibility).toBe('boolean');
      expect(typeof result.analytics.vrCompatibility).toBe('boolean');
      expect(result.analytics.browserSupport).toBeInstanceOf(Array);
      expect(result.analytics.browserSupport.length).toBeGreaterThan(0);
      expect(result.analytics.performanceRating).toBeGreaterThan(0);
      expect(result.analytics.performanceRating).toBeLessThanOrEqual(10);
    });

    it('should provide actionable recommendations', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.recommendations.optimization).toBeInstanceOf(Array);
      expect(result.recommendations.enhancement).toBeInstanceOf(Array);
      expect(result.recommendations.monetization).toBeInstanceOf(Array);
      expect(result.recommendations.marketing).toBeInstanceOf(Array);

      // Should provide at least some recommendations
      const totalRecommendations = 
        result.recommendations.optimization.length +
        result.recommendations.enhancement.length +
        result.recommendations.monetization.length +
        result.recommendations.marketing.length;
      
      expect(totalRecommendations).toBeGreaterThan(0);
    });

    it('should generate proper lighting setups', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.lighting).toBeInstanceOf(Array);
      expect(result.lighting.length).toBeGreaterThan(0);

      result.lighting.forEach(setup => {
        expect(setup.name).toBeDefined();
        expect(setup.lights).toBeInstanceOf(Array);
        expect(setup.lights.length).toBeGreaterThan(0);
        expect(setup.environment).toBeDefined();
        expect(setup.environment.ambientLight).toBeDefined();

        setup.lights.forEach(light => {
          expect(['directional', 'point', 'spot', 'area', 'environment']).toContain(light.type);
          expect(light.position).toHaveLength(3);
          expect(light.color).toBeDefined();
          expect(light.intensity).toBeGreaterThan(0);
          expect(typeof light.shadows).toBe('boolean');
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing image URLs', async () => {
      const request = createValidRequest();
      request.imageUrls = undefined;
      request.existingModelUrl = undefined;

      await expect(service.generateVisualization(request)).rejects.toThrow();
    });

    it('should handle Redis failures gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      const request = createValidRequest();

      const result = await service.generateVisualization(request);
      expect(result).toBeDefined();
    });

    it('should handle 3D generation failures', async () => {
      const request = createValidRequest();
      request.imageUrls = ['invalid-url']; // Invalid image URL

      mockRedis.get.mockResolvedValue(null);

      // Should handle gracefully and still return a result
      const result = await service.generateVisualization(request);
      expect(result).toBeDefined();
    });
  });

  describe('viewer integration', () => {
    it('should provide viewer integration', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.viewer.embedCode).toBeDefined();
      expect(result.viewer.embedCode).toContain('iframe');
      expect(result.viewer.directUrl).toBeDefined();
      expect(result.viewer.iframeUrl).toBeDefined();
      expect(result.viewer.apiEndpoints).toBeDefined();
      expect(result.viewer.apiEndpoints.loadModel).toBeDefined();
      expect(result.viewer.apiEndpoints.updateMaterial).toBeDefined();
      expect(result.viewer.apiEndpoints.playAnimation).toBeDefined();
      expect(result.viewer.apiEndpoints.captureScreenshot).toBeDefined();
    });
  });

  describe('caching behavior', () => {
    it('should cache successful generations', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      await service.generateVisualization(request);

      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should use different cache keys for different requests', async () => {
      const request1 = createValidRequest();
      request1.productId = 'product-1';
      request1.quality = QualityLevel.LOW;

      const request2 = createValidRequest();
      request2.productId = 'product-2';
      request2.quality = QualityLevel.HIGH;

      mockRedis.get.mockResolvedValue(null);

      await service.generateVisualization(request1);
      await service.generateVisualization(request2);

      // Verify different cache keys were used
      const calls = mockRedis.get.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });
  });

  describe('thumbnails and previews', () => {
    it('should generate thumbnails when requested', async () => {
      const request = createValidRequest();
      request.generateThumbnails = true;

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.thumbnails.small).toBeDefined();
      expect(result.thumbnails.medium).toBeDefined();
      expect(result.thumbnails.large).toBeDefined();
      expect(result.thumbnails.preview).toBeInstanceOf(Array);
      expect(result.thumbnails.preview.length).toBeGreaterThan(0);
    });
  });

  describe('metadata and quality metrics', () => {
    it('should provide comprehensive metadata', async () => {
      const request = createValidRequest();

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateVisualization(request);

      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.aiConfidence).toBeGreaterThan(0);
      expect(result.metadata.aiConfidence).toBeLessThanOrEqual(1);
      expect(result.metadata.qualityScore).toBeGreaterThan(0);
      expect(result.metadata.qualityScore).toBeLessThanOrEqual(1);
      expect(result.metadata.optimizationApplied).toBeInstanceOf(Array);
      expect(result.metadata.sourceImages).toBe(request.imageUrls!.length);
      expect(result.metadata.generationMethod).toBeDefined();
    });
  });
});