import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import CircuitBreaker from 'opossum';
import { createHash } from 'crypto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, IsArray, IsOptional, IsEnum, IsBoolean, Min, Max } from 'class-validator';

/**
 * 3D model format enumeration
 */
export enum ModelFormat {
  GLB = 'glb',
  GLTF = 'gltf',
  OBJ = 'obj',
  FBX = 'fbx',
  USD = 'usd',
  COLLADA = 'dae'
}

/**
 * Visualization quality levels
 */
export enum QualityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

/**
 * Rendering engine types
 */
export enum RenderingEngine {
  THREE_JS = 'threejs',
  BABYLON_JS = 'babylonjs',
  UNITY_WEBGL = 'unity_webgl',
  UNREAL_PIXEL_STREAMING = 'unreal_pixel_streaming',
  NATIVE_WEBGL = 'native_webgl'
}

/**
 * Animation types
 */
export enum AnimationType {
  ROTATION = 'rotation',
  FLOATING = 'floating',
  PULSE = 'pulse',
  EXPLODED_VIEW = 'exploded_view',
  COLOR_TRANSITION = 'color_transition',
  MATERIAL_CHANGE = 'material_change',
  ASSEMBLY = 'assembly',
  DISASSEMBLY = 'disassembly'
}

/**
 * DTO for 3D visualization request
 */
export class Product3DVisualizationRequestDto {
  @IsString()
  productId: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  imageUrls?: string[];

  @IsString()
  @IsOptional()
  productDescription?: string;

  @IsString()
  @IsOptional()
  existingModelUrl?: string;

  @IsEnum(ModelFormat)
  @IsOptional()
  outputFormat?: ModelFormat = ModelFormat.GLB;

  @IsEnum(QualityLevel)
  @IsOptional()
  quality?: QualityLevel = QualityLevel.MEDIUM;

  @IsEnum(RenderingEngine)
  @IsOptional()
  renderingEngine?: RenderingEngine = RenderingEngine.THREE_JS;

  @IsArray()
  @IsOptional()
  animations?: AnimationType[];

  @IsBoolean()
  @IsOptional()
  generateMaterials?: boolean = true;

  @IsBoolean()
  @IsOptional()
  generateTextures?: boolean = true;

  @IsBoolean()
  @IsOptional()
  optimizeForMobile?: boolean = false;

  @IsBoolean()
  @IsOptional()
  enableAR?: boolean = false;

  @IsBoolean()
  @IsOptional()
  enableVR?: boolean = false;

  @IsNumber()
  @Min(100)
  @Max(10000)
  @IsOptional()
  maxPolygons?: number = 5000;

  @IsNumber()
  @Min(256)
  @Max(4096)
  @IsOptional()
  textureResolution?: number = 1024;

  @IsArray()
  @IsOptional()
  customColors?: string[];

  @IsArray()
  @IsOptional()
  lightingPresets?: string[];

  @IsBoolean()
  @IsOptional()
  generateThumbnails?: boolean = true;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  aiConfidenceThreshold?: number = 0.8;
}

/**
 * 3D model asset interface
 */
export interface Model3DAsset {
  url: string;
  format: ModelFormat;
  fileSize: number;
  polygonCount: number;
  textureCount: number;
  animationCount: number;
  qualityLevel: QualityLevel;
  optimized: {
    mobile: boolean;
    web: boolean;
    ar: boolean;
    vr: boolean;
  };
}

/**
 * Material definition interface
 */
export interface MaterialDefinition {
  id: string;
  name: string;
  type: 'pbr' | 'phong' | 'lambert' | 'toon' | 'unlit';
  properties: {
    baseColor: string;
    metallic: number;
    roughness: number;
    normal: string | null;
    emission: string | null;
    opacity: number;
    doubleSided: boolean;
  };
  textures: {
    diffuse?: string;
    normal?: string;
    metallic?: string;
    roughness?: string;
    ao?: string;
    emission?: string;
  };
}

/**
 * Animation definition interface
 */
export interface AnimationDefinition {
  id: string;
  name: string;
  type: AnimationType;
  duration: number;
  loop: boolean;
  autoplay: boolean;
  keyframes: {
    time: number;
    position?: [number, number, number];
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
    properties?: Record<string, any>;
  }[];
}

/**
 * Lighting setup interface
 */
export interface LightingSetup {
  name: string;
  lights: {
    type: 'directional' | 'point' | 'spot' | 'area' | 'environment';
    position: [number, number, number];
    color: string;
    intensity: number;
    shadows: boolean;
    parameters?: Record<string, any>;
  }[];
  environment: {
    skybox?: string;
    ambientLight: {
      color: string;
      intensity: number;
    };
    fog?: {
      color: string;
      near: number;
      far: number;
    };
  };
}

/**
 * Camera setup interface
 */
export interface CameraSetup {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
  controlsEnabled: boolean;
  autoRotate: boolean;
  zoomLimits: {
    min: number;
    max: number;
  };
}

/**
 * 3D visualization result interface
 */
