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
import { User } from '../../users/entities/user.entity';

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  DELETED_BY_SENDER = 'deleted_by_sender',
  DELETED_BY_RECIPIENT = 'deleted_by_recipient',
}

@Entity('private_messages')
@Index(['senderId', 'recipientId', 'createdAt'])
@Index(['conversationId', 'createdAt'])
export class PrivateMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'uuid' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'simple-array', nullable: true })
  attachments: string[];

  @Column({ type: 'uuid', nullable: true })
  replyToId: string;

  @ManyToOne(() => PrivateMessage, { nullable: true })
  @JoinColumn({ name: 'replyToId' })
  replyTo: PrivateMessage;

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  // Computed properties
  get isRead(): boolean {
    return this.status === MessageStatus.READ;
  }

  get hasAttachments(): boolean {
    return this.attachments && this.attachments.length > 0;
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}