import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  burstLimit?: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

@Injectable()
export class ApiRateLimiterService {
  private readonly logger = new Logger(ApiRateLimiterService.name);

  // Rate limit configurations for different APIs
  private readonly configs: Record<string, RateLimitConfig> = {
    amazon: {
      requests: 2000, // requests per day
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      burstLimit: 10, // burst limit per second
    },
    rakuten: {
      requests: 10000, // requests per day
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      burstLimit: 20, // burst limit per second
    },
    yahoo: {
      requests: 50000, // requests per day
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      burstLimit: 100, // burst limit per second
    },
    'keepa-api': {
      requests: 100000, // tokens per day
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      burstLimit: 5, // requests per second
    },
  };

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async checkRateLimit(
    apiName: string,
    identifier?: string,
  ): Promise<RateLimitStatus> {
    const config = this.configs[apiName];
    if (!config) {
      this.logger.warn(`No rate limit config found for API: ${apiName}`);
      return {
        allowed: true,
        remaining: 999999,
        resetTime: Date.now() + 3600000,
      };
    }

    const key = `ratelimit:${apiName}:${identifier || 'default'}`;
    const burstKey = `ratelimit:${apiName}:burst:${identifier || 'default'}`;
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const resetTime = windowStart + config.windowMs;

    try {
      // Check burst limit first
      if (config.burstLimit) {
        const burstStatus = await this.checkBurstLimit(
          burstKey,
          config.burstLimit,
        );
        if (!burstStatus.allowed) {
          return burstStatus;
        }
      }

      // Check main rate limit
      const pipeline = this.redis.pipeline();
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zremrangebyscore(key, 0, now - config.windowMs);
      pipeline.zcard(key);
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();
      const count = results?.[2]?.[1] as number;

      if (count > config.requests) {
        const retryAfter = Math.ceil((resetTime - now) / 1000);
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter,
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, config.requests - count),
        resetTime,
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed for ${apiName}:`, error);
      // In case of Redis failure, allow the request but log the error
      return { allowed: true, remaining: 999999, resetTime: now + 3600000 };
    }
  }

  private async checkBurstLimit(
    burstKey: string,
    burstLimit: number,
  ): Promise<RateLimitStatus> {
    const now = Date.now();
    const windowStart = Math.floor(now / 1000) * 1000; // 1-second windows
    const resetTime = windowStart + 1000;

    try {
      const pipeline = this.redis.pipeline();
      pipeline.zadd(burstKey, now, `${now}-${Math.random()}`);
      pipeline.zremrangebyscore(burstKey, 0, now - 1000);
      pipeline.zcard(burstKey);
      pipeline.expire(burstKey, 2);

      const results = await pipeline.exec();
      const count = results?.[2]?.[1] as number;

      if (count > burstLimit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: 1,
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, burstLimit - count),
        resetTime,
      };
    } catch (error) {
      this.logger.error('Burst limit check failed:', error);
      return { allowed: true, remaining: 999999, resetTime: now + 1000 };
    }
  }

  async waitForRateLimit(apiName: string, identifier?: string): Promise<void> {
    const status = await this.checkRateLimit(apiName, identifier);

    if (!status.allowed && status.retryAfter) {
      this.logger.log(
        `Rate limit exceeded for ${apiName}, waiting ${status.retryAfter} seconds`,
      );
      await this.sleep(status.retryAfter * 1000);
    }
  }

  async recordRequest(
    apiName: string,
    identifier?: string,
    success: boolean = true,
  ): Promise<void> {
    const statsKey = `api_stats:${apiName}:${identifier || 'default'}`;
    const dailyKey = `${statsKey}:${this.getDayKey()}`;

    try {
      const pipeline = this.redis.pipeline();
      pipeline.hincrby(dailyKey, 'total', 1);
      pipeline.hincrby(dailyKey, success ? 'success' : 'error', 1);
      pipeline.expire(dailyKey, 7 * 24 * 60 * 60); // Keep for 7 days
      await pipeline.exec();
    } catch (error) {
      this.logger.error('Failed to record API request stats:', error);
    }
  }

  async getApiStats(
    apiName: string,
    identifier?: string,
    days: number = 7,
  ): Promise<{
    [date: string]: {
      total: number;
      success: number;
      error: number;
      successRate: number;
    };
  }> {
    const stats: any = {};
    const baseKey = `api_stats:${apiName}:${identifier || 'default'}`;

    try {
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = this.formatDayKey(date);
        const key = `${baseKey}:${dayKey}`;

        const data = await this.redis.hgetall(key);
        const total = parseInt(data.total || '0');
        const success = parseInt(data.success || '0');
        const error = parseInt(data.error || '0');

        stats[dayKey] = {
          total,
          success,
          error,
          successRate: total > 0 ? (success / total) * 100 : 100,
        };
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get API stats:', error);
      return {};
    }
  }

  async getCurrentLimits(
    apiName: string,
    identifier?: string,
  ): Promise<{
    config: RateLimitConfig;
    current: RateLimitStatus;
  }> {
    const config = this.configs[apiName];
    const current = await this.checkRateLimit(apiName, identifier);

    return { config, current };
  }

  async resetRateLimit(apiName: string, identifier?: string): Promise<void> {
    const key = `ratelimit:${apiName}:${identifier || 'default'}`;
    const burstKey = `ratelimit:${apiName}:burst:${identifier || 'default'}`;

    try {
      await this.redis.del(key, burstKey);
      this.logger.log(
        `Rate limit reset for ${apiName}:${identifier || 'default'}`,
      );
    } catch (error) {
      this.logger.error('Failed to reset rate limit:', error);
    }
  }

  updateConfig(apiName: string, config: RateLimitConfig): void {
    this.configs[apiName] = config;
    this.logger.log(`Updated rate limit config for ${apiName}:`, config);
  }

  private getDayKey(): string {
    return this.formatDayKey(new Date());
  }

  private formatDayKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async healthCheck(): Promise<{
    redis: boolean;
    rateLimiterActive: boolean;
    configuredApis: string[];
  }> {
    let redisHealth = false;

    try {
      await this.redis.ping();
      redisHealth = true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
    }

    return {
      redis: redisHealth,
      rateLimiterActive: redisHealth,
      configuredApis: Object.keys(this.configs),
    };
  }
}
