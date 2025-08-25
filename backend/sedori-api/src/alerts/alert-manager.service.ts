import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KeepaApiService } from '../external-apis/keepa-api.service';
import { KeepaAiService } from '../external-apis/keepa-ai.service';
import { PredictionEngineAiService } from '../ai/alerts/prediction-engine.ai';
import { TimingOptimizerAiService } from '../ai/alerts/timing-optimizer.ai';
import {
  KeepaAlert,
  KeepaProduct,
  KeepaPriceAnalysis,
  KeepaTrackingType,
} from '../external-apis/interfaces/keepa-data.interface';

export interface SmartAlert extends KeepaAlert {
  // Enhanced alert with AI capabilities
  aiPredictions?: {
    probabilityOfTrigger: number; // 0-1
    estimatedTimeToTrigger?: number; // days
    confidenceLevel: 'low' | 'medium' | 'high';
    reasoningChain: string[];
  };
  smartTriggerConditions?: {
    priceTarget: number;
    trendCondition?: 'rising' | 'falling' | 'stable';
    volatilityThreshold?: number;
    seasonalAdjustment?: boolean;
    marketContextRequired?: boolean;
  };
  notificationChannels?: ('email' | 'sms' | 'push' | 'webhook')[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  smartSnoozing?: {
    enabled: boolean;
    conditions: string[];
    maxSnoozeTime: number; // minutes
  };
  lastCheck?: Date; // Add this field
}

export interface AlertNotification {
  alertId: string;
  asin: string;
  userId: string;
  type: 'trigger' | 'prediction' | 'warning' | 'opportunity';
  title: string;
  message: string;
  data?: any;
  channels: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  scheduledFor?: Date;
  sent: boolean;
  sentAt?: Date;
}

export interface AlertAnalytics {
  alertId: string;
  totalTriggers: number;
  accuracy: number; // percentage of useful alerts
  avgResponseTime: number; // minutes
  successfulActions: number;
  userFeedbackScore?: number; // 1-5
  improvementSuggestions: string[];
}

@Injectable()
export class AlertManagerService {
  private readonly logger = new Logger(AlertManagerService.name);
  private readonly alertsKey = 'smart-alerts';
  private readonly notificationsKey = 'alert-notifications';
  private readonly analyticsKey = 'alert-analytics';

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    private readonly keepaApiService: KeepaApiService,
    private readonly keepaAiService: KeepaAiService,
    private readonly predictionEngineAiService: PredictionEngineAiService,
    private readonly timingOptimizerAiService: TimingOptimizerAiService,
  ) {}

  async createSmartAlert(alertData: Partial<SmartAlert>): Promise<SmartAlert> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const smartAlert: SmartAlert = {
      alertId,
      asin: alertData.asin!,
      userId: alertData.userId!,
      domain: alertData.domain || 1,
      priceType: alertData.priceType || KeepaTrackingType.AMAZON,
      desiredPrice: alertData.desiredPrice!,
      currentPrice: alertData.currentPrice,
      isActive: true,
      createdAt: new Date(),
      notificationsSent: 0,
      intervalMinutes: alertData.intervalMinutes || 60,
      priority: alertData.priority || 'medium',
      notificationChannels: alertData.notificationChannels || ['email'],
      smartTriggerConditions: alertData.smartTriggerConditions,
      smartSnoozing: alertData.smartSnoozing || {
        enabled: false,
        conditions: [],
        maxSnoozeTime: 60,
      },
    };

    // Generate AI predictions for the alert
    try {
      const predictions = await this.generateAlertPredictions(smartAlert);
      smartAlert.aiPredictions = predictions;
    } catch (error) {
      this.logger.warn(`Failed to generate AI predictions for alert ${alertId}:`, error);
    }

    // Store the alert
    await this.storeAlert(smartAlert);
    
    // Initialize analytics
    await this.initializeAnalytics(alertId);

