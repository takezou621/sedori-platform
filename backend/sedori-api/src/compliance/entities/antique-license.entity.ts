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

export enum LicenseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum AntiqueDealerCategory {
  BOOKS = 'books',
  PAINTINGS = 'paintings',
  METAL_PRODUCTS = 'metal_products',
  JEWELRY = 'jewelry',
  CLOTHING = 'clothing',
  MACHINERY = 'machinery',
  ELECTRONICS = 'electronics',
  PHOTOGRAPHS = 'photographs',
  LEATHER_GOODS = 'leather_goods',
  ALL_CATEGORIES = 'all_categories',
}

@Entity('antique_licenses')
@Index(['userId'])
@Index(['licenseNumber'])
@Index(['expiresAt'])
export class AntiqueLicense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'license_number', unique: true })
  licenseNumber: string;

  @Column({
    type: 'enum',
    enum: LicenseStatus,
    default: LicenseStatus.ACTIVE,
  })
  status: LicenseStatus;

  @Column({ name: 'issued_at', type: 'date' })
  issuedAt: Date;

  @Column({ name: 'expires_at', type: 'date' })
  expiresAt: Date;

  @Column({ name: 'issuing_authority' })
  issuingAuthority: string;

  @Column({ name: 'business_name' })
  businessName: string;

  @Column({ name: 'business_address' })
  businessAddress: string;

  @Column({ name: 'representative_name' })
  representativeName: string;

  @Column('simple-array')
  categories: AntiqueDealerCategory[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'notification_sent', default: false })
  notificationSent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  get isExpiringSoon(): boolean {
    const now = new Date();
    const expiryDate = new Date(this.expiresAt);
    const daysDiff = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysDiff <= 30; // 30 days before expiry
  }

  get isExpired(): boolean {
    return new Date() > new Date(this.expiresAt);
  }

  get daysUntilExpiry(): number {
    const now = new Date();
    const expiryDate = new Date(this.expiresAt);
    return Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}
