import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import * as os from 'os';

export interface ResourceMetrics {
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  cache: {
    size: number;
    hitRate: number;
    missRate: number;
    evictions: number;
  };
  network: {
    requestsPerSecond: number;
    responseTime: number;
    bandwidth: number;
  };
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  category: 'cache' | 'cpu' | 'memory' | 'network' | 'database';
  recommendation: string;
  automatable: boolean;
}

export interface ResourceOptimizationResult {
  currentMetrics: ResourceMetrics;
  recommendations: OptimizationStrategy[];
  appliedOptimizations: string[];
  estimatedImprovement: {
    performance: number; // percentage
    resourceReduction: number; // percentage
    costSavings: number; // percentage
  };
}

@Injectable()
export class ResourceOptimizerService {
  private readonly logger = new Logger(ResourceOptimizerService.name);
  private metrics: ResourceMetrics = this.initializeMetrics();
  private appliedOptimizations: Set<string> = new Set();
  
  // Optimization thresholds
  private readonly CPU_WARNING_THRESHOLD = 70;
  private readonly MEMORY_WARNING_THRESHOLD = 80;
  private readonly CACHE_HIT_RATE_THRESHOLD = 85;
  private readonly RESPONSE_TIME_THRESHOLD = 1000; // ms

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.initializeOptimization();
  }

  private initializeOptimization() {
    // Start resource monitoring
    this.startResourceMonitoring();
    
    // Schedule periodic optimization
    setInterval(() => {
      this.performOptimization();
    }, 5 * 60 * 1000); // Every 5 minutes

    this.logger.log('Resource Optimizer initialized');
  }

  private initializeMetrics(): ResourceMetrics {
    return {
      cpu: {
        usage: 0,
        cores: os.cpus().length,
        load: [0, 0, 0]
      },
      memory: {
        total: os.totalmem(),
        used: 0,
        free: os.freemem(),
        usage: 0
      },
      cache: {
        size: 0,
        hitRate: 0,
        missRate: 0,
        evictions: 0
      },
      network: {
        requestsPerSecond: 0,
        responseTime: 0,
        bandwidth: 0
      }
    };
  }

  private startResourceMonitoring(): void {
    setInterval(async () => {
      await this.collectMetrics();
    }, 10 * 1000); // Every 10 seconds
  }

  private async collectMetrics(): Promise<void> {
    try {
      // CPU metrics
      const cpuUsage = await this.getCpuUsage();
      this.metrics.cpu.usage = cpuUsage;
      this.metrics.cpu.load = os.loadavg();

      // Memory metrics
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      
      this.metrics.memory = {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: (usedMem / totalMem) * 100
      };

      // Cache metrics
      const cacheMetrics = await this.getCacheMetrics();
      this.metrics.cache = cacheMetrics;

      // Network metrics
      const networkMetrics = await this.getNetworkMetrics();
      this.metrics.network = networkMetrics;

    } catch (error) {
      this.logger.error('Failed to collect metrics:', error);
    }
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startMeasure = process.cpuUsage();
      const startTime = process.hrtime();
      
      setTimeout(() => {
        const delta = process.cpuUsage(startMeasure);
        const totalTime = process.hrtime(startTime);
        const totalTimeNs = totalTime[0] * 1e9 + totalTime[1];
        const cpuPercent = ((delta.user + delta.system) / totalTimeNs) * 100;
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }

  private async getCacheMetrics(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      const stats = await this.redis.info('stats');
      
      // Parse Redis info
      const usedMemory = this.parseRedisInfo(info, 'used_memory') || 0;
      const keyspaceHits = this.parseRedisInfo(stats, 'keyspace_hits') || 0;
      const keyspaceMisses = this.parseRedisInfo(stats, 'keyspace_misses') || 0;
      const evictedKeys = this.parseRedisInfo(stats, 'evicted_keys') || 0;
      
      const totalRequests = keyspaceHits + keyspaceMisses;
      const hitRate = totalRequests > 0 ? (keyspaceHits / totalRequests) * 100 : 0;
      const missRate = totalRequests > 0 ? (keyspaceMisses / totalRequests) * 100 : 0;
      
      return {
        size: usedMemory,
        hitRate,
        missRate,
        evictions: evictedKeys
      };
      
    } catch (error) {
      this.logger.error('Failed to get cache metrics:', error);
      return this.metrics.cache;
    }
  }

  private parseRedisInfo(info: string, key: string): number | null {
    const match = info.match(new RegExp(`${key}:(\\d+)`));
    return match ? parseInt(match[1]) : null;
  }

  private async getNetworkMetrics(): Promise<any> {
    // Simplified network metrics - in production, this would use more sophisticated monitoring
    const requestCount = await this.redis.get('metrics:requests:count') || '0';
    const responseTimeSum = await this.redis.get('metrics:response_time:sum') || '0';
    const requestsInLastMinute = await this.redis.zcount('metrics:requests:timeline', Date.now() - 60000, Date.now());
    
    const avgResponseTime = parseInt(requestCount) > 0 ? 
      parseInt(responseTimeSum) / parseInt(requestCount) : 0;
    
    return {
      requestsPerSecond: requestsInLastMinute / 60,
      responseTime: avgResponseTime,
      bandwidth: 0 // Would need network interface monitoring
    };
  }

  async performOptimization(): Promise<ResourceOptimizationResult> {
    try {
      this.logger.log('Starting resource optimization...');
      
      // Analyze current metrics
      await this.collectMetrics();
      
      // Generate optimization recommendations
      const recommendations = await this.generateOptimizationRecommendations();
      
      // Apply automatic optimizations
      const appliedOptimizations = await this.applyAutomaticOptimizations(recommendations);
      
      // Calculate estimated improvements
      const estimatedImprovement = this.calculateEstimatedImprovement(recommendations);
      
      const result: ResourceOptimizationResult = {
        currentMetrics: { ...this.metrics },
        recommendations,
        appliedOptimizations: Array.from(this.appliedOptimizations),
        estimatedImprovement
      };
      
      this.logger.log(`Optimization completed. Applied ${appliedOptimizations.length} optimizations.`);
      return result;
      
    } catch (error) {
      this.logger.error('Resource optimization failed:', error);
      throw error;
    }
  }

  private async generateOptimizationRecommendations(): Promise<OptimizationStrategy[]> {
    const recommendations: OptimizationStrategy[] = [];
    
    // CPU optimization recommendations
    if (this.metrics.cpu.usage > this.CPU_WARNING_THRESHOLD) {
      recommendations.push({
        id: 'cpu_optimization',
        name: 'CPU負荷軽減',
        description: 'CPU使用率が高いため、プロセス最適化が必要です',
        impact: 'high',
        effort: 'medium',
        category: 'cpu',
        recommendation: 'バックグラウンドタスクの分散化、非同期処理の最適化を実施してください',
        automatable: true
      });
    }
    
    // Memory optimization recommendations
    if (this.metrics.memory.usage > this.MEMORY_WARNING_THRESHOLD) {
      recommendations.push({
        id: 'memory_cleanup',
        name: 'メモリ使用量最適化',
        description: 'メモリ使用率が警告レベルに達しています',
        impact: 'high',
        effort: 'low',
        category: 'memory',
        recommendation: '不要なキャッシュエントリの削除、メモリリークの確認を行ってください',
        automatable: true
      });
    }
    
    // Cache optimization recommendations
    if (this.metrics.cache.hitRate < this.CACHE_HIT_RATE_THRESHOLD) {
      recommendations.push({
        id: 'cache_optimization',
        name: 'キャッシュ効率向上',
        description: `キャッシュヒット率が${this.metrics.cache.hitRate.toFixed(1)}%と低下しています`,
        impact: 'high',
        effort: 'medium',
        category: 'cache',
        recommendation: 'キャッシュストラテジーの見直し、TTL調整、プリロード戦略の実装を検討してください',
        automatable: true
      });
    }
    
    // Network optimization recommendations
    if (this.metrics.network.responseTime > this.RESPONSE_TIME_THRESHOLD) {
      recommendations.push({
        id: 'network_optimization',
        name: 'レスポンス時間改善',
        description: `平均レスポンス時間が${this.metrics.network.responseTime}msと遅延しています`,
        impact: 'medium',
        effort: 'high',
        category: 'network',
        recommendation: 'CDN活用、画像最適化、API最適化を実施してください',
        automatable: false
      });
    }
    
    // Database optimization recommendations
    const dbMetrics = await this.getDatabaseMetrics();
    if (dbMetrics.slowQueries > 10) {
      recommendations.push({
        id: 'database_optimization',
        name: 'データベース最適化',
        description: '低速クエリが検出されています',
        impact: 'high',
        effort: 'high',
        category: 'database',
        recommendation: 'インデックス最適化、クエリチューニング、コネクションプール調整を実施してください',
        automatable: false
      });
    }
    
    return recommendations;
  }

  private async getDatabaseMetrics(): Promise<{ slowQueries: number; connections: number }> {
    // Mock database metrics - in production, this would query actual database stats
    return {
      slowQueries: Math.floor(Math.random() * 20),
      connections: Math.floor(Math.random() * 100)
    };
  }

  private async applyAutomaticOptimizations(recommendations: OptimizationStrategy[]): Promise<string[]> {
    const applied: string[] = [];
    
    for (const recommendation of recommendations.filter(r => r.automatable)) {
      try {
        if (this.appliedOptimizations.has(recommendation.id)) {
          continue; // Already applied
        }
        
        let success = false;
        
        switch (recommendation.id) {
          case 'cpu_optimization':
            success = await this.optimizeCpuUsage();
            break;
            
          case 'memory_cleanup':
            success = await this.optimizeMemoryUsage();
            break;
            
          case 'cache_optimization':
            success = await this.optimizeCacheStrategy();
            break;
            
          default:
            this.logger.warn(`Unknown optimization: ${recommendation.id}`);
        }
        
        if (success) {
          this.appliedOptimizations.add(recommendation.id);
          applied.push(recommendation.id);
          this.logger.log(`Applied optimization: ${recommendation.name}`);
        }
        
      } catch (error) {
        this.logger.error(`Failed to apply optimization ${recommendation.id}:`, error);
      }
    }
    
    return applied;
  }

  private async optimizeCpuUsage(): Promise<boolean> {
    try {
      // Reduce background task frequency if CPU usage is high
      if (this.metrics.cpu.usage > this.CPU_WARNING_THRESHOLD) {
        await this.redis.set('optimization:background_task_delay', '30000'); // 30 seconds delay
        
        // Lower process priority for non-critical tasks - disabled for compatibility
        // if (process.platform !== 'win32') {
        //   try {
        //     process.setpriority(0, 5); // Lower priority
        //   } catch (error) {
        //     this.logger.warn('Could not adjust process priority:', error);
        //   }
        // }
        
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('CPU optimization failed:', error);
      return false;
    }
  }

  private async optimizeMemoryUsage(): Promise<boolean> {
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Clean up expired cache entries
      const keys = await this.redis.keys('*');
      let deletedKeys = 0;
      
      for (const key of keys.slice(0, 1000)) { // Process in batches
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // No expiration set
          const keyAge = await this.getKeyAge(key);
          if (keyAge > 24 * 60 * 60 * 1000) { // Older than 24 hours
            await this.redis.del(key);
            deletedKeys++;
          }
        }
      }
      
      this.logger.log(`Memory optimization: Deleted ${deletedKeys} old cache entries`);
      return true;
      
    } catch (error) {
      this.logger.error('Memory optimization failed:', error);
      return false;
    }
  }

  private async getKeyAge(key: string): Promise<number> {
    try {
      const createdAt = await this.redis.hget(`meta:${key}`, 'created_at');
      if (createdAt) {
        return Date.now() - parseInt(createdAt);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private async optimizeCacheStrategy(): Promise<boolean> {
    try {
      // Analyze cache access patterns
      const keys = await this.redis.keys('*');
      const accessStats = new Map<string, number>();
      
      for (const key of keys.slice(0, 500)) {
        const accessCount = await this.redis.hget(`analytics:${key}`, 'access_count') || '0';
        accessStats.set(key, parseInt(accessCount));
      }
      
      // Extend TTL for frequently accessed keys
      const frequentKeys = Array.from(accessStats.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 50); // Top 50 most accessed
      
      for (const [key, accessCount] of frequentKeys) {
        if (accessCount > 10) {
          const currentTtl = await this.redis.ttl(key);
          if (currentTtl > 0 && currentTtl < 3600) { // Less than 1 hour
            await this.redis.expire(key, 3600); // Extend to 1 hour
          }
        }
      }
      
      // Remove rarely accessed keys
      const rareKeys = Array.from(accessStats.entries())
        .filter(([,count]) => count < 2)
        .slice(0, 100); // Limit cleanup
      
      for (const [key] of rareKeys) {
        await this.redis.del(key);
      }
      
      this.logger.log(`Cache optimization: Extended TTL for ${frequentKeys.length} keys, removed ${rareKeys.length} rare keys`);
      return true;
      
    } catch (error) {
      this.logger.error('Cache optimization failed:', error);
      return false;
    }
  }

  private calculateEstimatedImprovement(recommendations: OptimizationStrategy[]): any {
    let performanceImprovement = 0;
    let resourceReduction = 0;
    let costSavings = 0;
    
    for (const rec of recommendations) {
      if (this.appliedOptimizations.has(rec.id)) {
        switch (rec.impact) {
          case 'high':
            performanceImprovement += 15;
            resourceReduction += 20;
            costSavings += 10;
            break;
          case 'medium':
            performanceImprovement += 8;
            resourceReduction += 10;
            costSavings += 5;
            break;
          case 'low':
            performanceImprovement += 3;
            resourceReduction += 5;
            costSavings += 2;
            break;
        }
      }
    }
    
    return {
      performance: Math.min(performanceImprovement, 50), // Cap at 50%
      resourceReduction: Math.min(resourceReduction, 40), // Cap at 40%
      costSavings: Math.min(costSavings, 30) // Cap at 30%
    };
  }

  // Public API methods
  async getResourceMetrics(): Promise<ResourceMetrics> {
    await this.collectMetrics();
    return { ...this.metrics };
  }

  async getOptimizationRecommendations(): Promise<OptimizationStrategy[]> {
    return this.generateOptimizationRecommendations();
  }

  async forceOptimization(): Promise<ResourceOptimizationResult> {
    return this.performOptimization();
  }

  async resetOptimizations(): Promise<void> {
    this.appliedOptimizations.clear();
    await this.redis.del('optimization:background_task_delay');
    this.logger.log('All optimizations reset');
  }

  getOptimizationStatus(): {
    appliedCount: number;
    appliedOptimizations: string[];
    lastRun: Date;
  } {
    return {
      appliedCount: this.appliedOptimizations.size,
      appliedOptimizations: Array.from(this.appliedOptimizations),
      lastRun: new Date() // In production, store actual last run time
    };
  }
}