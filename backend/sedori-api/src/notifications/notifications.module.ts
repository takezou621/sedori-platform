import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './services/notification.service';
import { EmailNotificationService } from './services/email-notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { WebSocketService } from './services/websocket.service';
import { NotificationController } from './controllers/notification.controller';
import { Notification } from './entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    JwtModule.register({}), // Configuration will come from AuthModule
    ConfigModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    EmailNotificationService,
    PushNotificationService,
    WebSocketService,
  ],
  exports: [
    NotificationService,
    EmailNotificationService,
    PushNotificationService,
    WebSocketService,
  ],
})
export class NotificationsModule {}
