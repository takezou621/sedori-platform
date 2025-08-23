import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

export enum SaleStatus {
  PLANNED = 'planned',
  PURCHASED = 'purchased',
  LISTED = 'listed',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

export enum SaleChannel {
  AMAZON = 'amazon',
  RAKUTEN = 'rakuten',
  YAHOO = 'yahoo',
  MERCARI = 'mercari',
  EBAY = 'ebay',
  SHOPIFY = 'shopify',
  OTHER = 'other',
}

@Entity('sales')
@Index('idx_sales_user', ['userId'])
@Index('idx_sales_product', ['productId'])
@Index('idx_sales_status', ['status'])
@Index('idx_sales_channel', ['saleChannel'])
@Index('idx_sales_date', ['saleDate'])
@Index('idx_sales_profit', ['profit'])
export class Sale extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: false })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({
    type: 'enum',
    enum: SaleStatus,
    default: SaleStatus.PLANNED,
  })
  status: SaleStatus;

  @Column({
    type: 'enum',
    enum: SaleChannel,
    nullable: true,
  })
  saleChannel?: SaleChannel;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  // 購入情報
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  purchasePrice: number;

  @Column({ type: 'timestamp', nullable: true })
  purchaseDate?: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  purchaseLocation?: string;

  // 販売情報
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salePrice?: number;

  @Column({ type: 'timestamp', nullable: true })
  saleDate?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  saleUrl?: string;

  // 手数料・送料
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  otherFees: number;

  // 利益計算
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  profit?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  profitMargin?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  roi?: number;

  // 期間（売上までの日数）
  @Column({ type: 'int', nullable: true })
  daysToSell?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
