import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class WebSocketService
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketService.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `Connection rejected: No token provided from ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.userId = payload.sub;

      // Track user connection
      if (client.userId) {
        if (!this.connectedUsers.has(client.userId)) {
          this.connectedUsers.set(client.userId, new Set());
        }
        this.connectedUsers.get(client.userId)!.add(client.id);
      }

      // Join user-specific room
      client.join(`user:${client.userId}`);

      this.logger.log(
        `User ${client.userId} connected with socket ${client.id}`,
      );

      // Send connection confirmation
      client.emit('connected', {
        message: 'Successfully connected to notification service',
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error('Authentication failed during connection:', error);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }

      this.logger.log(`User ${client.userId} disconnected socket ${client.id}`);
    }
  }

  @SubscribeMessage('subscribe_notifications')
  handleSubscribeNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    client.join(`notifications:${client.userId}`);
    client.emit('subscribed', {
      message: 'Subscribed to notifications',
      userId: client.userId,
    });

    this.logger.log(`User ${client.userId} subscribed to notifications`);
  }

  @SubscribeMessage('unsubscribe_notifications')
  handleUnsubscribeNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    client.leave(`notifications:${client.userId}`);
    client.emit('unsubscribed', {
      message: 'Unsubscribed from notifications',
      userId: client.userId,
    });

    this.logger.log(`User ${client.userId} unsubscribed from notifications`);
  }

  @SubscribeMessage('mark_notification_read')
  handleMarkNotificationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ): void {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Emit confirmation
    client.emit('notification_marked_read', {
      notificationId: data.notificationId,
      userId: client.userId,
    });

    this.logger.log(
      `User ${client.userId} marked notification ${data.notificationId} as read`,
    );
  }

  async sendToUser(userId: string, data: any): Promise<void> {
    try {
      // Send to user-specific room
      this.server.to(`user:${userId}`).emit('notification', data);

      // Also send to notification subscribers
      this.server.to(`notifications:${userId}`).emit('new_notification', data);

      this.logger.log(`Sent notification to user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}:`,
        error,
      );
    }
  }

  async sendToMultipleUsers(userIds: string[], data: any): Promise<void> {
    const promises = userIds.map((userId) => this.sendToUser(userId, data));
    await Promise.allSettled(promises);
  }

  async broadcastToAll(data: any): Promise<void> {
    try {
      this.server.emit('broadcast', data);
      this.logger.log('Broadcast message sent to all connected clients');
    } catch (error) {
      this.logger.error('Failed to broadcast message:', error);
    }
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  getUserConnectionCount(userId: string): number {
    return this.connectedUsers.get(userId)?.size || 0;
  }

  isUserConnected(userId: string): boolean {
    return (
      this.connectedUsers.has(userId) &&
      this.connectedUsers.get(userId)!.size > 0
    );
  }

  async sendSystemNotification(
    message: string,
    type: 'info' | 'warning' | 'error' = 'info',
  ): Promise<void> {
    const systemNotification = {
      type: 'system',
      level: type,
      message,
      timestamp: new Date().toISOString(),
    };

    await this.broadcastToAll(systemNotification);
  }

  async sendMaintenanceNotification(
    message: string,
    scheduledAt?: Date,
    duration?: number,
  ): Promise<void> {
    const maintenanceNotification = {
      type: 'maintenance',
      message,
      scheduledAt: scheduledAt?.toISOString(),
      duration, // in minutes
      timestamp: new Date().toISOString(),
    };

    await this.broadcastToAll(maintenanceNotification);
  }
}