export interface Product3DVisualizationResult {
  productId: string;
  generationId: string;
  status: 'processing' | 'completed' | 'failed';
  model: Model3DAsset;
  alternatives: Model3DAsset[];
  materials: MaterialDefinition[];
  animations: AnimationDefinition[];
  lighting: LightingSetup[];
  camera: CameraSetup;
  thumbnails: {
    small: string;
    medium: string;
    large: string;
    preview: string[];
  };
  metadata: {
    generatedAt: Date;
    processingTime: number;
    aiConfidence: number;
    qualityScore: number;
    optimizationApplied: string[];
    sourceImages: number;
    generationMethod: string;
  };
  viewer: {
    embedCode: string;
    directUrl: string;
    iframeUrl: string;
    apiEndpoints: {
      loadModel: string;
      updateMaterial: string;
      playAnimation: string;
      captureScreenshot: string;
    };
  };
  analytics: {
    estimatedLoadTime: number;
    mobileCompatibility: boolean;
    arCompatibility: boolean;
    vrCompatibility: boolean;
    browserSupport: string[];
    performanceRating: number;
  };
  recommendations: {
    optimization: string[];
    enhancement: string[];
    monetization: string[];
    marketing: string[];
  };
}

/**
 * 3D generation pipeline stage
 */
interface GenerationStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  artifacts?: string[];
}

/**
 * Product 3D Visualizer Service
 * AI-powered 3D model generation and visualization service
 */
