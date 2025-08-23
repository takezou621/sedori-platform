import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { RegulationRule } from './regulation-rule.entity';

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  REQUIRES_REVIEW = 'requires_review',
  PENDING = 'pending',
  NEEDS_LICENSE = 'needs_license',
  PROHIBITED = 'prohibited',
}

export enum CheckType {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
}

@Entity('compliance_checks')
@Index(['productId'])
@Index(['status'])
@Index(['checkType'])
@Index(['performedAt'])
export class ComplianceCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ComplianceStatus,
  })
  status: ComplianceStatus;

  @Column({
    type: 'enum',
    enum: CheckType,
    default: CheckType.AUTOMATIC,
  })
  checkType: CheckType;

  @Column({
    name: 'overall_risk_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
  })
  overallRiskScore: number;

  @Column({ type: 'jsonb' })
  ruleResults: Array<{
    ruleId: string;
    ruleType: string;
    ruleTitle: string;
    matched: boolean;
    riskLevel: string;
    details: string;
    requiredActions?: string[];
    warnings?: string[];
  }>;

  @Column({ type: 'jsonb', nullable: true })
  requiredLicenses: Array<{
    type: string;
    name: string;
    required: boolean;
    possessed: boolean;
    expiresAt?: string;
    authority: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  requiredDocuments: Array<{
    type: string;
    name: string;
    required: boolean;
    uploaded: boolean;
    expiresAt?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  prohibitedReasons: Array<{
    rule: string;
    reason: string;
    legalBasis: string;
    penalty?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  recommendations: Array<{
    type: 'action' | 'warning' | 'info';
    message: string;
    priority: 'high' | 'medium' | 'low';
    actionRequired: boolean;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  complianceActions: Array<{
    action: string;
    completed: boolean;
    dueDate?: string;
    completedAt?: string;
    notes?: string;
  }>;

  @Column({ name: 'performed_at', type: 'timestamp' })
  performedAt: Date;

  @Column({ name: 'performed_by', nullable: true })
  performedBy?: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'next_check_at', type: 'timestamp', nullable: true })
  nextCheckAt?: Date;

  @Column('text', { nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  get isCompliant(): boolean {
    return this.status === ComplianceStatus.COMPLIANT;
  }

  get isProhibited(): boolean {
    return this.status === ComplianceStatus.PROHIBITED;
  }

  get requiresAction(): boolean {
    return [
      ComplianceStatus.NON_COMPLIANT,
      ComplianceStatus.REQUIRES_REVIEW,
      ComplianceStatus.NEEDS_LICENSE,
    ].includes(this.status);
  }

  get hasHighRisk(): boolean {
    return this.overallRiskScore >= 0.7;
  }

  get hasMediumRisk(): boolean {
    return this.overallRiskScore >= 0.4 && this.overallRiskScore < 0.7;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > new Date(this.expiresAt) : false;
  }

  get needsRecheck(): boolean {
    return this.nextCheckAt ? new Date() >= new Date(this.nextCheckAt) : false;
  }

  get highPriorityRecommendations(): Array<any> {
    return this.recommendations?.filter((rec) => rec.priority === 'high') || [];
  }

  get pendingActions(): Array<any> {
    return this.complianceActions?.filter((action) => !action.completed) || [];
  }
}
