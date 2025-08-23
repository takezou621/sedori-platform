import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RegulationType {
  ANTIQUE_DEALER = 'antique_dealer',
  IMPORT_RESTRICTION = 'import_restriction',
  EXPORT_RESTRICTION = 'export_restriction',
  SAFETY_STANDARD = 'safety_standard',
  CUSTOMS = 'customs',
  TAX = 'tax',
  PHARMACEUTICAL = 'pharmaceutical',
  FOOD_SAFETY = 'food_safety',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  PROHIBITED = 'prohibited',
}

export enum RuleStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  PENDING = 'pending',
}

@Entity('regulation_rules')
@Index(['type'])
@Index(['category'])
@Index(['status'])
@Index(['effectiveFrom'])
export class RegulationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RegulationType,
  })
  type: RegulationType;

  @Column()
  category: string;

  @Column()
  subcategory: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('text')
  requirements: string;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.LOW,
  })
  riskLevel: RiskLevel;

  @Column({
    type: 'enum',
    enum: RuleStatus,
    default: RuleStatus.ACTIVE,
  })
  status: RuleStatus;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: Date;

  @Column({ name: 'effective_until', type: 'date', nullable: true })
  effectiveUntil?: Date;

  @Column({ name: 'legal_basis' })
  legalBasis: string;

  @Column({ name: 'authority' })
  authority: string;

  @Column('simple-array')
  keywords: string[];

  @Column('simple-array')
  prohibitedItems: string[];

  @Column('simple-array')
  restrictedItems: string[];

  @Column('simple-array')
  requiredDocuments: string[];

  @Column('simple-array')
  requiredLicenses: string[];

  @Column({ type: 'jsonb', nullable: true })
  penalties: {
    fine?: {
      min: number;
      max: number;
      currency: string;
    };
    imprisonment?: {
      min: number;
      max: number;
      unit: string;
    };
    other?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  exemptions: {
    conditions: string[];
    requirements: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  procedures: {
    steps: string[];
    timeline: string;
    fees: Array<{
      type: string;
      amount: number;
      currency: string;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  references: {
    lawNumber?: string;
    articleNumber?: string;
    url?: string;
    lastUpdated?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  get isActive(): boolean {
    const now = new Date();
    const effectiveFrom = new Date(this.effectiveFrom);
    const effectiveUntil = this.effectiveUntil
      ? new Date(this.effectiveUntil)
      : null;

    return (
      this.status === RuleStatus.ACTIVE &&
      now >= effectiveFrom &&
      (effectiveUntil === null || now <= effectiveUntil)
    );
  }

  get isProhibitive(): boolean {
    return this.riskLevel === RiskLevel.PROHIBITED;
  }

  get requiresLicense(): boolean {
    return this.requiredLicenses && this.requiredLicenses.length > 0;
  }

  matchesKeywords(searchTerms: string[]): boolean {
    const allTerms = [
      ...this.keywords,
      this.title.toLowerCase(),
      this.description.toLowerCase(),
    ];
    return searchTerms.some((term) =>
      allTerms.some((keyword) =>
        keyword.toLowerCase().includes(term.toLowerCase()),
      ),
    );
  }
}
