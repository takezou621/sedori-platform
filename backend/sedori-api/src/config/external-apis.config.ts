import { registerAs } from '@nestjs/config';

export default registerAs('externalApis', () => ({
  amazon: {
    accessKey: process.env.AMAZON_ACCESS_KEY || '',
    secretKey: process.env.AMAZON_SECRET_KEY || '',
    associateTag: process.env.AMAZON_ASSOCIATE_TAG || '',
    region: process.env.AMAZON_REGION || 'us-east-1',
    host: process.env.AMAZON_PA_API_HOST || 'webservices.amazon.com',
    endpoint: process.env.AMAZON_PA_API_ENDPOINT || '/paapi5',
    rateLimits: {
      tps: parseInt(process.env.AMAZON_TPS_LIMIT || '1'), // Transactions per second
      dailyQuota: parseInt(process.env.AMAZON_DAILY_QUOTA || '8640'), // Daily quota
    },
    timeout: parseInt(process.env.AMAZON_API_TIMEOUT || '30000'), // 30 seconds
  },
  rakuten: {
    applicationId: process.env.RAKUTEN_APPLICATION_ID || '',
    secret: process.env.RAKUTEN_SECRET || '',
    baseUrl:
      process.env.RAKUTEN_BASE_URL || 'https://app.rakuten.co.jp/services/api',
    version: process.env.RAKUTEN_API_VERSION || '20220601',
    rateLimits: {
      rpm: parseInt(process.env.RAKUTEN_RPM_LIMIT || '100'), // Requests per minute
      dailyQuota: parseInt(process.env.RAKUTEN_DAILY_QUOTA || '10000'),
    },
    timeout: parseInt(process.env.RAKUTEN_API_TIMEOUT || '15000'), // 15 seconds
  },
  yahoo: {
    clientId: process.env.YAHOO_CLIENT_ID || '',
    clientSecret: process.env.YAHOO_CLIENT_SECRET || '',
    baseUrl:
      process.env.YAHOO_BASE_URL ||
      'https://shopping.yahooapis.jp/ShoppingWebService/V3',
    version: process.env.YAHOO_API_VERSION || 'V3',
    rateLimits: {
      rpm: parseInt(process.env.YAHOO_RPM_LIMIT || '1000'), // Requests per minute
      dailyQuota: parseInt(process.env.YAHOO_DAILY_QUOTA || '50000'),
    },
    timeout: parseInt(process.env.YAHOO_API_TIMEOUT || '20000'), // 20 seconds
  },
  keepa: {
    apiKey: process.env.KEEPA_API_KEY || '',
    baseUrl: process.env.KEEPA_BASE_URL || 'https://api.keepa.com',
    version: process.env.KEEPA_API_VERSION || 'v1',
    rateLimits: {
      tokensPerMinute: parseInt(process.env.KEEPA_TOKENS_PER_MINUTE || '100'), // API tokens per minute
      tokensPerDay: parseInt(process.env.KEEPA_TOKENS_PER_DAY || '100000'), // Daily token quota
      requestsPerSecond: parseInt(process.env.KEEPA_REQUESTS_PER_SECOND || '5'), // Max requests per second
    },
    timeout: parseInt(process.env.KEEPA_API_TIMEOUT || '30000'), // 30 seconds
    enableAiEnhancements: process.env.KEEPA_ENABLE_AI !== 'false',
    domain: parseInt(process.env.KEEPA_DOMAIN || '5'), // 5 = Japan Amazon
  },
  scheduler: {
    priceUpdateInterval: process.env.PRICE_UPDATE_INTERVAL || '0 */6 * * *', // Every 6 hours
    trendingUpdateInterval: process.env.TRENDING_UPDATE_INTERVAL || '0 9 * * 1', // Monday 9 AM
    quickCheckInterval: process.env.QUICK_CHECK_INTERVAL || '*/1 * * * *', // Every minute
    batchSize: parseInt(process.env.UPDATE_BATCH_SIZE || '50'),
    concurrency: parseInt(process.env.UPDATE_CONCURRENCY || '5'),
    retryAttempts: parseInt(process.env.UPDATE_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.UPDATE_RETRY_DELAY || '5000'), // 5 seconds
  },
  common: {
    userAgent: process.env.API_USER_AGENT || 'SedoriPlatform/1.0',
    defaultTimeout: parseInt(process.env.DEFAULT_API_TIMEOUT || '30000'),
    enableFallback: process.env.ENABLE_FALLBACK_DATA !== 'false',
    enableCaching: process.env.ENABLE_API_CACHING !== 'false',
    cacheTimeout: parseInt(process.env.API_CACHE_TIMEOUT || '300000'), // 5 minutes
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    enableMetrics: process.env.ENABLE_API_METRICS !== 'false',
    logLevel: process.env.API_LOG_LEVEL || 'info',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'sedori:',
  },
  monitoring: {
    enableHealthChecks: process.env.ENABLE_API_HEALTH_CHECKS !== 'false',
    healthCheckInterval: parseInt(
      process.env.HEALTH_CHECK_INTERVAL || '300000',
    ), // 5 minutes
    alertThreshold: {
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '10'), // 10%
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '5000'), // 5 seconds
      successRate: parseFloat(process.env.SUCCESS_RATE_THRESHOLD || '95'), // 95%
    },
    notificationWebhook: process.env.NOTIFICATION_WEBHOOK || '',
    slackWebhook: process.env.SLACK_WEBHOOK || '',
  },
}));

// Environment validation
export const validateExternalApiConfig = () => {
  const errors: string[] = [];

  // Check critical environment variables
  const criticalVars = ['REDIS_HOST', 'REDIS_PORT'];

  for (const varName of criticalVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check API credentials (warn if missing)
  const apiVars = [
    'AMAZON_ACCESS_KEY',
    'RAKUTEN_APPLICATION_ID',
    'YAHOO_CLIENT_ID',
    'KEEPA_API_KEY',
  ];

  const missingApiVars = apiVars.filter((varName) => !process.env[varName]);
  if (missingApiVars.length > 0) {
    console.warn(
      `Warning: Missing API credentials for: ${missingApiVars.join(', ')}. ` +
        'Fallback data will be used.',
    );
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
};
