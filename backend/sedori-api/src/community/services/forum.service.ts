import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  ForumPost,
  PostCategory,
  PostStatus,
} from '../entities/forum-post.entity';
import { ForumReply } from '../entities/forum-reply.entity';
import {
  CreatePostDto,
  UpdatePostDto,
  CreateReplyDto,
} from '../dto/create-post.dto';
import { NotificationService } from '../../notifications/services/notification.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/dto/create-notification.dto';

export interface PostQueryParams {
  category?: PostCategory;
  status?: PostStatus;
  authorId?: string;
  tags?: string[];
  search?: string;
  sortBy?: 'created' | 'updated' | 'activity' | 'likes' | 'replies';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

@Injectable()
export class ForumService {
  private readonly logger = new Logger(ForumService.name);

  constructor(
    @InjectRepository(ForumPost)
    private readonly postRepository: Repository<ForumPost>,
    @InjectRepository(ForumReply)
    private readonly replyRepository: Repository<ForumReply>,
    private readonly notificationService: NotificationService,
  ) {}

  async createPost(
    userId: string,
    createPostDto: CreatePostDto,
  ): Promise<ForumPost> {
    const post = this.postRepository.create({
      ...createPostDto,
      authorId: userId,
      lastActivityAt: new Date(),
    });

    const savedPost = await this.postRepository.save(post);

    this.logger.log(`Created forum post ${savedPost.id} by user ${userId}`);

    // Send notification to followers if needed
    if (createPostDto.category === PostCategory.ANNOUNCEMENT) {
      await this.notifyFollowers(userId, savedPost);
    }

    return savedPost;
  }

  async updatePost(
    postId: string,
    userId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<ForumPost> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['author'],
    });

    if (!post) {
      throw new NotFoundException('投稿が見つかりません');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('この投稿を編集する権限がありません');
    }

    Object.assign(post, updatePostDto);
    post.updatedAt = new Date();

