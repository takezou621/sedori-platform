import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

export enum AnalyticsEventType {
  PRODUCT_VIEW = 'product_view',
  PRODUCT_SEARCH = 'product_search',
  CART_ADD = 'cart_add',
  CART_REMOVE = 'cart_remove',
  ORDER_CREATE = 'order_create',
  ORDER_COMPLETE = 'order_complete',
  USER_LOGIN = 'user_login',
  USER_REGISTER = 'user_register',
  PAGE_VIEW = 'page_view',
}

@Entity('analytics_events')
@Index('idx_analytics_events_type', ['eventType'])
@Index('idx_analytics_events_user', ['userId'])
@Index('idx_analytics_events_product', ['productId'])
@Index('idx_analytics_events_timestamp', ['timestamp'])
export class AnalyticsEvent extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 30,
    nullable: false,
  })
  eventType: AnalyticsEventType;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sessionId?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  userAgent?: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  currentPage?: string;

  @Column({ type: 'json', nullable: true })
  properties?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}