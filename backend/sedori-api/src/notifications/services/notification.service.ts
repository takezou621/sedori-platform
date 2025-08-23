import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import {
  CreateNotificationDto,
  NotificationChannel,
} from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { EmailNotificationService } from './email-notification.service';
import { PushNotificationService } from './push-notification.service';
import { WebSocketService } from './websocket.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly emailService: EmailNotificationService,
    private readonly pushService: PushNotificationService,
    private readonly websocketService: WebSocketService,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    try {
      const notification = this.notificationRepository.create(
        createNotificationDto,
      );
      const savedNotification =
        await this.notificationRepository.save(notification);

      // Send notification through requested channels
      await this.sendNotification(savedNotification);

      return savedNotification;
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  async findAll(
    userId?: string,
    page: number = 1,
    limit: number = 20,
    isRead?: boolean,
  ): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query =
      this.notificationRepository.createQueryBuilder('notification');

    if (userId) {
      query.where('notification.userId = :userId', { userId });
    }

    if (isRead !== undefined) {
      query.andWhere('notification.isRead = :isRead', { isRead });
    }

    query
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      // relations: ['user'],
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }

  async update(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.findOne(id);

    if (updateNotificationDto.isRead === true && !notification.readAt) {
      updateNotificationDto.readAt = new Date();
    }

    Object.assign(notification, updateNotificationDto);
    return this.notificationRepository.save(notification);
  }

  async remove(id: string): Promise<void> {
    const result = await this.notificationRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Notification not found');
    }
  }

  async markAsRead(id: string): Promise<Notification> {
    return this.update(id, {
      isRead: true,
      readAt: new Date(),
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  private async sendNotification(notification: Notification): Promise<void> {
    const failedChannels: NotificationChannel[] = [];

    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case NotificationChannel.EMAIL:
            await this.emailService.sendNotification(notification);
            break;
          case NotificationChannel.PUSH:
            await this.pushService.sendNotification(notification);
            break;
          case NotificationChannel.IN_APP:
            await this.websocketService.sendToUser(notification.userId, {
              type: 'notification',
              data: notification,
            });
            break;
          case NotificationChannel.SMS:
            // TODO: Implement SMS service
            this.logger.warn(
              `SMS channel not implemented for notification ${notification.id}`,
            );
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send notification via ${channel}:`, error);
        failedChannels.push(channel);
      }
    }

    // Update notification status
    await this.notificationRepository.update(notification.id, {
      sentAt: new Date(),
      failedChannels: failedChannels.length > 0 ? failedChannels : undefined,
      retryCount:
        failedChannels.length > 0
          ? notification.retryCount + 1
          : notification.retryCount,
    });
  }

  async retryFailedNotification(id: string): Promise<Notification> {
    const notification = await this.findOne(id);

    if (
      !notification.failedChannels ||
      notification.failedChannels.length === 0
    ) {
      throw new Error('No failed channels to retry');
    }

    // Create a temporary notification with only failed channels
    const retryNotification = {
      ...notification,
      channels: notification.failedChannels,
    };

    await this.sendNotification(retryNotification);
    return this.findOne(id);
  }

  async createBulkNotifications(
    userIds: string[],
    notificationData: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<Notification[]> {
    const notifications = userIds.map((userId) => ({
      ...notificationData,
      userId,
    }));

    const createdNotifications =
      this.notificationRepository.create(notifications);
    const savedNotifications =
      await this.notificationRepository.save(createdNotifications);

    // Send notifications asynchronously
    savedNotifications.forEach((notification) => {
      this.sendNotification(notification).catch((error) => {
        this.logger.error(
          `Failed to send bulk notification ${notification.id}:`,
          error,
        );
      });
    });

    return savedNotifications;
  }

  async deleteOldNotifications(daysOld: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('isRead = true')
      .execute();

    this.logger.log(
      `Deleted ${result.affected} old notifications older than ${daysOld} days`,
    );
  }
}
