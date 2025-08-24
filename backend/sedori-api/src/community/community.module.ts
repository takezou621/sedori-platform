import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { ForumPost } from './entities/forum-post.entity';
import { ForumReply } from './entities/forum-reply.entity';
import { UserFollow } from './entities/user-follow.entity';
import { PrivateMessage } from './entities/private-message.entity';
import { User } from '../users/entities/user.entity';

// Services
import { ForumService } from './services/forum.service';
import { MessagingService } from './services/messaging.service';
import { FollowService } from './services/follow.service';

// Controllers
import { ForumController } from './controllers/forum.controller';
import { MessagingController } from './controllers/messaging.controller';
import { FollowController } from './controllers/follow.controller';

// External modules
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForumPost,
      ForumReply,
      UserFollow,
      PrivateMessage,
      User,
    ]),
    ConfigModule,
    NotificationsModule,
  ],
  controllers: [
    ForumController,
    MessagingController,
    FollowController,
  ],
  providers: [
    ForumService,
    MessagingService,
    FollowService,
  ],
  exports: [
    ForumService,
    MessagingService,
    FollowService,
  ],
})
export class CommunityModule {}