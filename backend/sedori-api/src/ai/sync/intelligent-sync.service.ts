import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { KeepaApiService } from '../../external-apis/keepa-api.service';
import { ApiRateLimiterService } from '../../external-apis/rate-limiter/api-rate-limiter.service';

export interface SyncPriority {
  productId: string;
  priority: number; // 0-100
  lastSynced: Date;
  syncFrequency: number; // minutes
  importance: 'critical' | 'high' | 'medium' | 'low';
  predictedNextUpdate: Date;
}

export interface SyncOptimizationMetrics {
  totalRequests: number;
  cacheHitRate: number;
  averageResponseTime: number;
  apiQuotaUtilization: number;
  predictiveAccuracy: number;
  syncEfficiency: number;
}

export interface PredictiveCacheItem {
  key: string;
  data: any;
  priority: number;
  predictedAccessTime: Date;
  accessFrequency: number;
  lastAccessed: Date;
  ttl: number;
}

@Injectable()
export class IntelligentSyncService {
  private readonly logger = new Logger(IntelligentSyncService.name);
  private syncQueue: SyncPriority[] = [];
  private isOptimizing = false;
  private metrics: SyncOptimizationMetrics = {
    totalRequests: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    apiQuotaUtilization: 0,
    predictiveAccuracy: 0,
    syncEfficiency: 0
  };

  // Cache configuration
  private readonly PREDICTIVE_CACHE_TTL = 3600; // 1 hour
  private readonly HIGH_PRIORITY_TTL = 1800; // 30 minutes
  private readonly MEDIUM_PRIORITY_TTL = 3600; // 1 hour
  private readonly LOW_PRIORITY_TTL = 7200; // 2 hours

  constructor(
    private readonly keepaApiService: KeepaApiService,
    private readonly rateLimiterService: ApiRateLimiterService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.initializeSync();
  }

  private async initializeSync() {
    // Start background optimization process
    this.optimizeSyncSchedule();
    
    // Schedule periodic optimization
    setInterval(() => {
      this.optimizeSyncSchedule();
    }, 15 * 60 * 1000); // Every 15 minutes

    // Start predictive caching
    this.startPredictiveCaching();

    this.logger.log('Intelligent Sync Service initialized');
  }

