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
// import { User } from '../../auth/entities/user.entity';
import {
  NotificationType,
  NotificationChannel,
} from '../dto/create-notification.dto';

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['createdAt'])
@Index(['type'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  // @ManyToOne(() => User, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column('simple-array')
  channels: NotificationChannel[];

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'action_url', nullable: true })
  actionUrl?: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ name: 'failed_channels', type: 'simple-array', nullable: true })
  failedChannels?: NotificationChannel[];

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
