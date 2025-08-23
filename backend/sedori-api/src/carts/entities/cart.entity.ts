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
import { CartItem } from './cart-item.entity';

export enum CartStatus {
  ACTIVE = 'active',
  ABANDONED = 'abandoned',
  CONVERTED = 'converted',
}

@Entity('carts')
@Index('idx_carts_user', ['userId'])
@Index('idx_carts_status', ['status'])
export class Cart extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, {
    cascade: true,
    eager: true,
  })
  items: CartItem[];

  @Column({
    type: 'varchar',
    length: 20,
    default: CartStatus.ACTIVE,
  })
  status: CartStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'int', default: 0 })
  totalItems: number;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}