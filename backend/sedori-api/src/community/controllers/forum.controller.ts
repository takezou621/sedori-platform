import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ForumService, PostQueryParams } from '../services/forum.service';
import {
  CreatePostDto,
  UpdatePostDto,
  CreateReplyDto,
} from '../dto/create-post.dto';
import { PostCategory, PostStatus } from '../entities/forum-post.entity';

@Controller('community/forum')
@UseGuards(JwtAuthGuard)
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post('posts')
  async createPost(@Request() req: any, @Body() createPostDto: CreatePostDto) {
    return this.forumService.createPost(req.user.id, createPostDto);
  }

  @Put('posts/:id')
  async updatePost(
    @Param('id', ParseUUIDPipe) postId: string,
    @Request() req: any,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.forumService.updatePost(postId, req.user.id, updatePostDto);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @Param('id', ParseUUIDPipe) postId: string,
    @Request() req: any,
  ) {
    await this.forumService.deletePost(postId, req.user.id);
  }

  @Get('posts/:id')
  async getPost(@Param('id', ParseUUIDPipe) postId: string) {
    return this.forumService.getPost(postId);
  }

  @Get('posts')
  async getPosts(@Query() query: any) {
    const params: PostQueryParams = {
      category: query.category as PostCategory,
      status: query.status as PostStatus,
      authorId: query.authorId,
      tags: query.tags ? query.tags.split(',') : undefined,
      search: query.search,
      sortBy: query.sortBy || 'activity',
      sortOrder: query.sortOrder || 'DESC',
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    };

    return this.forumService.getPosts(params);
  }

  @Post('posts/:id/replies')
  async createReply(
    @Param('id', ParseUUIDPipe) postId: string,
    @Request() req: any,
    @Body() createReplyDto: CreateReplyDto,
  ) {
    return this.forumService.createReply(postId, req.user.id, createReplyDto);
  }

  @Post('posts/:id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async likePost(
    @Param('id', ParseUUIDPipe) postId: string,
    @Request() req: any,
  ) {
    await this.forumService.likePost(postId, req.user.id);
  }

  @Delete('posts/:id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlikePost(
    @Param('id', ParseUUIDPipe) postId: string,
    @Request() req: any,
  ) {
    await this.forumService.unlikePost(postId, req.user.id);
  }

  @Post('replies/:id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async likeReply(
    @Param('id', ParseUUIDPipe) replyId: string,
    @Request() req: any,
  ) {
    await this.forumService.likeReply(replyId, req.user.id);
  }

  @Post('posts/:postId/replies/:replyId/best-answer')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsBestAnswer(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @Request() req: any,
  ) {
    await this.forumService.markAsBestAnswer(postId, replyId, req.user.id);
  }

  @Get('search')
  async searchPosts(@Query('q') query: string, @Query() filters: any) {
    return this.forumService.searchPosts(query, filters);
  }

  @Get('tags/popular')
  async getPopularTags(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit) : 20;
    return this.forumService.getPopularTags(parsedLimit);
  }

  @Get('categories')
  async getCategories() {
    return Object.values(PostCategory).map((category) => ({
      value: category,
      label: this.getCategoryLabel(category),
    }));
  }

  private getCategoryLabel(category: PostCategory): string {
    const labels = {
      [PostCategory.GENERAL]: '一般',
      [PostCategory.QUESTION]: '質問',
      [PostCategory.DISCUSSION]: 'ディスカッション',
      [PostCategory.ANNOUNCEMENT]: 'お知らせ',
      [PostCategory.REVIEW]: 'レビュー',
      [PostCategory.TIP]: 'ヒント・コツ',
    };
    return labels[category] || category;
  }
}
