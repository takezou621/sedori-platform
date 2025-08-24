import {
  Controller,
  Get,
  Post,
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
import { MessagingService } from '../services/messaging.service';
import { CreateMessageDto } from '../dto/create-message.dto';

@Controller('community/messages')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  async sendMessage(
    @Request() req: any,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagingService.sendMessage(req.user.id, createMessageDto);
  }

  @Get('conversations')
  async getConversations(@Request() req: any) {
    return this.messagingService.getConversations(req.user.id);
  }

  @Get('conversations/:id/messages')
  async getConversationMessages(
    @Param('id') conversationId: string,
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page) : 1;
    const parsedLimit = limit ? parseInt(limit) : 50;

    return this.messagingService.getConversationMessages(
      conversationId,
      req.user.id,
      parsedPage,
      parsedLimit,
    );
  }

  @Post('conversations/:id/mark-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markConversationAsRead(
    @Param('id') conversationId: string,
    @Request() req: any,
  ) {
    await this.messagingService.markConversationAsRead(
      conversationId,
      req.user.id,
    );
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markMessageAsRead(
    @Param('id', ParseUUIDPipe) messageId: string,
    @Request() req: any,
  ) {
    await this.messagingService.markMessageAsRead(messageId, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @Param('id', ParseUUIDPipe) messageId: string,
    @Request() req: any,
  ) {
    await this.messagingService.deleteMessage(messageId, req.user.id);
  }

  @Get('unread/count')
  async getUnreadMessageCount(@Request() req: any) {
    const count = await this.messagingService.getUnreadMessageCount(
      req.user.id,
    );
    return { unreadCount: count };
  }

  @Get('search')
  async searchMessages(@Request() req: any, @Query('q') query: string) {
    return this.messagingService.searchMessages(req.user.id, query);
  }

  // User blocking endpoints
  @Post('users/:id/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async blockUser(
    @Param('id', ParseUUIDPipe) blockedId: string,
    @Request() req: any,
  ) {
    await this.messagingService.blockUser(req.user.id, blockedId);
  }

  @Delete('users/:id/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblockUser(
    @Param('id', ParseUUIDPipe) blockedId: string,
    @Request() req: any,
  ) {
    await this.messagingService.unblockUser(req.user.id, blockedId);
  }
}
