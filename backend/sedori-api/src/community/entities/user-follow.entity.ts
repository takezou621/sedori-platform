import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_follows')
@Unique(['followerId', 'followingId'])
@Index(['followerId', 'createdAt'])
@Index(['followingId', 'createdAt'])
export class UserFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  followerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followerId' })
  follower: User;

  @Column({ type: 'uuid' })
  followingId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followingId' })
  following: User;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  notificationsEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;
}
