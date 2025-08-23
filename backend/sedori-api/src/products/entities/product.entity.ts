import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Category } from '../../categories/entities/category.entity';

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

export enum ProductCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  VERY_GOOD = 'very_good',
  GOOD = 'good',
  ACCEPTABLE = 'acceptable',
  POOR = 'poor',
}

@Entity('products')
@Index('idx_products_name', ['name'])
@Index('idx_products_sku', ['sku'])
@Index('idx_products_category', ['categoryId'])
@Index('idx_products_status', ['status'])
@Index('idx_products_supplier', ['supplier'])
@Index('idx_products_price', ['wholesalePrice'])
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  sku?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  brand?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model?: string;

  @Column({ type: 'uuid', nullable: false })
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  wholesalePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  retailPrice?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  marketPrice?: number;

  @Column({ type: 'varchar', length: 3, default: 'JPY' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ProductCondition.NEW,
  })
  condition: ProductCondition;

  @Column({
    type: 'varchar',
    length: 20,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @Column({ type: 'varchar', length: 200, nullable: false })
  supplier: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  supplierUrl?: string;

  @Column({ type: 'int', nullable: true })
  stockQuantity?: number;

  @Column({ type: 'int', nullable: true })
  minOrderQuantity?: number;

  @Column({ type: 'int', nullable: true })
  maxOrderQuantity?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight?: number;

  @Column({ type: 'varchar', length: 10, default: 'kg' })
  weightUnit: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dimensions?: string;

  @Column({ type: 'json', nullable: true })
  images?: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  primaryImageUrl?: string;

  @Column({ type: 'json', nullable: true })
  specifications?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdatedAt?: Date;

  @Column({ type: 'json', nullable: true })
  marketData?: {
    amazonPrice?: number;
    rakutenPrice?: number;
    yahooPrice?: number;
    mercariPrice?: number;
    averageSellingPrice?: number;
    competitorCount?: number;
    demandScore?: number;
    trendScore?: number;
    lastScrapedAt?: Date;
  };

  @Column({ type: 'json', nullable: true })
  profitabilityData?: {
    estimatedProfit?: number;
    profitMargin?: number;
    roi?: number;
    breakEvenDays?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    calculatedAt?: Date;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