  async optimizeSyncSchedule(): Promise<void> {
    if (this.isOptimizing) return;

    this.isOptimizing = true;
    try {
      this.logger.log('Starting sync optimization...');

      // Analyze usage patterns
      const usagePatterns = await this.analyzeUsagePatterns();
      
      // Calculate sync priorities
      const priorities = await this.calculateSyncPriorities(usagePatterns);
      
      // Optimize sync queue
      this.syncQueue = await this.optimizeSyncQueue(priorities);
      
      // Update predictive cache
      await this.updatePredictiveCache();
      
      // Calculate efficiency metrics
      await this.updateMetrics();

      this.logger.log(`Sync optimization completed. Queue size: ${this.syncQueue.length}`);
      
    } catch (error) {
      this.logger.error('Sync optimization failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  private async analyzeUsagePatterns(): Promise<Map<string, any>> {
    const patterns = new Map();
    
    try {
      // Analyze Redis access patterns
      const keys = await this.redis.keys('keepa:*');
      
      for (const key of keys.slice(0, 1000)) { // Limit for performance
        const accessCount = await this.redis.hget(`analytics:${key}`, 'access_count') || '0';
        const lastAccess = await this.redis.hget(`analytics:${key}`, 'last_access') || '0';
        const responseTime = await this.redis.hget(`analytics:${key}`, 'avg_response_time') || '0';
        
        patterns.set(key, {
          accessCount: parseInt(accessCount),
          lastAccess: new Date(parseInt(lastAccess)),
          averageResponseTime: parseFloat(responseTime),
          frequency: this.calculateAccessFrequency(parseInt(accessCount), new Date(parseInt(lastAccess)))
        });
      }
      
      return patterns;
      
    } catch (error) {
      this.logger.error('Failed to analyze usage patterns:', error);
      return new Map();
    }
  }

  private calculateAccessFrequency(accessCount: number, lastAccess: Date): number {
    const daysSinceAccess = (Date.now() - lastAccess.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAccess === 0) return accessCount;
    return accessCount / daysSinceAccess;
  }

  private async calculateSyncPriorities(patterns: Map<string, any>): Promise<SyncPriority[]> {
    const priorities: SyncPriority[] = [];
    
    for (const [key, pattern] of patterns) {
      if (!key.includes('product:') && !key.includes('price:')) continue;
      
      const productId = this.extractProductId(key);
      if (!productId) continue;
      
      const priority = this.calculatePriority(pattern);
      const importance = this.determineImportance(priority);
      const syncFrequency = this.calculateOptimalSyncFrequency(pattern, importance);
      
      priorities.push({
        productId,
        priority,
        lastSynced: pattern.lastAccess || new Date(0),
        syncFrequency,
        importance,
        predictedNextUpdate: this.predictNextUpdate(pattern, syncFrequency)
      });
    }
    
    return priorities.sort((a, b) => b.priority - a.priority);
  }

  private calculatePriority(pattern: any): number {
    const accessWeight = Math.min(pattern.accessCount / 10, 50); // Max 50 points
    const frequencyWeight = Math.min(pattern.frequency * 10, 30); // Max 30 points
    const recencyWeight = this.calculateRecencyWeight(pattern.lastAccess); // Max 20 points
    
    return Math.min(accessWeight + frequencyWeight + recencyWeight, 100);
  }

  private calculateRecencyWeight(lastAccess: Date): number {
    const hoursAgo = (Date.now() - lastAccess.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 1) return 20;
    if (hoursAgo < 6) return 15;
    if (hoursAgo < 24) return 10;
    if (hoursAgo < 168) return 5; // 1 week
    return 0;
  }

  private determineImportance(priority: number): 'critical' | 'high' | 'medium' | 'low' {
    if (priority >= 80) return 'critical';
    if (priority >= 60) return 'high';
    if (priority >= 40) return 'medium';
    return 'low';
  }

  private calculateOptimalSyncFrequency(pattern: any, importance: 'critical' | 'high' | 'medium' | 'low'): number {
    const baseFrequency = {
      'critical': 5,   // 5 minutes
      'high': 15,      // 15 minutes
      'medium': 60,    // 1 hour
      'low': 240       // 4 hours
    };

    const base = baseFrequency[importance as keyof typeof baseFrequency];
    const frequencyMultiplier = Math.max(0.5, Math.min(2.0, 1 / Math.log10(pattern.frequency + 1)));
    
    return Math.round(base * frequencyMultiplier);
  }

  private predictNextUpdate(pattern: any, syncFrequency: number): Date {
    const lastSync = pattern.lastAccess || new Date();
    return new Date(lastSync.getTime() + syncFrequency * 60 * 1000);
  }

  private async optimizeSyncQueue(priorities: SyncPriority[]): Promise<SyncPriority[]> {
    const currentTime = new Date();
    const optimizedQueue: SyncPriority[] = [];
    
    // Filter items that need syncing
    const needsSync = priorities.filter(item => {
      const timeSinceLastSync = currentTime.getTime() - item.lastSynced.getTime();
      const syncInterval = item.syncFrequency * 60 * 1000;
      return timeSinceLastSync >= syncInterval || item.importance === 'critical';
    });

    // Apply rate limiting considerations
    const rateLimitInfo = { remaining: 1000, limit: 10000 }; // Mock rate limit info
    const maxConcurrentRequests = Math.floor(rateLimitInfo.remaining / 2); // Conservative approach
    
    // Select top items within rate limits
    optimizedQueue.push(...needsSync.slice(0, maxConcurrentRequests));
    
    return optimizedQueue;
  }

  async syncProduct(productId: string, force = false): Promise<any> {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    
    try {
      // Check cache first
      const cacheKey = `keepa:optimized:${productId}`;
      const cachedData = await this.redis.get(cacheKey);
      
      if (cachedData && !force) {
        await this.recordCacheHit(cacheKey);
        return JSON.parse(cachedData);
      }

      // Check rate limits
      const canMakeRequest = await this.rateLimiterService.checkRateLimit('keepa');
      if (!canMakeRequest) {
        // Return cached data if available, even if expired
        if (cachedData) {
          this.logger.warn(`Rate limited, returning expired cache for ${productId}`);
          return JSON.parse(cachedData);
        }
        throw new Error('Rate limit exceeded and no cached data available');
      }

      // Fetch fresh data
      const freshData = await this.keepaApiService.getProduct(productId);
      
      // Determine optimal cache TTL based on priority
      const priority = this.findProductPriority(productId);
      const ttl = this.calculateOptimalTTL(priority);
      
      // Cache with intelligent TTL
      await this.redis.setex(cacheKey, ttl, JSON.stringify(freshData));
      
      // Update analytics
      await this.updateAnalytics(cacheKey, Date.now() - startTime);
      
      // Preemptively cache related data
      await this.preemptiveCaching(productId, freshData);
      
      return freshData;
      
    } catch (error) {
      this.logger.error(`Failed to sync product ${productId}:`, error);
      
      // Fallback to expired cache if available
      const fallbackCache = await this.redis.get(`keepa:optimized:${productId}`);
      if (fallbackCache) {
        this.logger.warn(`Returning fallback cache for ${productId}`);
        return JSON.parse(fallbackCache);
      }
      
      throw error;
    }
  }

  private async recordCacheHit(cacheKey: string): Promise<void> {
    const now = Date.now().toString();
    await this.redis.hincrby(`analytics:${cacheKey}`, 'access_count', 1);
    await this.redis.hset(`analytics:${cacheKey}`, 'last_access', now);
    
    // Update global cache hit rate
    this.metrics.cacheHitRate = (this.metrics.cacheHitRate * 0.9) + 0.1; // Moving average
  }

  private findProductPriority(productId: string): SyncPriority | null {
    return this.syncQueue.find(item => item.productId === productId) || null;
  }

  private calculateOptimalTTL(priority: SyncPriority | null): number {
    if (!priority) return this.LOW_PRIORITY_TTL;
    
    switch (priority.importance) {
      case 'critical': return this.HIGH_PRIORITY_TTL;
      case 'high': return this.HIGH_PRIORITY_TTL;
      case 'medium': return this.MEDIUM_PRIORITY_TTL;
      case 'low': return this.LOW_PRIORITY_TTL;
      default: return this.MEDIUM_PRIORITY_TTL;
    }
  }

  private async updateAnalytics(cacheKey: string, responseTime: number): Promise<void> {
    const now = Date.now().toString();
    await this.redis.hset(`analytics:${cacheKey}`, {
      'last_access': now,
      'avg_response_time': responseTime.toString()
    });
    await this.redis.hincrby(`analytics:${cacheKey}`, 'access_count', 1);
    
    // Update global metrics
    this.metrics.averageResponseTime = (this.metrics.averageResponseTime * 0.9) + (responseTime * 0.1);
  }

  private async preemptiveCaching(productId: string, productData: any): Promise<void> {
    try {
      // Cache related price data
      if (productData.priceHistory) {
        const priceKey = `keepa:price:${productId}`;
        await this.redis.setex(priceKey, this.MEDIUM_PRIORITY_TTL, JSON.stringify(productData.priceHistory));
      }
      
      // Cache category data if not already cached
      if (productData.category) {
        const categoryKey = `keepa:category:${productData.category}`;
        const categoryExists = await this.redis.exists(categoryKey);
        
        if (!categoryExists) {
          // Fetch and cache category data
          setTimeout(async () => {
            try {
              const categoryData = await this.keepaApiService.searchProducts('', productData.category, 0, 20);
              await this.redis.setex(categoryKey, this.LOW_PRIORITY_TTL, JSON.stringify(categoryData));
            } catch (error) {
              this.logger.error('Preemptive category caching failed:', error);
            }
          }, 100); // Small delay to avoid overwhelming the API
        }
      }
      
    } catch (error) {
      this.logger.error('Preemptive caching failed:', error);
    }
  }

  private async startPredictiveCaching(): Promise<void> {
    setInterval(async () => {
      try {
        await this.performPredictiveCaching();
      } catch (error) {
        this.logger.error('Predictive caching failed:', error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  private async performPredictiveCaching(): Promise<void> {
    // Analyze access patterns to predict future requests
    const patterns = await this.analyzeUsagePatterns();
    const predictions: PredictiveCacheItem[] = [];
    
    for (const [key, pattern] of patterns) {
      const predictedAccessTime = this.predictNextAccess(pattern);
      const timeToPredictedAccess = predictedAccessTime.getTime() - Date.now();
      
      // If predicted access is within the next 30 minutes, preload
      if (timeToPredictedAccess > 0 && timeToPredictedAccess < 30 * 60 * 1000) {
        const productId = this.extractProductId(key);
        if (productId) {
          predictions.push({
            key,
            data: null,
            priority: pattern.frequency * 10,
            predictedAccessTime,
            accessFrequency: pattern.frequency,
            lastAccessed: pattern.lastAccess,
            ttl: this.PREDICTIVE_CACHE_TTL
          });
        }
      }
    }
    
    // Sort by priority and cache top predictions
    predictions.sort((a, b) => b.priority - a.priority);
    
    for (const prediction of predictions.slice(0, 10)) { // Limit to avoid API overload
      try {
        const productId = this.extractProductId(prediction.key);
        if (productId) {
          // Check if already cached
          const exists = await this.redis.exists(`keepa:predictive:${productId}`);
          if (!exists) {
            setTimeout(async () => {
              try {
                const data = await this.keepaApiService.getProduct(productId);
                await this.redis.setex(`keepa:predictive:${productId}`, prediction.ttl, JSON.stringify(data));
                this.logger.debug(`Predictively cached ${productId}`);
              } catch (error) {
                this.logger.error(`Predictive caching failed for ${productId}:`, error);
              }
            }, Math.random() * 5000); // Random delay to spread load
          }
        }
      } catch (error) {
        this.logger.error('Predictive caching item failed:', error);
      }
    }
  }

  private predictNextAccess(pattern: any): Date {
    // Simple prediction based on access frequency
    const avgInterval = pattern.frequency > 0 ? 24 / pattern.frequency : 24; // hours
    const nextAccess = new Date(pattern.lastAccess.getTime() + avgInterval * 60 * 60 * 1000);
    return nextAccess;
  }

  private extractProductId(key: string): string | null {
    const match = key.match(/[A-Z0-9]{10}/); // ASIN pattern
    return match ? match[0] : null;
  }

  private async updatePredictiveCache(): Promise<void> {
    // Clean up expired predictive cache entries
    const keys = await this.redis.keys('keepa:predictive:*');
    
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl < 300) { // Less than 5 minutes remaining
        // Extend TTL if recent access
        const analyticsKey = `analytics:${key}`;
        const lastAccess = await this.redis.hget(analyticsKey, 'last_access');
        
        if (lastAccess) {
          const lastAccessTime = parseInt(lastAccess);
          const timeSinceAccess = Date.now() - lastAccessTime;
          
          if (timeSinceAccess < 30 * 60 * 1000) { // Accessed within 30 minutes
            await this.redis.expire(key, this.PREDICTIVE_CACHE_TTL);
          }
        }
      }
    }
  }

  private async updateMetrics(): Promise<void> {
    try {
      // Calculate cache hit rate
      const cacheKeys = await this.redis.keys('analytics:keepa:*');
      let totalAccess = 0;
      let cacheHits = 0;
      
      for (const key of cacheKeys.slice(0, 100)) { // Sample for performance
        const accessCount = await this.redis.hget(key, 'access_count') || '0';
        const cacheHitCount = await this.redis.hget(key, 'cache_hits') || '0';
        
        totalAccess += parseInt(accessCount);
        cacheHits += parseInt(cacheHitCount);
      }
      
      if (totalAccess > 0) {
        this.metrics.cacheHitRate = (cacheHits / totalAccess) * 100;
      }
      
      // Calculate API quota utilization
      const rateLimitInfo = { remaining: 1000, limit: 10000 }; // Mock rate limit info
      this.metrics.apiQuotaUtilization = ((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit) * 100;
      
      // Calculate sync efficiency
      const queueSize = this.syncQueue.length;
      const highPriorityItems = this.syncQueue.filter(item => item.importance === 'critical' || item.importance === 'high').length;
      this.metrics.syncEfficiency = queueSize > 0 ? (highPriorityItems / queueSize) * 100 : 100;
      
    } catch (error) {
      this.logger.error('Failed to update metrics:', error);
    }
  }

  // Public API methods
  async getSyncMetrics(): Promise<SyncOptimizationMetrics> {
    await this.updateMetrics();
    return { ...this.metrics };
  }

  async getSyncQueue(): Promise<SyncPriority[]> {
    return [...this.syncQueue];
  }

  async forceSyncProduct(productId: string): Promise<any> {
    return this.syncProduct(productId, true);
  }

  async getSyncStatus(productId: string): Promise<{ cached: boolean; lastSynced: Date | null; nextSync: Date | null }> {
    const cacheKey = `keepa:optimized:${productId}`;
    const cached = await this.redis.exists(cacheKey) === 1;
    
    const priority = this.findProductPriority(productId);
    
    return {
      cached,
      lastSynced: priority?.lastSynced || null,
      nextSync: priority?.predictedNextUpdate || null
    };
  }
}