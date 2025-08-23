import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Subscription } from './subscription.entity';

export enum UsageType {
  OPTIMIZATION_REQUEST = 'optimization_request',
  API_CALL = 'api_call',
  ADVANCED_ANALYTICS = 'advanced_analytics',
  AI_RECOMMENDATION = 'ai_recommendation',
  EXPORT_DATA = 'export_data',
}

@Entity('subscription_usages')
@Index('idx_usage_subscription', ['subscriptionId'])
@Index('idx_usage_user', ['userId'])
@Index('idx_usage_type', ['type'])
@Index('idx_usage_date', ['usageDate'])
export class SubscriptionUsage extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  subscriptionId: string;

  @ManyToOne(() => Subscription)
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'varchar',
    length: 50,
    enum: UsageType,
    nullable: false,
  })
  type: UsageType;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  usageDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resource?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string;
}