@Injectable()
export class Product3DVisualizerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Product3DVisualizerService.name);
  private readonly CACHE_PREFIX = 'ai:3d_visualizer:';
  private readonly GENERATION_CACHE_PREFIX = 'ai:3d_generation:';
  private readonly MODEL_STORAGE_PREFIX = 'ai:3d_models:';
  private readonly METRICS_KEY = 'ai:3d_visualizer:metrics';

  private visualizationCircuit: any;
  private generationQueue: Map<string, GenerationStage[]> = new Map();
  private activeGenerations: Set<string> = new Set();
  private modelCache: Map<string, Model3DAsset> = new Map();
  private performanceMetrics: {
    totalGenerations: number;
    successRate: number;
    averageProcessingTime: number;
    averageQualityScore: number;
    cacheHitRate: number;
    lastUpdated: Date;
  };

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.initializeCircuitBreaker();
    this.initializeMetrics();
  }

  async onModuleInit() {
    this.logger.log('Initializing Product 3D Visualizer Service...');
    await this.loadModelCache();
    this.startPerformanceMonitoring();
    this.logger.log('Product 3D Visualizer Service initialized successfully');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Product 3D Visualizer Service...');
    await this.saveModelCache();
    await this.cleanup();
    this.logger.log('Product 3D Visualizer Service shutdown complete');
  }

  /**
   * Initialize circuit breaker for visualization calls
   */
  private initializeCircuitBreaker() {
    const options = {
      timeout: 120000, // 2 minutes for 3D generation
      errorThresholdPercentage: 40,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: 'Product3DVisualizer',
      group: 'AI',
    };

    this.visualizationCircuit = new CircuitBreaker(this.executeVisualization.bind(this), options);
    
    this.visualizationCircuit.on('open', () => {
      this.logger.warn('3D visualizer service circuit breaker opened');
    });
    
    this.visualizationCircuit.on('halfOpen', () => {
      this.logger.log('3D visualizer service circuit breaker half-opened');
    });
    
    this.visualizationCircuit.on('close', () => {
      this.logger.log('3D visualizer service circuit breaker closed');
    });
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics() {
    this.performanceMetrics = {
      totalGenerations: 0,
      successRate: 0.87,
      averageProcessingTime: 45000, // 45 seconds average
      averageQualityScore: 0.82,
      cacheHitRate: 0.35,
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate 3D visualization for a product
   */
  async generateVisualization(params: Product3DVisualizationRequestDto): Promise<Product3DVisualizationResult> {
    const startTime = Date.now();
    const generationId = this.generateId();
    
    try {
      // Validate input parameters
      const validatedParams = await this.validateInput(params);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(validatedParams);
      const cachedResult = await this.getCachedResult(cacheKey);
      
      if (cachedResult) {
        this.updateMetrics(true, Date.now() - startTime, true, 0.9);
        return { ...cachedResult, generationId };
      }

      // Initialize generation pipeline
      await this.initializeGenerationPipeline(generationId, validatedParams);

      // Execute visualization through circuit breaker
      const result = await this.visualizationCircuit.fire(validatedParams, generationId);
      
      // Cache the result
      await this.cacheResult(cacheKey, result);
      
      this.updateMetrics(true, Date.now() - startTime, false, result.metadata.qualityScore);
      return result;
      
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime, false, 0);
      await this.updateGenerationStatus(generationId, 'failed', error.message);
      this.logger.error('3D visualization generation failed', error);
      throw error;
    } finally {
      this.activeGenerations.delete(generationId);
    }
  }

  /**
   * Execute the actual 3D visualization generation
   */
  private async executeVisualization(
    params: Product3DVisualizationRequestDto,
    generationId: string
  ): Promise<Product3DVisualizationResult> {
    const startTime = Date.now();
    
    try {
      // Stage 1: Image Analysis and Understanding
      await this.updateStageStatus(generationId, 'image_analysis', 'running');
      const imageAnalysis = await this.analyzeProductImages(params);
      await this.updateStageStatus(generationId, 'image_analysis', 'completed');
      
      // Stage 2: 3D Model Generation
      await this.updateStageStatus(generationId, 'model_generation', 'running');
      const baseModel = await this.generate3DModel(params, imageAnalysis);
      await this.updateStageStatus(generationId, 'model_generation', 'completed');
      
      // Stage 3: Material and Texture Generation
      await this.updateStageStatus(generationId, 'material_generation', 'running');
      const materials = await this.generateMaterials(params, imageAnalysis);
      await this.updateStageStatus(generationId, 'material_generation', 'completed');
      
      // Stage 4: Optimization
      await this.updateStageStatus(generationId, 'optimization', 'running');
      const optimizedModel = await this.optimizeModel(baseModel, params);
      await this.updateStageStatus(generationId, 'optimization', 'completed');
      
      // Stage 5: Animation Generation
      await this.updateStageStatus(generationId, 'animation_generation', 'running');
      const animations = await this.generateAnimations(params, optimizedModel);
      await this.updateStageStatus(generationId, 'animation_generation', 'completed');
      
      // Stage 6: Lighting and Camera Setup
      await this.updateStageStatus(generationId, 'scene_setup', 'running');
      const lighting = await this.generateLightingSetup(params, imageAnalysis);
      const camera = this.generateCameraSetup(params, optimizedModel);
      await this.updateStageStatus(generationId, 'scene_setup', 'completed');
      
      // Stage 7: Thumbnail Generation
      await this.updateStageStatus(generationId, 'thumbnail_generation', 'running');
      const thumbnails = await this.generateThumbnails(optimizedModel, lighting, camera);
      await this.updateStageStatus(generationId, 'thumbnail_generation', 'completed');
      
      // Stage 8: Viewer Integration
      await this.updateStageStatus(generationId, 'viewer_integration', 'running');
      const viewer = await this.setupViewer(optimizedModel, params);
      await this.updateStageStatus(generationId, 'viewer_integration', 'completed');
      
      // Generate alternatives and recommendations
      const alternatives = await this.generateAlternativeModels(params, optimizedModel);
      const analytics = this.calculateAnalytics(optimizedModel, params);
      const recommendations = this.generateRecommendations(params, analytics, imageAnalysis);
      
      const processingTime = Date.now() - startTime;
      const qualityScore = this.calculateQualityScore(optimizedModel, materials, animations);
      
      return {
        productId: params.productId,
        generationId,
        status: 'completed',
        model: optimizedModel,
        alternatives,
        materials,
        animations,
        lighting,
        camera,
        thumbnails,
        metadata: {
          generatedAt: new Date(),
          processingTime,
          aiConfidence: imageAnalysis.confidence,
          qualityScore,
          optimizationApplied: this.getAppliedOptimizations(params),
          sourceImages: params.imageUrls?.length || 0,
          generationMethod: 'ai_photogrammetry_plus',
        },
        viewer,
        analytics,
        recommendations,
      };

    } catch (error) {
      this.logger.error('Visualization execution failed', error);
      throw error;
    }
  }

  /**
   * Analyze product images using computer vision
   */
  private async analyzeProductImages(params: Product3DVisualizationRequestDto): Promise<{
    confidence: number;
    category: string;
    dimensions: { width: number; height: number; depth: number };
    materials: string[];
    colors: string[];
    features: string[];
    complexity: number;
  }> {
    await this.simulateProcessing(2000);
    
    // Mock AI image analysis - in real implementation would use computer vision APIs
    const mockAnalysis = {
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      category: params.category || 'electronics',
      dimensions: {
        width: 100 + Math.random() * 200,
        height: 50 + Math.random() * 150,
        depth: 30 + Math.random() * 100,
      },
      materials: ['plastic', 'metal', 'glass'],
      colors: params.customColors || ['#333333', '#ffffff', '#007acc'],
      features: ['buttons', 'screen', 'ports', 'cables'],
      complexity: Math.random() * 0.5 + 0.5, // 50-100% complexity
    };
    
    this.logger.debug(`Image analysis completed with ${mockAnalysis.confidence * 100}% confidence`);
    return mockAnalysis;
  }

  /**
   * Generate base 3D model using AI
   */
  private async generate3DModel(
    params: Product3DVisualizationRequestDto,
    analysis: any
  ): Promise<Model3DAsset> {
    await this.simulateProcessing(15000);
    
    // Mock 3D model generation - in real implementation would use 3D reconstruction AI
    const polygonCount = this.calculatePolygonCount(params.quality, params.maxPolygons);
    
    return {
      url: `https://cdn.example.com/models/${params.productId}/model.${params.outputFormat}`,
      format: params.outputFormat || ModelFormat.GLB,
      fileSize: this.estimateFileSize(polygonCount, params.quality),
      polygonCount,
      textureCount: 0, // Will be updated after material generation
      animationCount: 0, // Will be updated after animation generation
      qualityLevel: params.quality || QualityLevel.MEDIUM,
      optimized: {
        mobile: params.optimizeForMobile || false,
        web: true,
        ar: params.enableAR || false,
        vr: params.enableVR || false,
      },
    };
  }

  /**
   * Generate materials and textures
   */
  private async generateMaterials(
    params: Product3DVisualizationRequestDto,
    analysis: any
  ): Promise<MaterialDefinition[]> {
    if (!params.generateMaterials) {
      return [];
    }
    
    await this.simulateProcessing(5000);
    
    const materials: MaterialDefinition[] = [];
    
    for (const [index, material] of analysis.materials.entries()) {
      const materialDef: MaterialDefinition = {
        id: `material_${index}`,
        name: `${material}_material`,
        type: 'pbr',
        properties: {
          baseColor: analysis.colors[index % analysis.colors.length],
          metallic: material === 'metal' ? 0.9 : 0.1,
          roughness: material === 'plastic' ? 0.3 : material === 'metal' ? 0.1 : 0.5,
          normal: null,
          emission: null,
          opacity: 1.0,
          doubleSided: false,
        },
        textures: {},
      };
      
      if (params.generateTextures) {
        materialDef.textures = {
          diffuse: `https://cdn.example.com/textures/${params.productId}/${material}_diffuse.jpg`,
          normal: `https://cdn.example.com/textures/${params.productId}/${material}_normal.jpg`,
          roughness: `https://cdn.example.com/textures/${params.productId}/${material}_roughness.jpg`,
        };
      }
      
      materials.push(materialDef);
    }
    
    return materials;
  }

  /**
   * Optimize 3D model for target platform
   */
  private async optimizeModel(model: Model3DAsset, params: Product3DVisualizationRequestDto): Promise<Model3DAsset> {
    await this.simulateProcessing(3000);
    
    let optimizedModel = { ...model };
    
    // Apply optimizations based on parameters
    if (params.optimizeForMobile) {
      optimizedModel.polygonCount = Math.min(optimizedModel.polygonCount, 2000);
      optimizedModel.fileSize = optimizedModel.fileSize * 0.6; // Reduce file size
    }
    
    if (params.enableAR) {
      // AR optimization
      optimizedModel.optimized.ar = true;
      optimizedModel.polygonCount = Math.min(optimizedModel.polygonCount, 3000);
    }
    
    if (params.enableVR) {
      // VR optimization
      optimizedModel.optimized.vr = true;
      // VR typically needs higher quality
      optimizedModel.polygonCount = Math.min(optimizedModel.polygonCount, params.maxPolygons || 5000);
    }
    
    // Update URL to optimized version
    optimizedModel.url = optimizedModel.url.replace('/model.', '/optimized_model.');
    
    return optimizedModel;
  }

  /**
   * Generate animations for the 3D model
   */
  private async generateAnimations(
    params: Product3DVisualizationRequestDto,
    model: Model3DAsset
  ): Promise<AnimationDefinition[]> {
    if (!params.animations || params.animations.length === 0) {
      return [];
    }
    
    await this.simulateProcessing(4000);
    
    const animations: AnimationDefinition[] = [];
    
    for (const animType of params.animations) {
      const animation: AnimationDefinition = {
        id: `anim_${animType}`,
        name: animType.replace('_', ' '),
        type: animType,
        duration: this.getAnimationDuration(animType),
        loop: this.shouldAnimationLoop(animType),
        autoplay: animType === AnimationType.ROTATION,
        keyframes: this.generateKeyframes(animType),
      };
      
      animations.push(animation);
    }
    
    // Update model animation count
    model.animationCount = animations.length;
    
    return animations;
  }

  /**
   * Generate lighting setup
   */
  private async generateLightingSetup(
    params: Product3DVisualizationRequestDto,
    analysis: any
  ): Promise<LightingSetup[]> {
    const setups: LightingSetup[] = [];
    
    // Default lighting setup
    setups.push({
      name: 'default',
      lights: [
        {
          type: 'directional',
          position: [1, 1, 1],
          color: '#ffffff',
          intensity: 1.0,
          shadows: true,
        },
        {
          type: 'point',
          position: [-1, 1, 1],
          color: '#ffffff',
          intensity: 0.5,
          shadows: false,
        },
      ],
      environment: {
        ambientLight: {
          color: '#404040',
          intensity: 0.3,
        },
      },
    });
    
    // Product showcase lighting
    setups.push({
      name: 'showcase',
      lights: [
        {
          type: 'directional',
          position: [0, 2, 1],
          color: '#ffffff',
          intensity: 1.2,
          shadows: true,
        },
        {
          type: 'area',
          position: [2, 1, 2],
          color: '#f0f0f0',
          intensity: 0.8,
          shadows: false,
        },
        {
          type: 'point',
          position: [-2, 1, -1],
          color: '#ffffff',
          intensity: 0.4,
          shadows: false,
        },
      ],
      environment: {
        ambientLight: {
          color: '#606060',
          intensity: 0.4,
        },
      },
    });
    
    return setups;
  }

  /**
   * Generate camera setup
   */
  private generateCameraSetup(params: Product3DVisualizationRequestDto, model: Model3DAsset): CameraSetup {
    return {
      position: [3, 2, 3],
      target: [0, 0, 0],
      fov: 45,
      near: 0.1,
      far: 1000,
      controlsEnabled: true,
      autoRotate: params.animations?.includes(AnimationType.ROTATION) || false,
      zoomLimits: {
        min: 1,
        max: 10,
      },
    };
  }

  /**
   * Generate thumbnail images
   */
  private async generateThumbnails(
    model: Model3DAsset,
    lighting: LightingSetup[],
    camera: CameraSetup
  ): Promise<Product3DVisualizationResult['thumbnails']> {
    await this.simulateProcessing(3000);
    
    const baseUrl = `https://cdn.example.com/thumbnails/${this.generateId()}`;
    
    return {
      small: `${baseUrl}/thumb_small.jpg`,
      medium: `${baseUrl}/thumb_medium.jpg`,
      large: `${baseUrl}/thumb_large.jpg`,
      preview: [
        `${baseUrl}/preview_1.jpg`,
        `${baseUrl}/preview_2.jpg`,
        `${baseUrl}/preview_3.jpg`,
        `${baseUrl}/preview_4.jpg`,
      ],
    };
  }

  /**
   * Setup 3D viewer integration
   */
  private async setupViewer(
    model: Model3DAsset,
    params: Product3DVisualizationRequestDto
  ): Promise<Product3DVisualizationResult['viewer']> {
    const viewerId = this.generateId();
    const baseUrl = `https://viewer.example.com/${viewerId}`;
    
    return {
      embedCode: `<iframe src="${baseUrl}/embed" width="800" height="600" frameborder="0"></iframe>`,
      directUrl: `${baseUrl}/view`,
      iframeUrl: `${baseUrl}/embed`,
      apiEndpoints: {
        loadModel: `${baseUrl}/api/load`,
        updateMaterial: `${baseUrl}/api/material`,
        playAnimation: `${baseUrl}/api/animate`,
        captureScreenshot: `${baseUrl}/api/screenshot`,
      },
    };
  }

  /**
   * Generate alternative model variations
   */
  private async generateAlternativeModels(
    params: Product3DVisualizationRequestDto,
    baseModel: Model3DAsset
  ): Promise<Model3DAsset[]> {
    const alternatives: Model3DAsset[] = [];
    
    // Generate different quality levels
    const qualityLevels = [QualityLevel.LOW, QualityLevel.HIGH];
    
    for (const quality of qualityLevels) {
      if (quality === params.quality) continue;
      
      const altModel: Model3DAsset = {
        ...baseModel,
        qualityLevel: quality,
        polygonCount: this.calculatePolygonCount(quality, params.maxPolygons),
        url: baseModel.url.replace('/model.', `/${quality}_model.`),
        fileSize: this.estimateFileSize(this.calculatePolygonCount(quality, params.maxPolygons), quality),
      };
      
      alternatives.push(altModel);
    }
    
    return alternatives;
  }

  /**
   * Calculate analytics for the 3D model
   */
  private calculateAnalytics(
    model: Model3DAsset,
    params: Product3DVisualizationRequestDto
  ): Product3DVisualizationResult['analytics'] {
    const estimatedLoadTime = this.estimateLoadTime(model.fileSize, params.quality);
    
    return {
      estimatedLoadTime,
      mobileCompatibility: model.optimized.mobile || model.polygonCount < 3000,
      arCompatibility: model.optimized.ar || params.enableAR || false,
      vrCompatibility: model.optimized.vr || params.enableVR || false,
      browserSupport: this.getBrowserSupport(params.renderingEngine),
      performanceRating: this.calculatePerformanceRating(model, estimatedLoadTime),
    };
  }

  /**
   * Generate recommendations based on the model and analytics
   */
  private generateRecommendations(
    params: Product3DVisualizationRequestDto,
    analytics: Product3DVisualizationResult['analytics'],
    analysis: any
  ): Product3DVisualizationResult['recommendations'] {
    const recommendations = {
      optimization: [] as string[],
      enhancement: [] as string[],
      monetization: [] as string[],
      marketing: [] as string[],
    };
    
    // Optimization recommendations
    if (analytics.estimatedLoadTime > 5000) {
      recommendations.optimization.push('Consider reducing polygon count or texture resolution for faster loading');
    }
    
    if (!analytics.mobileCompatibility) {
      recommendations.optimization.push('Optimize model for mobile devices to reach wider audience');
    }
    
    if (analytics.performanceRating < 7) {
      recommendations.optimization.push('Apply mesh decimation and texture compression for better performance');
    }
    
    // Enhancement recommendations
    if (analysis.complexity > 0.7) {
      recommendations.enhancement.push('Add interactive hotspots to highlight product features');
    }
    
    recommendations.enhancement.push('Consider adding exploded view animation to show internal components');
    recommendations.enhancement.push('Implement color variants and material options');
    
    // Monetization recommendations
    recommendations.monetization.push('Integrate AR try-before-buy functionality');
    recommendations.monetization.push('Create 360-degree product showcase for premium listings');
    recommendations.monetization.push('License 3D model for use in virtual showrooms');
    
    // Marketing recommendations
    recommendations.marketing.push('Use high-quality renders for social media marketing');
    recommendations.marketing.push('Create interactive product demos for trade shows');
    recommendations.marketing.push('Develop AR filters for social media engagement');
    
    return recommendations;
  }

  // Helper calculation methods
  private calculatePolygonCount(quality?: QualityLevel, maxPolygons?: number): number {
    const baseCount = maxPolygons || 5000;
    
    switch (quality) {
      case QualityLevel.LOW:
        return Math.min(baseCount * 0.3, 1500);
      case QualityLevel.MEDIUM:
        return Math.min(baseCount * 0.6, 3000);
      case QualityLevel.HIGH:
        return Math.min(baseCount * 0.8, 6000);
      case QualityLevel.ULTRA:
        return Math.min(baseCount, 10000);
      default:
        return Math.min(baseCount * 0.6, 3000);
    }
  }

  private estimateFileSize(polygonCount: number, quality?: QualityLevel): number {
    let baseSize = polygonCount * 0.1; // Base size in KB per polygon
    
    switch (quality) {
      case QualityLevel.LOW:
        return Math.floor(baseSize * 0.5);
      case QualityLevel.MEDIUM:
        return Math.floor(baseSize * 1.0);
      case QualityLevel.HIGH:
        return Math.floor(baseSize * 1.5);
      case QualityLevel.ULTRA:
        return Math.floor(baseSize * 2.0);
      default:
        return Math.floor(baseSize);
    }
  }

  private estimateLoadTime(fileSize: number, quality?: QualityLevel): number {
    const baseTime = fileSize * 0.02; // 0.02ms per KB base
    const qualityMultiplier = quality === QualityLevel.ULTRA ? 1.5 : quality === QualityLevel.HIGH ? 1.2 : 1.0;
    return Math.floor(baseTime * qualityMultiplier) + 1000; // Add 1s base load time
  }

  private calculatePerformanceRating(model: Model3DAsset, loadTime: number): number {
    let rating = 10;
    
    // Penalize high polygon count
    if (model.polygonCount > 8000) rating -= 3;
    else if (model.polygonCount > 5000) rating -= 2;
    else if (model.polygonCount > 3000) rating -= 1;
    
    // Penalize long load times
    if (loadTime > 10000) rating -= 3;
    else if (loadTime > 5000) rating -= 2;
    else if (loadTime > 3000) rating -= 1;
    
    // Penalize large file sizes
    if (model.fileSize > 5000) rating -= 2;
    else if (model.fileSize > 2000) rating -= 1;
    
    return Math.max(1, rating);
  }

  private calculateQualityScore(
    model: Model3DAsset,
    materials: MaterialDefinition[],
    animations: AnimationDefinition[]
  ): number {
    let score = 0.5; // Base score
    
    // Quality based on polygon count
    if (model.polygonCount > 5000) score += 0.2;
    else if (model.polygonCount > 3000) score += 0.15;
    else if (model.polygonCount > 1000) score += 0.1;
    
    // Quality based on materials
    score += Math.min(0.2, materials.length * 0.05);
    
    // Quality based on animations
    score += Math.min(0.15, animations.length * 0.03);
    
    // Quality based on optimization
    if (model.optimized.mobile) score += 0.05;
    if (model.optimized.ar) score += 0.05;
    if (model.optimized.vr) score += 0.05;
    
    return Math.min(1.0, score);
  }

  private getAnimationDuration(type: AnimationType): number {
    switch (type) {
      case AnimationType.ROTATION:
        return 8000; // 8 seconds
      case AnimationType.FLOATING:
        return 4000; // 4 seconds
      case AnimationType.PULSE:
        return 2000; // 2 seconds
      case AnimationType.EXPLODED_VIEW:
        return 6000; // 6 seconds
      case AnimationType.COLOR_TRANSITION:
        return 3000; // 3 seconds
      case AnimationType.MATERIAL_CHANGE:
        return 2000; // 2 seconds
      case AnimationType.ASSEMBLY:
        return 10000; // 10 seconds
      case AnimationType.DISASSEMBLY:
        return 8000; // 8 seconds
      default:
        return 4000; // 4 seconds default
    }
  }

  private shouldAnimationLoop(type: AnimationType): boolean {
    return [
      AnimationType.ROTATION,
      AnimationType.FLOATING,
      AnimationType.PULSE,
      AnimationType.COLOR_TRANSITION,
    ].includes(type);
  }

  private generateKeyframes(type: AnimationType): AnimationDefinition['keyframes'] {
    const keyframes: AnimationDefinition['keyframes'] = [];
    
    switch (type) {
      case AnimationType.ROTATION:
        for (let i = 0; i <= 8; i++) {
          keyframes.push({
            time: i / 8,
            rotation: [0, (i / 8) * Math.PI * 2, 0, 1],
          });
        }
        break;
        
      case AnimationType.FLOATING:
        for (let i = 0; i <= 4; i++) {
          const t = i / 4;
          keyframes.push({
            time: t,
            position: [0, Math.sin(t * Math.PI * 2) * 0.2, 0],
          });
        }
        break;
        
      case AnimationType.PULSE:
        for (let i = 0; i <= 4; i++) {
          const t = i / 4;
          const scale = 1 + Math.sin(t * Math.PI * 2) * 0.1;
          keyframes.push({
            time: t,
            scale: [scale, scale, scale],
          });
        }
        break;
        
      default:
        keyframes.push({
          time: 0,
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        });
    }
    
    return keyframes;
  }

  private getBrowserSupport(engine?: RenderingEngine): string[] {
    const support = ['Chrome', 'Firefox', 'Safari', 'Edge'];
    
    switch (engine) {
      case RenderingEngine.THREE_JS:
        return support;
      case RenderingEngine.BABYLON_JS:
        return support;
      case RenderingEngine.UNITY_WEBGL:
        return support.filter(b => b !== 'Safari'); // Limited Safari support
      case RenderingEngine.UNREAL_PIXEL_STREAMING:
        return support.filter(b => b !== 'Safari');
      case RenderingEngine.NATIVE_WEBGL:
        return support;
      default:
        return support;
    }
  }

  private getAppliedOptimizations(params: Product3DVisualizationRequestDto): string[] {
    const optimizations: string[] = [];
    
    if (params.optimizeForMobile) {
      optimizations.push('Mobile optimization');
    }
    
    if (params.enableAR) {
      optimizations.push('AR optimization');
    }
    
    if (params.enableVR) {
      optimizations.push('VR optimization');
    }
    
    if (params.maxPolygons && params.maxPolygons < 5000) {
      optimizations.push('Polygon reduction');
    }
    
    if (params.textureResolution && params.textureResolution < 1024) {
      optimizations.push('Texture compression');
    }
    
    return optimizations;
  }

  // Generation pipeline management
  private async initializeGenerationPipeline(generationId: string, params: Product3DVisualizationRequestDto): Promise<void> {
    const stages: GenerationStage[] = [
      { name: 'image_analysis', status: 'pending', progress: 0 },
      { name: 'model_generation', status: 'pending', progress: 0 },
      { name: 'material_generation', status: 'pending', progress: 0 },
      { name: 'optimization', status: 'pending', progress: 0 },
      { name: 'animation_generation', status: 'pending', progress: 0 },
      { name: 'scene_setup', status: 'pending', progress: 0 },
      { name: 'thumbnail_generation', status: 'pending', progress: 0 },
      { name: 'viewer_integration', status: 'pending', progress: 0 },
    ];
    
    this.generationQueue.set(generationId, stages);
    this.activeGenerations.add(generationId);
    
    // Store in Redis for persistence
    try {
      await this.redis.setex(
        `${this.GENERATION_CACHE_PREFIX}${generationId}`,
        3600, // 1 hour
        JSON.stringify({ stages, params, status: 'processing' })
      );
    } catch (error) {
      this.logger.warn('Failed to store generation pipeline', error);
    }
  }

  private async updateStageStatus(
    generationId: string,
    stageName: string,
    status: GenerationStage['status'],
    error?: string
  ): Promise<void> {
    const stages = this.generationQueue.get(generationId);
    if (!stages) return;
    
    const stage = stages.find(s => s.name === stageName);
    if (!stage) return;
    
    stage.status = status;
    stage.progress = status === 'completed' ? 100 : status === 'running' ? 50 : 0;
    
    if (status === 'running') {
      stage.startTime = new Date();
    } else if (status === 'completed' || status === 'failed') {
      stage.endTime = new Date();
    }
    
    if (error) {
      stage.error = error;
    }
    
    // Update in Redis
    try {
      const cacheData = await this.redis.get(`${this.GENERATION_CACHE_PREFIX}${generationId}`);
      if (cacheData) {
        const data = JSON.parse(cacheData);
        data.stages = stages;
        await this.redis.setex(
          `${this.GENERATION_CACHE_PREFIX}${generationId}`,
          3600,
          JSON.stringify(data)
        );
      }
    } catch (error) {
      this.logger.warn('Failed to update stage status in Redis', error);
    }
  }

  private async updateGenerationStatus(generationId: string, status: string, error?: string): Promise<void> {
    try {
      const cacheData = await this.redis.get(`${this.GENERATION_CACHE_PREFIX}${generationId}`);
      if (cacheData) {
        const data = JSON.parse(cacheData);
        data.status = status;
        if (error) {
          data.error = error;
        }
        await this.redis.setex(
          `${this.GENERATION_CACHE_PREFIX}${generationId}`,
          3600,
          JSON.stringify(data)
        );
      }
    } catch (redisError) {
      this.logger.warn('Failed to update generation status in Redis', redisError);
    }
  }

  /**
   * Get generation status and progress
   */
  async getGenerationStatus(generationId: string): Promise<{
    status: string;
    stages: GenerationStage[];
    progress: number;
    error?: string;
  } | null> {
    try {
      // Check memory first
      const stages = this.generationQueue.get(generationId);
      if (stages) {
        const completedStages = stages.filter(s => s.status === 'completed').length;
        const progress = (completedStages / stages.length) * 100;
        
        return {
          status: this.activeGenerations.has(generationId) ? 'processing' : 'completed',
          stages,
          progress,
        };
      }
      
      // Check Redis
      const cacheData = await this.redis.get(`${this.GENERATION_CACHE_PREFIX}${generationId}`);
      if (cacheData) {
        const data = JSON.parse(cacheData);
        const completedStages = data.stages.filter((s: GenerationStage) => s.status === 'completed').length;
        const progress = (completedStages / data.stages.length) * 100;
        
        return {
          status: data.status,
          stages: data.stages,
          progress,
          error: data.error,
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to get generation status', error);
      return null;
    }
  }

  // Cache and persistence methods
  private async loadModelCache(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.MODEL_STORAGE_PREFIX}*`);
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const model: Model3DAsset = JSON.parse(data);
          const modelId = key.replace(this.MODEL_STORAGE_PREFIX, '');
          this.modelCache.set(modelId, model);
        }
      }
      
      this.logger.log(`Loaded ${this.modelCache.size} cached 3D models`);
    } catch (error) {
      this.logger.warn('Failed to load model cache', error);
    }
  }

  private async saveModelCache(): Promise<void> {
    try {
      for (const [modelId, model] of this.modelCache) {
        const key = `${this.MODEL_STORAGE_PREFIX}${modelId}`;
        await this.redis.setex(key, 86400 * 7, JSON.stringify(model)); // Keep for 7 days
      }
      
      this.logger.log('Model cache saved successfully');
    } catch (error) {
      this.logger.error('Failed to save model cache', error);
    }
  }

  private startPerformanceMonitoring(): void {
    setInterval(async () => {
      try {
        await this.redis.setex(this.METRICS_KEY, 3600, JSON.stringify(this.performanceMetrics));
      } catch (error) {
        this.logger.warn('Metrics update failed', error);
      }
    }, 60000); // Update metrics every minute
  }

  // Input validation and caching methods
  private async validateInput(params: any): Promise<Product3DVisualizationRequestDto> {
    const dto = plainToClass(Product3DVisualizationRequestDto, params);
    const errors = await validate(dto);
    
    if (errors.length > 0) {
      const errorMessages = errors.map(error => Object.values(error.constraints || {}).join(', '));
      throw new Error(`Validation failed: ${errorMessages.join('; ')}`);
    }
    
    // Additional business logic validation
    if (!dto.imageUrls || dto.imageUrls.length === 0) {
      if (!dto.existingModelUrl) {
        throw new Error('Either image URLs or existing model URL must be provided');
      }
    }
    
    if (dto.imageUrls && dto.imageUrls.length > 20) {
      throw new Error('Maximum 20 images allowed for 3D generation');
    }
    
    return dto;
  }

  private generateCacheKey(params: Product3DVisualizationRequestDto): string {
    // Create hash based on key parameters
    const keyData = {
      productId: params.productId,
      imageUrls: params.imageUrls?.slice(0, 5), // Use first 5 images for cache key
      quality: params.quality,
      outputFormat: params.outputFormat,
      optimizeForMobile: params.optimizeForMobile,
      enableAR: params.enableAR,
      enableVR: params.enableVR,
    };
    
    const serialized = JSON.stringify(keyData, Object.keys(keyData).sort());
    return this.CACHE_PREFIX + createHash('md5').update(serialized).digest('hex');
  }

  private async getCachedResult(cacheKey: string): Promise<Product3DVisualizationResult | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn('Cache retrieval failed', error);
      return null;
    }
  }

  private async cacheResult(cacheKey: string, result: Product3DVisualizationResult): Promise<void> {
    try {
      const cacheTimeout = this.configService.get('ai.caching.cacheTimeout', 7200); // 2 hours default
      await this.redis.setex(cacheKey, cacheTimeout, JSON.stringify(result));
    } catch (error) {
      this.logger.warn('Cache storage failed', error);
    }
  }

  private updateMetrics(success: boolean, responseTime: number, cacheHit: boolean, qualityScore: number): void {
    this.performanceMetrics.totalGenerations++;
    
    if (success) {
      const successCount = this.performanceMetrics.totalGenerations * this.performanceMetrics.successRate + 1;
      this.performanceMetrics.successRate = successCount / this.performanceMetrics.totalGenerations;
      
      // Update average quality score
      const totalQuality = this.performanceMetrics.averageQualityScore * (this.performanceMetrics.totalGenerations - 1);
      this.performanceMetrics.averageQualityScore = (totalQuality + qualityScore) / this.performanceMetrics.totalGenerations;
    } else {
      const successCount = this.performanceMetrics.totalGenerations * this.performanceMetrics.successRate;
      this.performanceMetrics.successRate = successCount / this.performanceMetrics.totalGenerations;
    }
    
    // Update average processing time
    const totalTime = this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.totalGenerations - 1);
    this.performanceMetrics.averageProcessingTime = (totalTime + responseTime) / this.performanceMetrics.totalGenerations;
    
    // Update cache hit rate
    if (cacheHit) {
      const totalHits = this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalGenerations - 1) + 1;
      this.performanceMetrics.cacheHitRate = totalHits / this.performanceMetrics.totalGenerations;
    }
    
    this.performanceMetrics.lastUpdated = new Date();
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async simulateProcessing(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Get current performance metrics
   */
  async getPerformanceMetrics(): Promise<typeof this.performanceMetrics> {
    return { ...this.performanceMetrics };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const redisStatus = await this.redis.ping();
      const circuitStatus = this.visualizationCircuit.stats;
      
      return {
        status: 'healthy',
        details: {
          redis: redisStatus === 'PONG' ? 'connected' : 'disconnected',
          circuit: {
            state: this.visualizationCircuit.opened ? 'open' : 'closed',
            failures: circuitStatus.failures,
            requests: circuitStatus.fires,
          },
          generation: {
            activeGenerations: this.activeGenerations.size,
            queuedGenerations: this.generationQueue.size,
            cachedModels: this.modelCache.size,
          },
          performance: this.performanceMetrics,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      // Save all cached models
      await this.saveModelCache();
      
      // Save final performance metrics
      await this.redis.setex(this.METRICS_KEY, 86400, JSON.stringify(this.performanceMetrics));
      
      // Clear memory
      this.generationQueue.clear();
      this.activeGenerations.clear();
      this.modelCache.clear();
      
      this.logger.log('Cleanup completed successfully');
    } catch (error) {
      this.logger.error('Cleanup failed', error);
    }
  }
}