    this.logger.log(`Created smart alert ${alertId} for ASIN ${alertData.asin}`);
    return smartAlert;
  }

  async updateAlert(alertId: string, updateData: Partial<SmartAlert>): Promise<SmartAlert> {
    const existingAlert = await this.getAlert(alertId);
    if (!existingAlert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    const updatedAlert: SmartAlert = {
      ...existingAlert,
      ...updateData,
      alertId, // Ensure ID doesn't change
    };

    // Regenerate AI predictions if critical data changed
    if (updateData.desiredPrice || updateData.smartTriggerConditions) {
      try {
        const predictions = await this.generateAlertPredictions(updatedAlert);
        updatedAlert.aiPredictions = predictions;
      } catch (error) {
        this.logger.warn(`Failed to update AI predictions for alert ${alertId}:`, error);
      }
    }

    await this.storeAlert(updatedAlert);
    this.logger.log(`Updated alert ${alertId}`);
    
    return updatedAlert;
  }

  async getAlert(alertId: string): Promise<SmartAlert | null> {
    const alertData = await this.redis.hget(this.alertsKey, alertId);
    return alertData ? JSON.parse(alertData) : null;
  }

  async getUserAlerts(userId: string): Promise<SmartAlert[]> {
    const allAlerts = await this.getAllAlerts();
    return allAlerts.filter(alert => alert.userId === userId && alert.isActive);
  }

  async deleteAlert(alertId: string): Promise<void> {
    await this.redis.hdel(this.alertsKey, alertId);
    await this.redis.hdel(this.analyticsKey, alertId);
    this.logger.log(`Deleted alert ${alertId}`);
  }

  async pauseAlert(alertId: string, duration?: number): Promise<void> {
    const alert = await this.getAlert(alertId);
    if (!alert) return;

    alert.isActive = false;
    if (duration) {
      // Schedule reactivation
      setTimeout(async () => {
        alert.isActive = true;
        await this.storeAlert(alert);
        this.logger.log(`Reactivated alert ${alertId} after pause`);
      }, duration * 60 * 1000); // duration in minutes
    }

    await this.storeAlert(alert);
    this.logger.log(`Paused alert ${alertId}${duration ? ` for ${duration} minutes` : ''}`);
  }

  // Cron job to check alerts every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAlerts(): Promise<void> {
    this.logger.debug('Running alert check cycle');
    
    const alerts = await this.getAllActiveAlerts();
    const now = new Date();

    for (const alert of alerts) {
      try {
        // Check if it's time to evaluate this alert
        const lastCheck = alert.lastCheck || new Date(0);
        const intervalMs = alert.intervalMinutes * 60 * 1000;
        
        if (now.getTime() - lastCheck.getTime() < intervalMs) {
          continue;
        }

        await this.evaluateAlert(alert);
        
        // Update last check time
        alert.lastCheck = now;
        await this.storeAlert(alert);

      } catch (error) {
        this.logger.error(`Error evaluating alert ${alert.alertId}:`, error);
      }
    }
  }

  // Cron job to update AI predictions daily
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async updateAiPredictions(): Promise<void> {
    this.logger.log('Updating AI predictions for all alerts');
    
    const alerts = await this.getAllActiveAlerts();
    
    for (const alert of alerts) {
      try {
        const predictions = await this.generateAlertPredictions(alert);
        alert.aiPredictions = predictions;
        await this.storeAlert(alert);
      } catch (error) {
        this.logger.warn(`Failed to update predictions for alert ${alert.alertId}:`, error);
      }
    }
  }

  private async evaluateAlert(alert: SmartAlert): Promise<void> {
    // Get current product data
    const product = await this.keepaApiService.getProduct(alert.asin, true, 7);
    const currentPrice = this.getCurrentPrice(product, alert.priceType);
    
    if (!currentPrice) {
      this.logger.warn(`No current price found for ${alert.asin}, skipping alert ${alert.alertId}`);
      return;
    }

    // Update current price in alert
    alert.currentPrice = currentPrice;

    // Check if basic price condition is met
    const basicTrigger = this.checkBasicPriceTrigger(alert, currentPrice);
    
    // Check smart trigger conditions if defined
    let smartTrigger = true;
    if (alert.smartTriggerConditions) {
      smartTrigger = await this.checkSmartTriggerConditions(alert, product);
    }

    // Check if alert should trigger
    if (basicTrigger && smartTrigger) {
      // Check smart snoozing
      if (alert.smartSnoozing?.enabled) {
        const shouldSnooze = await this.checkSmartSnoozing(alert, product);
        if (shouldSnooze) {
          this.logger.debug(`Smart snoozing activated for alert ${alert.alertId}`);
          return;
        }
      }

      await this.triggerAlert(alert, product);
    } else {
      // Send predictive notifications if AI suggests high probability
      if (alert.aiPredictions?.probabilityOfTrigger && alert.aiPredictions.probabilityOfTrigger > 0.8) {
        await this.sendPredictiveNotification(alert, product);
      }
    }

    await this.updateAnalytics(alert, basicTrigger, smartTrigger);
  }

  private checkBasicPriceTrigger(alert: SmartAlert, currentPrice: number): boolean {
    return currentPrice <= alert.desiredPrice;
  }

  private async checkSmartTriggerConditions(alert: SmartAlert, product: KeepaProduct): Promise<boolean> {
    const conditions = alert.smartTriggerConditions!;
    
    // Check trend condition
    if (conditions.trendCondition) {
      try {
        const priceAnalysis = await this.keepaAiService.analyzePriceHistory(alert.asin, 30);
        const currentTrend = priceAnalysis.analysis.trend;
        
        if (currentTrend !== conditions.trendCondition) {
          return false;
        }
      } catch (error) {
        this.logger.warn(`Failed to check trend condition for alert ${alert.alertId}:`, error);
      }
    }

    // Check volatility threshold
    if (conditions.volatilityThreshold !== undefined) {
      try {
        const priceAnalysis = await this.keepaAiService.analyzePriceHistory(alert.asin, 30);
        if (priceAnalysis.analysis.volatility > conditions.volatilityThreshold) {
          return false; // Too volatile
        }
      } catch (error) {
        this.logger.warn(`Failed to check volatility for alert ${alert.alertId}:`, error);
      }
    }

    // Check seasonal adjustment
    if (conditions.seasonalAdjustment) {
      // Implement seasonal price adjustment logic
      // This would adjust the target price based on seasonal patterns
    }

    return true;
  }

  private async checkSmartSnoozing(alert: SmartAlert, product: KeepaProduct): Promise<boolean> {
    const snoozing = alert.smartSnoozing!;
    
    for (const condition of snoozing.conditions) {
      switch (condition) {
        case 'market_hours':
          // Don't trigger outside market hours
          const hour = new Date().getHours();
          if (hour < 9 || hour > 17) return true;
          break;
          
        case 'high_volatility':
          // Snooze during high volatility periods
          try {
            const analysis = await this.keepaAiService.analyzePriceHistory(alert.asin, 7);
            if (analysis.analysis.volatility > 25) return true;
          } catch (error) {
            this.logger.warn(`Volatility check failed for snoozing:`, error);
          }
          break;
          
        case 'recent_trigger':
          // Don't trigger again too soon
          const recentTrigger = alert.triggeredAt;
          if (recentTrigger) {
            const timeSince = Date.now() - recentTrigger.getTime();
            if (timeSince < snoozing.maxSnoozeTime * 60 * 1000) return true;
          }
          break;
      }
    }
    
    return false;
  }

  private async triggerAlert(alert: SmartAlert, product: KeepaProduct): Promise<void> {
    this.logger.log(`Alert triggered: ${alert.alertId} for ASIN ${alert.asin}`);
    
    // Update alert
    alert.triggeredAt = new Date();
    alert.notificationsSent++;
    
    // Generate detailed notification
    const notification: AlertNotification = {
      alertId: alert.alertId,
      asin: alert.asin,
      userId: alert.userId,
      type: 'trigger',
      title: `価格アラート発動: ${product.title}`,
      message: await this.generateAlertMessage(alert, product),
      data: {
        currentPrice: alert.currentPrice,
        targetPrice: alert.desiredPrice,
        savings: alert.desiredPrice - alert.currentPrice!,
        product: {
          title: product.title,
          asin: product.asin,
          imageUrl: product.imagesCSV?.split(',')[0],
        },
        aiInsights: alert.aiPredictions,
      },
      channels: alert.notificationChannels || ['email'],
      priority: alert.priority,
      createdAt: new Date(),
      sent: false,
    };

    await this.sendNotification(notification);
    await this.storeAlert(alert);
  }

  private async sendPredictiveNotification(alert: SmartAlert, product: KeepaProduct): Promise<void> {
    const predictions = alert.aiPredictions!;
    
    const notification: AlertNotification = {
      alertId: alert.alertId,
      asin: alert.asin,
      userId: alert.userId,
      type: 'prediction',
      title: `価格予測通知: ${product.title}`,
      message: `AIの予測によると、${predictions.estimatedTimeToTrigger}日以内に目標価格に達する可能性が${(predictions.probabilityOfTrigger * 100).toFixed(0)}%あります。`,
      data: {
        predictions,
        product: {
          title: product.title,
          asin: product.asin,
        },
      },
      channels: ['push'], // Less intrusive for predictions
      priority: 'low',
      createdAt: new Date(),
      sent: false,
    };

    await this.sendNotification(notification);
  }

  private async generateAlertPredictions(alert: SmartAlert): Promise<SmartAlert['aiPredictions']> {
    try {
      const predictions = await this.predictionEngineAiService.generatePredictions(alert.asin, {
        timeHorizon: 30,
        targetPrice: alert.desiredPrice,
        priceType: alert.priceType,
      });

      const timingOptimization = await this.timingOptimizerAiService.optimizeTiming(alert.asin, {
        targetPrice: alert.desiredPrice,
        currentConditions: alert.smartTriggerConditions,
      });

      return {
        probabilityOfTrigger: predictions.probabilityScore || 0.5,
        estimatedTimeToTrigger: predictions.estimatedDays,
        confidenceLevel: predictions.confidence > 0.8 ? 'high' : 
                        predictions.confidence > 0.6 ? 'medium' : 'low',
        reasoningChain: [
          ...predictions.insights,
          ...(timingOptimization.recommendations || []),
        ],
      };
    } catch (error) {
      this.logger.warn(`Failed to generate alert predictions:`, error);
      return {
        probabilityOfTrigger: 0.5,
        confidenceLevel: 'low',
        reasoningChain: ['データ不足のため詳細な予測ができません'],
      };
    }
  }

  private async generateAlertMessage(alert: SmartAlert, product: KeepaProduct): Promise<string> {
    const savings = alert.desiredPrice - alert.currentPrice!;
    const savingsPercent = ((savings / alert.desiredPrice) * 100).toFixed(1);
    
    let message = `${product.title}\n`;
    message += `現在価格: ¥${alert.currentPrice!.toLocaleString()}\n`;
    message += `目標価格: ¥${alert.desiredPrice.toLocaleString()}\n`;
    message += `節約額: ¥${Math.abs(savings).toLocaleString()} (${savingsPercent}%)\n`;
    
    if (alert.aiPredictions?.reasoningChain.length) {
      message += `\nAI分析:\n${alert.aiPredictions.reasoningChain.join('\n')}`;
    }
    
    return message;
  }

  private async sendNotification(notification: AlertNotification): Promise<void> {
    // Store notification
    await this.redis.hset(
      this.notificationsKey,
      `${notification.alertId}-${Date.now()}`,
      JSON.stringify(notification)
    );

    // Here would be actual notification sending logic
    // Integration with email, SMS, push notification services
    this.logger.log(`Notification queued: ${notification.type} for alert ${notification.alertId}`);
    
    // For now, just mark as sent
    notification.sent = true;
    notification.sentAt = new Date();
  }

  private getCurrentPrice(product: KeepaProduct, priceType: KeepaTrackingType): number | null {
    const currentPrices = product.stats?.current;
    if (!currentPrices) return null;
    
    const price = currentPrices[priceType];
    return price && price > 0 ? price / 100 : null; // Convert from cents
  }

  private async storeAlert(alert: SmartAlert): Promise<void> {
    await this.redis.hset(this.alertsKey, alert.alertId, JSON.stringify(alert));
  }

  private async getAllAlerts(): Promise<SmartAlert[]> {
    const alertsData = await this.redis.hgetall(this.alertsKey);
    return Object.values(alertsData).map(data => JSON.parse(data));
  }

  private async getAllActiveAlerts(): Promise<SmartAlert[]> {
    const allAlerts = await this.getAllAlerts();
    return allAlerts.filter(alert => alert.isActive);
  }

  private async initializeAnalytics(alertId: string): Promise<void> {
    const analytics: AlertAnalytics = {
      alertId,
      totalTriggers: 0,
      accuracy: 0,
      avgResponseTime: 0,
      successfulActions: 0,
      improvementSuggestions: [],
    };
    
    await this.redis.hset(this.analyticsKey, alertId, JSON.stringify(analytics));
  }

  private async updateAnalytics(alert: SmartAlert, triggered: boolean, smartTriggered: boolean): Promise<void> {
    // Implementation would track alert performance metrics
    // This is a simplified version
    const analyticsData = await this.redis.hget(this.analyticsKey, alert.alertId);
    if (!analyticsData) return;
    
    const analytics: AlertAnalytics = JSON.parse(analyticsData);
    
    if (triggered) {
      analytics.totalTriggers++;
    }
    
    await this.redis.hset(this.analyticsKey, alert.alertId, JSON.stringify(analytics));
  }
}