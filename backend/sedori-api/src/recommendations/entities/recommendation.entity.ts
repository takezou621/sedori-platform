import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

export enum RecommendationType {
  AI_GENERATED = 'ai_generated',
  TRENDING = 'trending',
  SIMILAR_USERS = 'similar_users',
  PROFIT_POTENTIAL = 'profit_potential',
  SEASONAL = 'seasonal',
  CUSTOM = 'custom',
}

export enum RecommendationStatus {
  ACTIVE = 'active',
  VIEWED = 'viewed',
  CLICKED = 'clicked',
  PURCHASED = 'purchased',
  DISMISSED = 'dismissed',
  EXPIRED = 'expired',
}

@Entity('recommendations')
@Index('idx_recommendations_user', ['userId'])
@Index('idx_recommendations_product', ['productId'])
@Index('idx_recommendations_type', ['type'])
@Index('idx_recommendations_status', ['status'])
@Index('idx_recommendations_score', ['score'])
@Index('idx_recommendations_created', ['createdAt'])
export class Recommendation extends BaseEntity {
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
    enum: RecommendationType,
    default: RecommendationType.AI_GENERATED,
  })
  type: RecommendationType;

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    default: RecommendationStatus.ACTIVE,
  })
  status: RecommendationStatus;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: false })
  score: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason?: string;

  @Column({ type: 'timestamp', nullable: true })
  viewedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  purchasedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  dismissedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'int', default: 0 })
  impressionCount: number;

  @Column({ type: 'int', default: 0 })
  clickCount: number;

  @Column({ type: 'json', nullable: true })
  algorithmData?: {
    modelVersion?: string;
    features?: Record<string, number>;
    confidence?: number;
    relatedProducts?: string[];
    userSegment?: string;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
