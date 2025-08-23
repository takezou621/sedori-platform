import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Notification } from '../entities/notification.entity';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface WebPushMessage {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private webpush: any;
  private isWebPushEnabled = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeWebPush();
  }

  private async initializeWebPush(): Promise<void> {
    try {
      // Dynamically import web-push (optional dependency)
      this.webpush = await import('web-push');

      const vapidPublicKey = this.configService.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = this.configService.get('VAPID_PRIVATE_KEY');
      const vapidSubject =
        this.configService.get('VAPID_SUBJECT') ||
        'mailto:admin@sedori-platform.com';

      if (vapidPublicKey && vapidPrivateKey) {
        this.webpush.setVapidDetails(
          vapidSubject,
          vapidPublicKey,
          vapidPrivateKey,
        );
        this.isWebPushEnabled = true;
        this.logger.log('Web Push service initialized successfully');
      } else {
        this.logger.warn(
          'VAPID keys not configured. Push notifications will be simulated.',
        );
      }
    } catch (error) {
      this.logger.warn(
        'web-push package not installed. Push notifications will be simulated.',
      );
    }
  }

  async sendNotification(notification: Notification): Promise<void> {
    try {
      if (!this.isWebPushEnabled || !this.webpush) {
        this.logger.log(
          `[SIMULATED] Push notification sent to user ${notification.userId}: ${notification.title}`,
        );
        return;
      }

      const subscriptions = await this.getUserPushSubscriptions(
        notification.userId,
      );

      if (subscriptions.length === 0) {
        this.logger.warn(
          `No push subscriptions found for user ${notification.userId}`,
        );
        return;
      }

      const pushMessage = this.createPushMessage(notification);
      const payload = JSON.stringify(pushMessage);

      const sendPromises = subscriptions.map(async (subscription) => {
        try {
          await this.webpush.sendNotification(subscription, payload);
          this.logger.log(
            `Push notification sent successfully to user ${notification.userId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send push notification to subscription:`,
            error,
          );

          // Handle expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 413) {
            await this.removeExpiredSubscription(
              notification.userId,
              subscription,
            );
          }

          throw error;
        }
      });

      await Promise.allSettled(sendPromises);
    } catch (error) {
      this.logger.error(
        `Failed to send push notification ${notification.id}:`,
        error,
      );
      throw error;
    }
  }

  async sendToMultipleUsers(
    userIds: string[],
    message: WebPushMessage,
  ): Promise<void> {
    if (!this.isWebPushEnabled || !this.webpush) {
      this.logger.log(
        `[SIMULATED] Push notification sent to ${userIds.length} users: ${message.title}`,
      );
      return;
    }

    const allSubscriptions: Array<{
      userId: string;
      subscription: PushSubscription;
    }> = [];

    // Collect all subscriptions
    for (const userId of userIds) {
      const subscriptions = await this.getUserPushSubscriptions(userId);
      subscriptions.forEach((subscription) => {
        allSubscriptions.push({ userId, subscription });
      });
    }

    if (allSubscriptions.length === 0) {
      this.logger.warn(
        'No push subscriptions found for any of the target users',
      );
      return;
    }

    const payload = JSON.stringify(message);

    const sendPromises = allSubscriptions.map(
      async ({ userId, subscription }) => {
        try {
          await this.webpush.sendNotification(subscription, payload);
          this.logger.log(
            `Push notification sent successfully to user ${userId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send push notification to user ${userId}:`,
            error,
          );

          // Handle expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 413) {
            await this.removeExpiredSubscription(userId, subscription);
          }
        }
      },
    );

    await Promise.allSettled(sendPromises);
    this.logger.log(
      `Push notification batch sent to ${allSubscriptions.length} subscriptions`,
    );
  }

  async subscribeToPush(
    userId: string,
    subscription: PushSubscription,
    deviceInfo?: {
      userAgent: string;
      platform: string;
      deviceName?: string;
    },
  ): Promise<void> {
    try {
      // TODO: Store subscription in database
      // For now, we'll simulate storing it
      this.logger.log(
        `[SIMULATED] Push subscription stored for user ${userId}`,
      );

      // In a real implementation, you would:
      // await this.subscriptionRepository.save({
      //   userId,
      //   endpoint: subscription.endpoint,
      //   p256dh: subscription.keys.p256dh,
      //   auth: subscription.keys.auth,
      //   deviceInfo,
      //   createdAt: new Date(),
      // });
    } catch (error) {
      this.logger.error(
        `Failed to store push subscription for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async unsubscribeFromPush(userId: string, endpoint: string): Promise<void> {
    try {
      // TODO: Remove subscription from database
      this.logger.log(
        `[SIMULATED] Push subscription removed for user ${userId}, endpoint: ${endpoint}`,
      );

      // In a real implementation:
      // await this.subscriptionRepository.delete({
      //   userId,
      //   endpoint,
      // });
    } catch (error) {
      this.logger.error(
        `Failed to remove push subscription for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private createPushMessage(notification: Notification): WebPushMessage {
    const baseUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    const message: WebPushMessage = {
      title: notification.title,
      body: notification.message,
      icon: `${baseUrl}/images/icon-192.png`,
      badge: `${baseUrl}/images/badge-72.png`,
      tag: notification.type,
      requireInteraction: ['price_alert', 'order_status'].includes(
        notification.type,
      ),
    };

    // Add image if available
    if (notification.imageUrl) {
      message.image = notification.imageUrl;
    }

    // Add action URL as data
    if (notification.actionUrl) {
      message.data = {
        url: notification.actionUrl,
        notificationId: notification.id,
      };

      // Add action buttons for specific notification types
      if (notification.type === 'price_alert') {
        message.actions = [
          {
            action: 'view',
            title: '商品を見る',
            icon: `${baseUrl}/images/view-icon.png`,
          },
          {
            action: 'dismiss',
            title: '閉じる',
          },
        ];
      } else if (notification.type === 'order_status') {
        message.actions = [
          {
            action: 'view_order',
            title: '注文を確認',
            icon: `${baseUrl}/images/order-icon.png`,
          },
        ];
      }
    }

    return message;
  }

  private async getUserPushSubscriptions(
    userId: string,
  ): Promise<PushSubscription[]> {
    // TODO: Fetch from database
    // For now, return empty array (simulated)
    this.logger.debug(
      `[SIMULATED] Fetching push subscriptions for user ${userId}`,
    );

    // In a real implementation:
    // const subscriptions = await this.subscriptionRepository.find({
    //   where: { userId },
    // });
    //
    // return subscriptions.map(sub => ({
    //   endpoint: sub.endpoint,
    //   keys: {
    //     p256dh: sub.p256dh,
    //     auth: sub.auth,
    //   },
    // }));

    return [];
  }

  private async removeExpiredSubscription(
    userId: string,
    subscription: PushSubscription,
  ): Promise<void> {
    try {
      await this.unsubscribeFromPush(userId, subscription.endpoint);
      this.logger.log(`Removed expired push subscription for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove expired subscription for user ${userId}:`,
        error,
      );
    }
  }

  async testPushNotification(userId: string): Promise<void> {
    const testMessage: WebPushMessage = {
      title: 'テスト通知',
      body: 'プッシュ通知のテストメッセージです。',
      icon: `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/images/icon-192.png`,
      tag: 'test',
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    };

    if (!this.isWebPushEnabled || !this.webpush) {
      this.logger.log(
        `[SIMULATED] Test push notification sent to user ${userId}`,
      );
      return;
    }

    const subscriptions = await this.getUserPushSubscriptions(userId);

    if (subscriptions.length === 0) {
      throw new Error('No push subscriptions found for user');
    }

    const payload = JSON.stringify(testMessage);

    for (const subscription of subscriptions) {
      try {
        await this.webpush.sendNotification(subscription, payload);
        this.logger.log(
          `Test push notification sent successfully to user ${userId}`,
        );
      } catch (error) {
        this.logger.error(`Failed to send test push notification:`, error);
        throw error;
      }
    }
  }

  getVapidPublicKey(): string | null {
    return this.configService.get('VAPID_PUBLIC_KEY') || null;
  }

  isServiceEnabled(): boolean {
    return this.isWebPushEnabled;
  }
}
