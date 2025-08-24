import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum NotificationType {
  PRICE_ALERT = 'price_alert',
  STOCK_UPDATE = 'stock_update',
  ORDER_STATUS = 'order_status',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
  COMMUNITY = 'community',
}

export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export class NotificationDataDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  followerId?: string;

  @IsOptional()
  @IsString()
  followerUsername?: string;

  @IsOptional()
  @IsString()
  postId?: string;

  @IsOptional()
  @IsString()
  replyId?: string;

  @IsOptional()
  @IsString()
  parentReplyId?: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  senderId?: string;

  @IsOptional()
  @IsString()
  licenseId?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  totalProducts?: number;

  @IsOptional()
  prohibited?: number;

  @IsOptional()
  nonCompliant?: number;

  @IsOptional()
  needsReview?: number;

  @IsOptional()
  needsLicense?: number;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  weekOf?: string;

  @IsOptional()
  @IsString()
  updateTitle?: string;

  @IsOptional()
  @IsString()
  updateDescription?: string;

  @IsOptional()
  @IsString()
  effectiveDate?: string;

  @IsOptional()
  affectedCategories?: string[];

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  daysUntilExpiry?: number;

  @IsOptional()
  isExpired?: boolean;

  @IsOptional()
  @IsString()
  urgency?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationDataDto)
  data?: NotificationDataDto;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