    return this.postRepository.save(post);
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('投稿が見つかりません');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('この投稿を削除する権限がありません');
    }

    await this.postRepository.remove(post);
    this.logger.log(`Deleted forum post ${postId} by user ${userId}`);
  }

  async getPost(postId: string): Promise<ForumPost> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['author', 'replies', 'replies.author'],
    });

    if (!post) {
      throw new NotFoundException('投稿が見つかりません');
    }

    // Increment view count
    await this.postRepository.increment({ id: postId }, 'viewCount', 1);

    return post;
  }

  async getPosts(params: PostQueryParams): Promise<{
    posts: ForumPost[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      category,
      status = PostStatus.ACTIVE,
      authorId,
      tags,
      search,
      sortBy = 'activity',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = params;

    let query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.status = :status', { status });

    if (category) {
      query = query.andWhere('post.category = :category', { category });
    }

    if (authorId) {
      query = query.andWhere('post.authorId = :authorId', { authorId });
    }

    if (tags && tags.length > 0) {
      query = query.andWhere('post.tags && :tags', { tags });
    }

    if (search) {
      query = query.andWhere(
        '(LOWER(post.title) LIKE :search OR LOWER(post.content) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    // Sorting
    switch (sortBy) {
      case 'created':
        query = query.orderBy('post.createdAt', sortOrder);
        break;
      case 'updated':
        query = query.orderBy('post.updatedAt', sortOrder);
        break;
      case 'activity':
        query = query.orderBy('post.lastActivityAt', sortOrder);
        break;
      case 'likes':
        query = query.orderBy('post.likeCount', sortOrder);
        break;
      case 'replies':
        query = query.orderBy('post.replyCount', sortOrder);
        break;
      default:
        query = query.orderBy('post.lastActivityAt', 'DESC');
    }

    // Pinned posts first
    query = query.addOrderBy('post.isPinned', 'DESC');

    const total = await query.getCount();
    const posts = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createReply(
    postId: string,
    userId: string,
    createReplyDto: CreateReplyDto,
  ): Promise<ForumReply> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['author'],
    });

    if (!post) {
      throw new NotFoundException('投稿が見つかりません');
    }

    if (post.status !== PostStatus.ACTIVE) {
      throw new BadRequestException('この投稿には返信できません');
    }

    let parentReply = null;
    if (createReplyDto.parentId) {
      parentReply = await this.replyRepository.findOne({
        where: { id: createReplyDto.parentId, postId },
      });

      if (!parentReply) {
        throw new NotFoundException('親の返信が見つかりません');
      }
    }

    const replyData: any = {
      ...createReplyDto,
      postId,
      authorId: userId,
    };

    if (parentReply) {
      replyData.parent = parentReply;
    }

    const reply = this.replyRepository.create(replyData);

    const savedReply = (await this.replyRepository.save(
      reply,
    )) as unknown as ForumReply;

    // Update post reply count and last activity
    await this.postRepository.update(postId, {
      replyCount: () => 'replyCount + 1',
      lastActivityAt: new Date(),
    });

    // Notify post author (if different from reply author)
    if (post.authorId !== userId) {
      await this.notificationService.create({
        userId: post.authorId,
        title: '投稿に返信がありました',
        message: `「${post.title}」に返信がありました`,
        type: NotificationType.COMMUNITY,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        category: 'forum_reply',
        data: {
          postId: post.id,
          replyId: savedReply.id,
        },
        actionUrl: `/community/posts/${post.id}`,
      });
    }

    // Notify parent reply author (if exists and different)
    if (
      parentReply &&
      parentReply.authorId !== userId &&
      parentReply.authorId !== post.authorId
    ) {
      await this.notificationService.create({
        userId: parentReply.authorId,
        title: '返信への返信がありました',
        message: `あなたの返信に返信がありました`,
        type: NotificationType.COMMUNITY,
        channels: [NotificationChannel.IN_APP],
        category: 'reply_to_reply',
        data: {
          postId: post.id,
          replyId: savedReply.id,
          parentReplyId: parentReply.id,
        },
        actionUrl: `/community/posts/${post.id}`,
      });
    }

    this.logger.log(
      `Created reply ${savedReply.id} for post ${postId} by user ${userId}`,
    );

    return savedReply;
  }

  async likePost(postId: string, userId: string): Promise<void> {
    const result = await this.postRepository.increment(
      { id: postId },
      'likeCount',
      1,
    );

    if (result.affected === 0) {
      throw new NotFoundException('投稿が見つかりません');
    }

    this.logger.log(`User ${userId} liked post ${postId}`);
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    const result = await this.postRepository.decrement(
      { id: postId },
      'likeCount',
      1,
    );

    if (result.affected === 0) {
      throw new NotFoundException('投稿が見つかりません');
    }

    this.logger.log(`User ${userId} unliked post ${postId}`);
  }

  async likeReply(replyId: string, userId: string): Promise<void> {
    const result = await this.replyRepository.increment(
      { id: replyId },
      'likeCount',
      1,
    );

    if (result.affected === 0) {
      throw new NotFoundException('返信が見つかりません');
    }
  }

  async markAsBestAnswer(
    postId: string,
    replyId: string,
    userId: string,
  ): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('投稿が見つかりません');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('ベストアンサーを選択する権限がありません');
    }

    if (post.category !== PostCategory.QUESTION) {
      throw new BadRequestException('質問投稿のみベストアンサーを選択できます');
    }

    const reply = await this.replyRepository.findOne({
      where: { id: replyId, postId },
      relations: ['author'],
    });

    if (!reply) {
      throw new NotFoundException('返信が見つかりません');
    }

    // Update previous best answer
    if (post.bestAnswerId) {
      await this.replyRepository.update(post.bestAnswerId, {
        isBestAnswer: false,
      });
    }

    // Set new best answer
    await this.replyRepository.update(replyId, { isBestAnswer: true });
    await this.postRepository.update(postId, {
      bestAnswerId: replyId,
      isSolved: true,
    });

    // Notify best answer author
    if (reply.authorId !== userId) {
      await this.notificationService.create({
        userId: reply.authorId,
        title: 'ベストアンサーに選ばれました',
        message: `「${post.title}」でベストアンサーに選ばれました！`,
        type: NotificationType.COMMUNITY,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        category: 'best_answer',
        data: {
          postId: post.id,
          replyId: reply.id,
        },
        actionUrl: `/community/posts/${post.id}`,
      });
    }
  }

  async searchPosts(
    query: string,
    filters?: Partial<PostQueryParams>,
  ): Promise<ForumPost[]> {
    const searchQuery = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.status = :status', { status: PostStatus.ACTIVE })
      .andWhere(
        '(LOWER(post.title) LIKE :query OR LOWER(post.content) LIKE :query OR post.tags && :tags)',
        {
          query: `%${query.toLowerCase()}%`,
          tags: [query.toLowerCase()],
        },
      );

    if (filters?.category) {
      searchQuery.andWhere('post.category = :category', {
        category: filters.category,
      });
    }

    return searchQuery
      .orderBy('post.lastActivityAt', 'DESC')
      .take(50)
      .getMany();
  }

  async getPopularTags(limit = 20): Promise<string[]> {
    const result = await this.postRepository
      .createQueryBuilder('post')
      .select('unnest(post.tags)', 'tag')
      .where('post.status = :status', { status: PostStatus.ACTIVE })
      .andWhere('post.tags IS NOT NULL')
      .groupBy('tag')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((row) => row.tag);
  }

  private async notifyFollowers(
    authorId: string,
    post: ForumPost,
  ): Promise<void> {
    // This would require user follow relationships
    // For now, we'll skip this implementation
    this.logger.log(
      `Would notify followers of user ${authorId} about new post ${post.id}`,
    );
  }
}
