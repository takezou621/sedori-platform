import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { SubscriptionUsage } from './subscription-usage.entity';

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
}

@Entity('subscriptions')
@Index('idx_subscriptions_user', ['userId'])
@Index('idx_subscriptions_plan', ['plan'])
@Index('idx_subscriptions_status', ['status'])
export class Subscription extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => SubscriptionUsage, (usage) => usage.subscription)
  usages: SubscriptionUsage[];

  @Column({
    type: 'varchar',
    length: 20,
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  plan: SubscriptionPlan;

  @Column({
    type: 'varchar',
    length: 20,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({
    type: 'varchar',
    length: 20,
    enum: BillingCycle,
    default: BillingCycle.MONTHLY,
  })
  billingCycle: BillingCycle;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  yearlyPrice: number;

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  trialEndDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextBillingDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancellationReason?: string;

  // Usage limits
  @Column({ type: 'int', default: -1 }) // -1 = unlimited
  maxOptimizations: number;

  @Column({ type: 'int', default: -1 })
  maxProducts: number;

  @Column({ type: 'int', default: -1 })
  maxApiCalls: number;

  @Column({ type: 'boolean', default: false })
  hasAdvancedAnalytics: boolean;

  @Column({ type: 'boolean', default: false })
  hasAIRecommendations: boolean;

  @Column({ type: 'boolean', default: false })
  hasPrioritySupport: boolean;

  @Column({ type: 'boolean', default: false })
  hasWhiteLabel: boolean;

  // Payment integration
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeSubscriptionId?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // Current period usage tracking
  @Column({ type: 'int', default: 0 })
  currentOptimizations: number;

  @Column({ type: 'int', default: 0 })
  currentApiCalls: number;

  @Column({ type: 'timestamp', nullable: true })
  usageResetDate?: Date;
}
