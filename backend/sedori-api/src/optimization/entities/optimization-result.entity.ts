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

export enum OptimizationType {
  PRICE = 'price',
  INVENTORY = 'inventory',
  PROFIT = 'profit',
  MARKET_TIMING = 'market_timing',
}

export enum OptimizationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('optimization_results')
@Index('idx_optimization_user', ['userId'])
@Index('idx_optimization_product', ['productId'])
@Index('idx_optimization_type', ['type'])
@Index('idx_optimization_status', ['status'])
export class OptimizationResult extends BaseEntity {
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
    type: 'varchar',
    length: 50,
    enum: OptimizationType,
    nullable: false,
  })
  type: OptimizationType;

  @Column({
    type: 'varchar',
    length: 20,
    enum: OptimizationStatus,
    default: OptimizationStatus.PENDING,
  })
  status: OptimizationStatus;

  // Current metrics
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentProfit: number;

  @Column({ type: 'int', nullable: true })
  currentInventory: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  currentMarginPercentage: number;

  // Optimized recommendations
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  recommendedPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  projectedProfit: number;

  @Column({ type: 'int', nullable: true })
  recommendedInventory: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  projectedMarginPercentage: number;

  // Market analysis data
  @Column({ type: 'json', nullable: true })
  marketAnalysis?: {
    competitorPrices: { source: string; price: number; timestamp: Date }[];
    demandScore: number;
    seasonalityFactor: number;
    priceElasticity: number;
    marketTrend: 'rising' | 'falling' | 'stable';
  };

  // Optimization insights
  @Column({ type: 'json', nullable: true })
  optimizationInsights?: {
    reason: string;
    confidence: number; // 0-100
    potentialImpact: string;
    riskFactors: string[];
    timeToImplement: string;
    expectedROI: number;
  };

  // Performance tracking
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number;

  @Column({ type: 'timestamp', nullable: true })
  implementedAt?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualResult: number;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}