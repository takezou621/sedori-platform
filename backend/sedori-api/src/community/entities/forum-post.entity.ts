import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ForumReply } from './forum-reply.entity';

export enum PostCategory {
  GENERAL = 'general',
  QUESTION = 'question',
  DISCUSSION = 'discussion',
  ANNOUNCEMENT = 'announcement',
  REVIEW = 'review',
  TIP = 'tip',
}

export enum PostStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  PINNED = 'pinned',
  ARCHIVED = 'archived',
}

@Entity('forum_posts')
@Index(['category', 'status', 'createdAt'])
@Index(['authorId', 'createdAt'])
export class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: PostCategory,
    default: PostCategory.GENERAL,
  })
  category: PostCategory;

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.ACTIVE,
  })
  status: PostStatus;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @OneToMany(() => ForumReply, (reply) => reply.post, {
    cascade: true,
    eager: false,
  })
  replies: ForumReply[];

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  replyCount: number;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: false })
  isSolved: boolean;

  @Column({ type: 'uuid', nullable: true })
  bestAnswerId: string;

  @Column({ type: 'simple-array', nullable: true })
  attachments: string[];

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  // Computed properties
  get isQuestion(): boolean {
    return this.category === PostCategory.QUESTION;
  }

  get hasAttachments(): boolean {
    return this.attachments && this.attachments.length > 0;
  }

  get isActive(): boolean {
    return this.status === PostStatus.ACTIVE;
  }
}