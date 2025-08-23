import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationService } from '../services/notification.service';
import { PushNotificationService } from '../services/push-notification.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'isRead',
    required: false,
    type: Boolean,
    description: 'Filter by read status',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async findAll(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('isRead') isRead?: string,
  ) {
    const userId = req.user.sub;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 20;
    const isReadBoolean = isRead !== undefined ? isRead === 'true' : undefined;

    return this.notificationService.findAll(
      userId,
      pageNumber,
      limitNumber,
      isReadBoolean,
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.sub;
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification found' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(@Param('id') id: string) {
    return this.notificationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specific notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.notificationService.remove(id);
  }

  @Patch(':id/mark-read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Post('mark-all-read')
  @ApiOperation({
    summary: 'Mark all notifications as read for the current user',
  })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.sub;
    await this.notificationService.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry sending a failed notification' })
  @ApiResponse({ status: 200, description: 'Notification retry initiated' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 400, description: 'No failed channels to retry' })
  async retryNotification(@Param('id') id: string) {
    return this.notificationService.retryFailedNotification(id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create bulk notifications for multiple users' })
  @ApiResponse({
    status: 201,
    description: 'Bulk notifications created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createBulk(
    @Body()
    bulkData: {
      userIds: string[];
      notification: Omit<CreateNotificationDto, 'userId'>;
    },
  ) {
    return this.notificationService.createBulkNotifications(
      bulkData.userIds,
      bulkData.notification,
    );
  }

  // Push Notification Endpoints

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiResponse({
    status: 201,
    description: 'Push subscription created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid subscription data' })
  async subscribeToPush(
    @Req() req: any,
    @Body()
    subscriptionData: {
      subscription: {
        endpoint: string;
        keys: {
          p256dh: string;
          auth: string;
        };
      };
      deviceInfo?: {
        userAgent: string;
        platform: string;
        deviceName?: string;
      };
    },
  ) {
    const userId = req.user.sub;
    await this.pushNotificationService.subscribeToPush(
      userId,
      subscriptionData.subscription,
      subscriptionData.deviceInfo,
    );
    return { message: 'Push subscription created successfully' };
  }

  @Delete('push/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiResponse({
    status: 200,
    description: 'Push subscription removed successfully',
  })
  @HttpCode(HttpStatus.OK)
  async unsubscribeFromPush(
    @Req() req: any,
    @Body() data: { endpoint: string },
  ) {
    const userId = req.user.sub;
    await this.pushNotificationService.unsubscribeFromPush(
      userId,
      data.endpoint,
    );
    return { message: 'Push subscription removed successfully' };
  }

  @Get('push/vapid-key')
  @ApiOperation({ summary: 'Get VAPID public key for push notifications' })
  @ApiResponse({
    status: 200,
    description: 'VAPID public key retrieved successfully',
  })
  async getVapidKey() {
    const publicKey = this.pushNotificationService.getVapidPublicKey();
    return { publicKey };
  }

  @Post('push/test')
  @ApiOperation({
    summary: 'Send a test push notification to the current user',
  })
  @ApiResponse({ status: 200, description: 'Test push notification sent' })
  @ApiResponse({
    status: 400,
    description: 'Push notifications not available or no subscriptions',
  })
  async sendTestPush(@Req() req: any) {
    const userId = req.user.sub;
    await this.pushNotificationService.testPushNotification(userId);
    return { message: 'Test push notification sent' };
  }

  @Get('push/status')
  @ApiOperation({ summary: 'Get push notification service status' })
  @ApiResponse({
    status: 200,
    description: 'Push notification status retrieved',
  })
  async getPushStatus() {
    return {
      enabled: this.pushNotificationService.isServiceEnabled(),
      vapidConfigured: !!this.pushNotificationService.getVapidPublicKey(),
    };
  }
}
