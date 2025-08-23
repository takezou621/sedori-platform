import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

export const ThrottlerConfigModule = ThrottlerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const isProduction = configService.get('NODE_ENV') === 'production';
    
    return [
      {
        name: 'global',
        ttl: 60 * 1000, // 1 minute
        limit: isProduction ? 100 : 1000, // 100 requests per minute in prod, 1000 in dev
      },
      {
        name: 'strict',
        ttl: 60 * 1000, // 1 minute  
        limit: isProduction ? 10 : 50, // 10 requests per minute in prod, 50 in dev
      },
      {
        name: 'auth',
        ttl: 15 * 60 * 1000, // 15 minutes
        limit: isProduction ? 5 : 20, // 5 attempts per 15 min in prod, 20 in dev
      },
      {
        name: 'search',
        ttl: 60 * 1000, // 1 minute
        limit: isProduction ? 30 : 100, // 30 searches per minute in prod, 100 in dev
      },
      {
        name: 'upload',
        ttl: 60 * 1000, // 1 minute
        limit: isProduction ? 5 : 20, // 5 uploads per minute in prod, 20 in dev
      },
    ];
  },
});

// Rate limiting configurations for different endpoint types
export const RateLimitConfig = {
  // Authentication endpoints - very strict
  AUTH: {
    LOGIN: { limit: 5, ttl: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    REGISTER: { limit: 3, ttl: 60 * 60 * 1000 }, // 3 registrations per hour
    PASSWORD_RESET: { limit: 3, ttl: 60 * 60 * 1000 }, // 3 resets per hour
  },

  // AI-powered features - moderate restrictions
  AI_FEATURES: {
    OPTIMIZATION: { limit: 10, ttl: 60 * 1000 }, // 10 optimizations per minute
    RECOMMENDATIONS: { limit: 20, ttl: 60 * 1000 }, // 20 recommendations per minute
    MARKET_ANALYSIS: { limit: 15, ttl: 60 * 1000 }, // 15 analyses per minute
  },

  // CRUD operations - less restrictive
  CRUD: {
    CREATE: { limit: 50, ttl: 60 * 1000 }, // 50 creates per minute
    UPDATE: { limit: 100, ttl: 60 * 1000 }, // 100 updates per minute
    DELETE: { limit: 20, ttl: 60 * 1000 }, // 20 deletes per minute
    READ: { limit: 200, ttl: 60 * 1000 }, // 200 reads per minute
  },

  // Search operations
  SEARCH: {
    BASIC: { limit: 30, ttl: 60 * 1000 }, // 30 searches per minute
    ADVANCED: { limit: 15, ttl: 60 * 1000 }, // 15 advanced searches per minute
    SUGGESTIONS: { limit: 100, ttl: 60 * 1000 }, // 100 suggestion requests per minute
  },

  // File operations
  FILES: {
    UPLOAD: { limit: 5, ttl: 60 * 1000 }, // 5 uploads per minute
    DOWNLOAD: { limit: 50, ttl: 60 * 1000 }, // 50 downloads per minute
  },

  // Analytics and tracking
  ANALYTICS: {
    TRACK_EVENT: { limit: 100, ttl: 60 * 1000 }, // 100 events per minute
    DASHBOARD: { limit: 20, ttl: 60 * 1000 }, // 20 dashboard loads per minute
    REPORTS: { limit: 10, ttl: 60 * 1000 }, // 10 report generations per minute
  },

  // Subscription and billing
  SUBSCRIPTION: {
    UPGRADE: { limit: 2, ttl: 60 * 60 * 1000 }, // 2 upgrades per hour
    USAGE_CHECK: { limit: 60, ttl: 60 * 1000 }, // 60 usage checks per minute
    BILLING: { limit: 5, ttl: 60 * 60 * 1000 }, // 5 billing operations per hour
  },
};

// IP-based rate limiting for specific scenarios
export const IPRateLimitConfig = {
  // Aggressive IP blocking for suspicious activity
  SUSPICIOUS: {
    limit: 10,
    ttl: 60 * 60 * 1000, // 10 requests per hour for flagged IPs
  },
  
  // Standard IP limits
  STANDARD: {
    limit: 1000,
    ttl: 60 * 60 * 1000, // 1000 requests per hour per IP
  },
  
  // Lenient for known good IPs
  TRUSTED: {
    limit: 5000,
    ttl: 60 * 60 * 1000, // 5000 requests per hour for trusted IPs
  },
};