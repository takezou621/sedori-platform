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
  Tree,
  TreeParent,
  TreeChildren,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ForumPost } from './forum-post.entity';

@Entity('forum_replies')
@Tree('closure-table')
@Index(['postId', 'createdAt'])
@Index(['authorId', 'createdAt'])
export class ForumReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'uuid' })
  postId: string;

  @ManyToOne(() => ForumPost, (post) => post.replies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post: ForumPost;

  @Column({ type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @TreeParent()
  parent: ForumReply;

  @TreeChildren({ cascade: true })
  children: ForumReply[];

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  dislikeCount: number;

  @Column({ type: 'boolean', default: false })
  isBestAnswer: boolean;

  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @Column({ type: 'simple-array', nullable: true })
  attachments: string[];

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get hasAttachments(): boolean {
    return this.attachments && this.attachments.length > 0;
  }

  get netScore(): number {
    return this.likeCount - this.dislikeCount;
  }

  get hasChildren(): boolean {
    return this.children && this.children.length > 0;
  }
}