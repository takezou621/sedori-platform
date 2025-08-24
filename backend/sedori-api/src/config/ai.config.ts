import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'), // 30 seconds
  },
  tensorflow: {
    enableGpu: process.env.TF_ENABLE_GPU === 'true',
    memoryGrowth: process.env.TF_MEMORY_GROWTH !== 'false',
    threads: parseInt(process.env.TF_THREADS || '4'),
  },
  features: {
    enableNlpSearch: process.env.AI_ENABLE_NLP_SEARCH !== 'false',
    enablePricePrediction: process.env.AI_ENABLE_PRICE_PREDICTION !== 'false',
    enableTrendAnalysis: process.env.AI_ENABLE_TREND_ANALYSIS !== 'false',
    enableAutoScoring: process.env.AI_ENABLE_AUTO_SCORING !== 'false',
    enableChatInterface: process.env.AI_ENABLE_CHAT_INTERFACE !== 'false',
    enableVoiceSearch: process.env.AI_ENABLE_VOICE_SEARCH !== 'false',
    enableReportGeneration: process.env.AI_ENABLE_REPORT_GENERATION !== 'false',
    enableAnomalyDetection: process.env.AI_ENABLE_ANOMALY_DETECTION !== 'false',
  },
  prediction: {
    timeHorizon: parseInt(process.env.AI_PREDICTION_HORIZON || '90'), // days
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.75'),
    updateInterval: process.env.AI_UPDATE_INTERVAL || '0 2 * * *', // Daily at 2 AM
    batchSize: parseInt(process.env.AI_BATCH_SIZE || '100'),
    maxHistoryDays: parseInt(process.env.AI_MAX_HISTORY_DAYS || '365'),
  },
  ml: {
    enableOnlineTraining: process.env.ML_ENABLE_ONLINE_TRAINING !== 'false',
    modelSaveInterval: parseInt(process.env.ML_MODEL_SAVE_INTERVAL || '86400000'), // 24 hours
    trainingDataRetention: parseInt(process.env.ML_TRAINING_DATA_RETENTION || '30'), // days
    minTrainingDataSize: parseInt(process.env.ML_MIN_TRAINING_DATA || '1000'),
    validationSplit: parseFloat(process.env.ML_VALIDATION_SPLIT || '0.2'),
  },
  caching: {
    enableAiCache: process.env.AI_CACHE_ENABLED !== 'false',
    cacheTimeout: parseInt(process.env.AI_CACHE_TIMEOUT || '3600000'), // 1 hour
    maxCacheSize: parseInt(process.env.AI_MAX_CACHE_SIZE || '1000'),
    predictionCacheTimeout: parseInt(process.env.AI_PREDICTION_CACHE_TIMEOUT || '1800000'), // 30 minutes
  },
  quality: {
    minAccuracyThreshold: parseFloat(process.env.AI_MIN_ACCURACY || '0.8'),
    enableQualityMonitoring: process.env.AI_QUALITY_MONITORING !== 'false',
    qualityCheckInterval: parseInt(process.env.AI_QUALITY_CHECK_INTERVAL || '3600000'), // 1 hour
    enableAutoRetraining: process.env.AI_ENABLE_AUTO_RETRAINING !== 'false',
    performanceThreshold: parseFloat(process.env.AI_PERFORMANCE_THRESHOLD || '0.85'),
  },
  monitoring: {
    enableMetrics: process.env.AI_METRICS_ENABLED !== 'false',
    metricsInterval: parseInt(process.env.AI_METRICS_INTERVAL || '60000'), // 1 minute
    enableAlerting: process.env.AI_ALERTING_ENABLED !== 'false',
    alertWebhook: process.env.AI_ALERT_WEBHOOK || '',
    logLevel: process.env.AI_LOG_LEVEL || 'info',
  },
}));

// Environment validation for AI configuration
export const validateAiConfig = () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check OpenAI API key for advanced features
  if (!process.env.OPENAI_API_KEY) {
    warnings.push('Missing OPENAI_API_KEY - AI features will be limited to basic ML models');
  }

  // Validate numeric ranges
  const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.3');
  if (temperature < 0 || temperature > 2) {
    errors.push('OPENAI_TEMPERATURE must be between 0 and 2');
  }

  const confidenceThreshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.75');
  if (confidenceThreshold < 0 || confidenceThreshold > 1) {
    errors.push('AI_CONFIDENCE_THRESHOLD must be between 0 and 1');
  }

  const validationSplit = parseFloat(process.env.ML_VALIDATION_SPLIT || '0.2');
  if (validationSplit < 0 || validationSplit > 0.5) {
    errors.push('ML_VALIDATION_SPLIT must be between 0 and 0.5');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn(`AI Configuration warnings:\n${warnings.join('\n')}`);
  }

  // Throw errors if any
  if (errors.length > 0) {
    throw new Error(`AI Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
};