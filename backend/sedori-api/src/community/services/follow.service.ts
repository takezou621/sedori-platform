import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFollow } from '../entities/user-follow.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../notifications/services/notification.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/dto/create-notification.dto';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

@Injectable()
export class FollowService {
  private readonly logger = new Logger(FollowService.name);

  constructor(
    @InjectRepository(UserFollow)
    private readonly followRepository: Repository<UserFollow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new ConflictException('自分自身をフォローすることはできません');
    }

    // Check if already following
    const existingFollow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (existingFollow) {
      if (existingFollow.isActive) {
        throw new ConflictException('既にフォローしています');
      } else {
        // Reactivate follow
        existingFollow.isActive = true;
        await this.followRepository.save(existingFollow);
      }
    } else {
      // Create new follow relationship
      const follow = this.followRepository.create({
        followerId,
        followingId,
        isActive: true,
        notificationsEnabled: true,
      });

      await this.followRepository.save(follow);
    }

    // Get follower info for notification
    const follower = await this.userRepository.findOne({
      where: { id: followerId },
    });

    if (follower) {
      // Notify the followed user
      await this.notificationService.create({
        userId: followingId,
        title: '新しいフォロワー',
        message: `${follower.name || follower.email}さんがあなたをフォローしました`,
        type: NotificationType.COMMUNITY,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        category: 'new_follower',
        data: {
          followerId,
          followerUsername: follower.name,
        },
        actionUrl: `/community/users/${followerId}`,
      });
    }

    this.logger.log(`User ${followerId} started following user ${followingId}`);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId, isActive: true },
    });

    if (!follow) {
      throw new NotFoundException('フォロー関係が見つかりません');
    }

    follow.isActive = false;
    await this.followRepository.save(follow);

    this.logger.log(`User ${followerId} unfollowed user ${followingId}`);
  }

  async getFollowers(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    followers: UserProfile[];
    total: number;
    hasMore: boolean;
  }> {
    const [follows, total] = await this.followRepository.findAndCount({
      where: { followingId: userId, isActive: true },
      relations: ['follower'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const followers: UserProfile[] = [];

    for (const follow of follows) {
      const profile = await this.getUserProfile(follow.followerId, userId);
      if (profile) {
        followers.push(profile);
      }
    }

    return {
      followers,
      total,
      hasMore: total > page * limit,
    };
  }

  async getFollowing(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    following: UserProfile[];
    total: number;
    hasMore: boolean;
  }> {
    const [follows, total] = await this.followRepository.findAndCount({
      where: { followerId: userId, isActive: true },
      relations: ['following'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const following: UserProfile[] = [];

    for (const follow of follows) {
      const profile = await this.getUserProfile(follow.followingId, userId);
      if (profile) {
        following.push(profile);
      }
    }

    return {
      following,
      total,
      hasMore: total > page * limit,
    };
  }

  async isFollowing(
    followerId: string,
    followingId: string,
  ): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId, isActive: true },
    });

    return !!follow;
  }

  async getFollowCounts(userId: string): Promise<{
    followersCount: number;
    followingCount: number;
  }> {
    const [followersCount, followingCount] = await Promise.all([
      this.followRepository.count({
        where: { followingId: userId, isActive: true },
      }),
      this.followRepository.count({
        where: { followerId: userId, isActive: true },
      }),
    ]);

    return { followersCount, followingCount };
  }

  async getUserProfile(
    targetUserId: string,
    currentUserId?: string,
  ): Promise<UserProfile | null> {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!user) {
      return null;
    }

    const [followCounts, isFollowing, postsCount] = await Promise.all([
      this.getFollowCounts(targetUserId),
      currentUserId
        ? this.isFollowing(currentUserId, targetUserId)
        : false,
      this.getPostsCount(targetUserId),
    ]);

    return {
      id: user.id,
      username: user.name || '',
      displayName: user.name || user.email,
      email: user.email,
      isFollowing,
      followersCount: followCounts.followersCount,
      followingCount: followCounts.followingCount,
      postsCount,
    };
  }

  async getMutualFollows(
    userId: string,
    targetUserId: string,
  ): Promise<UserProfile[]> {
    const mutualFollowIds = await this.followRepository
      .createQueryBuilder('f1')
      .select('f1.followingId')
      .innerJoin(
        'user_follows',
        'f2',
        'f1.followingId = f2.followingId AND f2.followerId = :targetUserId',
        { targetUserId },
      )
      .where('f1.followerId = :userId', { userId })
      .andWhere('f1.isActive = true')
      .andWhere('f2.isActive = true')
      .getRawMany();

    const profiles: UserProfile[] = [];

    for (const { followingId } of mutualFollowIds) {
      const profile = await this.getUserProfile(followingId, userId);
      if (profile) {
        profiles.push(profile);
      }
    }

    return profiles;
  }

  async updateNotificationSettings(
    followerId: string,
    followingId: string,
    notificationsEnabled: boolean,
  ): Promise<void> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId, isActive: true },
    });

    if (!follow) {
      throw new NotFoundException('フォロー関係が見つかりません');
    }

    follow.notificationsEnabled = notificationsEnabled;
    await this.followRepository.save(follow);

    this.logger.log(
      `User ${followerId} ${
        notificationsEnabled ? 'enabled' : 'disabled'
      } notifications for user ${followingId}`,
    );
  }

  async suggestUsersToFollow(
    userId: string,
    limit = 10,
  ): Promise<UserProfile[]> {
    // Simple suggestion algorithm: users followed by people you follow
    const suggestedUserIds = await this.followRepository
      .createQueryBuilder('f1')
      .select('f2.followingId', 'suggestedId')
      .innerJoin(
        'user_follows',
        'f2',
        'f1.followingId = f2.followerId',
      )
      .leftJoin(
        'user_follows',
        'f3',
        'f2.followingId = f3.followingId AND f3.followerId = :userId',
        { userId },
      )
      .where('f1.followerId = :userId', { userId })
      .andWhere('f1.isActive = true')
      .andWhere('f2.isActive = true')
      .andWhere('f2.followingId != :userId')
      .andWhere('f3.id IS NULL') // Not already following
      .groupBy('f2.followingId')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();

    const suggestions: UserProfile[] = [];

    for (const { suggestedId } of suggestedUserIds) {
      const profile = await this.getUserProfile(suggestedId, userId);
      if (profile) {
        suggestions.push(profile);
      }
    }

    return suggestions;
  }

  private async getPostsCount(userId: string): Promise<number> {
    // This would require integration with ForumService
    // For now, return 0
    return 0;
  }
}