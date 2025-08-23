import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('orders')
@Index('idx_orders_user', ['userId'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_payment_status', ['paymentStatus'])
@Index('idx_orders_order_date', ['orderDate'])
export class Order extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  orderNumber: string;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  totalAmount: number;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  orderDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'json', nullable: true })
  shippingAddress?: {
    fullName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };

  @Column({ type: 'json', nullable: true })
  billingAddress?: {
    fullName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentMethod?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentTransactionId?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}