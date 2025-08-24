import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FollowService } from '../services/follow.service';

@Controller('community/users')
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async followUser(
    @Param('id', ParseUUIDPipe) followingId: string,
    @Request() req: any,
  ) {
    await this.followService.followUser(req.user.id, followingId);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollowUser(
    @Param('id', ParseUUIDPipe) followingId: string,
    @Request() req: any,
  ) {
    await this.followService.unfollowUser(req.user.id, followingId);
  }

  @Get(':id/followers')
  async getFollowers(
    @Param('id', ParseUUIDPipe) userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page) : 1;
    const parsedLimit = limit ? parseInt(limit) : 20;

    return this.followService.getFollowers(userId, parsedPage, parsedLimit);
  }

  @Get(':id/following')
  async getFollowing(
    @Param('id', ParseUUIDPipe) userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page) : 1;
    const parsedLimit = limit ? parseInt(limit) : 20;

    return this.followService.getFollowing(userId, parsedPage, parsedLimit);
  }

  @Get(':id/profile')
  async getUserProfile(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Request() req: any,
  ) {
    return this.followService.getUserProfile(targetUserId, req.user.id);
  }

  @Get(':id/mutual-follows')
  async getMutualFollows(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Request() req: any,
  ) {
    return this.followService.getMutualFollows(req.user.id, targetUserId);
  }

  @Get(':id/follow-counts')
  async getFollowCounts(@Param('id', ParseUUIDPipe) userId: string) {
    return this.followService.getFollowCounts(userId);
  }

  @Get(':id/is-following')
  async isFollowing(
    @Param('id', ParseUUIDPipe) followingId: string,
    @Request() req: any,
  ) {
    const isFollowing = await this.followService.isFollowing(
      req.user.id,
      followingId,
    );
    return { isFollowing };
  }

  @Put(':id/notification-settings')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateNotificationSettings(
    @Param('id', ParseUUIDPipe) followingId: string,
    @Request() req: any,
    @Body('notificationsEnabled') notificationsEnabled: boolean,
  ) {
    await this.followService.updateNotificationSettings(
      req.user.id,
      followingId,
      notificationsEnabled,
    );
  }

  @Get('suggestions')
  async suggestUsersToFollow(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit) : 10;
    return this.followService.suggestUsersToFollow(req.user.id, parsedLimit);
  }
}