import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BetaInviteStatus {
  PENDING = 'pending',
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

@Entity('beta_invites')
export class BetaInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  company: string;

  @Column('text', { nullable: true })
  businessType: string;

  @Column('text', { nullable: true })
  currentTools: string;

  @Column('text', { nullable: true })
  expectations: string;

  @Column({
    type: 'enum',
    enum: BetaInviteStatus,
    default: BetaInviteStatus.PENDING,
  })
  status: BetaInviteStatus;

  @Column({ nullable: true })
  inviteToken: string;

  @Column({ type: 'timestamp', nullable: true })
  invitedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}