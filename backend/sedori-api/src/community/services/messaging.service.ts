import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  PrivateMessage,
  MessageStatus,
} from '../entities/private-message.entity';
import { UserFollow } from '../entities/user-follow.entity';
import { CreateMessageDto } from '../dto/create-message.dto';
import { NotificationService } from '../../notifications/services/notification.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/dto/create-notification.dto';
import { v4 as uuidv4 } from 'uuid';

export interface ConversationSummary {
  conversationId: string;
  participantId: string;
  participantName: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @InjectRepository(PrivateMessage)
    private readonly messageRepository: Repository<PrivateMessage>,
    @InjectRepository(UserFollow)
    private readonly followRepository: Repository<UserFollow>,
    private readonly notificationService: NotificationService,
  ) {}

  async sendMessage(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<PrivateMessage> {
    const { recipientId, content, replyToId, attachments } = createMessageDto;

    // Generate or get conversation ID
    const conversationId = await this.getOrCreateConversationId(
      senderId,
      recipientId,
    );

    // Check if reply-to message exists and belongs to this conversation
    let replyToMessage = null;
    if (replyToId) {
      replyToMessage = await this.messageRepository.findOne({
        where: { id: replyToId, conversationId },
      });

      if (!replyToMessage) {
        throw new NotFoundException('返信先のメッセージが見つかりません');
      }
    }

    const message = this.messageRepository.create({
      conversationId,
      senderId,
      recipientId,
      content,
      attachments,
      replyToId: replyToMessage?.id,
      status: MessageStatus.SENT,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Send notification to recipient
    await this.notificationService.create({
      userId: recipientId,
      title: '新しいメッセージが届きました',
      message: `${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
      type: NotificationType.COMMUNITY,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      category: 'private_message',
      data: {
        messageId: savedMessage.id,
        conversationId: savedMessage.conversationId,
        senderId,
      },
      actionUrl: `/community/messages/${conversationId}`,
    });

    this.logger.log(
      `Message sent from user ${senderId} to user ${recipientId}`,
    );

    return savedMessage;
  }

  async getConversations(userId: string): Promise<ConversationSummary[]> {
    const conversations = await this.messageRepository
      .createQueryBuilder('message')
      .select([
        'message.conversationId',
        'CASE WHEN message.senderId = :userId THEN message.recipientId ELSE message.senderId END AS participantId',
        'message.content',
        'message.createdAt',
        'message.status',
      ])
      .where(
        '(message.senderId = :userId OR message.recipientId = :userId)',
        { userId },
      )
      .andWhere('message.deletedAt IS NULL')
      .orderBy('message.createdAt', 'DESC')
      .distinctOn(['message.conversationId'])
      .getRawMany();

    const summaries: ConversationSummary[] = [];

    for (const conv of conversations) {
      const unreadCount = await this.messageRepository.count({
        where: {
          conversationId: conv.conversationId,
          recipientId: userId,
          status: MessageStatus.SENT,
          deletedAt: IsNull(),
        },
      });

      summaries.push({
        conversationId: conv.conversationId,
        participantId: conv.participantId,
        participantName: 'Unknown', // Would need to join with User table
        lastMessage: conv.content,
        lastMessageAt: conv.createdAt,
        unreadCount,
      });
    }

    return summaries.sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
    );
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 50,
  ): Promise<{
    messages: PrivateMessage[];
    total: number;
    hasMore: boolean;
  }> {
    // Verify user is part of this conversation
    const userMessage = await this.messageRepository.findOne({
      where: {
        conversationId,
        deletedAt: IsNull(),
      },
      select: ['senderId', 'recipientId'],
    });

    if (
      !userMessage ||
      (userMessage.senderId !== userId && userMessage.recipientId !== userId)
    ) {
      throw new ForbiddenException(
        'この会話にアクセスする権限がありません',
      );
    }

    const [messages, total] = await this.messageRepository.findAndCount({
      where: {
        conversationId,
        deletedAt: IsNull(),
      },
      relations: ['sender', 'recipient', 'replyTo'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      messages: messages.reverse(), // Show oldest first
      total,
      hasMore: total > page * limit,
    };
  }

  async markMessageAsRead(
    messageId: string,
    userId: string,
  ): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, recipientId: userId },
    });

    if (!message) {
      throw new NotFoundException('メッセージが見つかりません');
    }

    if (message.status !== MessageStatus.READ) {
      await this.messageRepository.update(messageId, {
        status: MessageStatus.READ,
        readAt: new Date(),
      });

      this.logger.log(`Message ${messageId} marked as read by user ${userId}`);
    }
  }

  async markConversationAsRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.messageRepository.update(
      {
        conversationId,
        recipientId: userId,
        status: MessageStatus.SENT,
      },
      {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    );

    this.logger.log(
      `Conversation ${conversationId} marked as read by user ${userId}`,
    );
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('メッセージが見つかりません');
    }

    if (message.senderId !== userId && message.recipientId !== userId) {
      throw new ForbiddenException('このメッセージを削除する権限がありません');
    }

    // Soft delete
    await this.messageRepository.update(messageId, {
      deletedAt: new Date(),
      status:
        message.senderId === userId
          ? MessageStatus.DELETED_BY_SENDER
          : MessageStatus.DELETED_BY_RECIPIENT,
    });

    this.logger.log(`Message ${messageId} deleted by user ${userId}`);
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    return this.messageRepository.count({
      where: {
        recipientId: userId,
        status: MessageStatus.SENT,
        deletedAt: IsNull(),
      },
    });
  }

  async searchMessages(
    userId: string,
    query: string,
    limit = 20,
  ): Promise<PrivateMessage[]> {
    return this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .where(
        '(message.senderId = :userId OR message.recipientId = :userId)',
        { userId },
      )
      .andWhere('LOWER(message.content) LIKE :query', {
        query: `%${query.toLowerCase()}%`,
      })
      .andWhere('message.deletedAt IS NULL')
      .orderBy('message.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  private async getOrCreateConversationId(
    senderId: string,
    recipientId: string,
  ): Promise<string> {
    // Try to find existing conversation
    const existingMessage = await this.messageRepository.findOne({
      where: [
        { senderId, recipientId },
        { senderId: recipientId, recipientId: senderId },
      ],
      order: { createdAt: 'DESC' },
    });

    if (existingMessage) {
      return existingMessage.conversationId;
    }

    // Generate new conversation ID
    const conversationId = uuidv4();
    this.logger.log(
      `Created new conversation ${conversationId} between users ${senderId} and ${recipientId}`,
    );

    return conversationId;
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    // Implementation would require a user_blocks table
    // For now, we'll just log the action
    this.logger.log(`User ${blockerId} blocked user ${blockedId}`);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    // Implementation would require a user_blocks table
    // For now, we'll just log the action
    this.logger.log(`User ${blockerId} unblocked user ${blockedId}`);
  }
}