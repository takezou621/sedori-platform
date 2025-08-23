import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  OrderResponseDto,
  PaginatedOrderResult,
} from './dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: '注文作成' })
  @ApiResponse({
    status: 201,
    description: '注文が作成されました',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'カートが空です' })
  async createOrder(
    @Request() req: any,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const userId = req.user.id;
    const order = await this.ordersService.createOrder(userId, createOrderDto);
    return this.ordersService['mapOrderToResponse'](order);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '全注文一覧取得（管理者のみ）' })
  @ApiResponse({
    status: 200,
    description: '注文一覧を返します',
  })
  async findAll(@Query() queryDto: OrderQueryDto): Promise<PaginatedOrderResult> {
    return this.ordersService.findAll(queryDto);
  }

  @Get('my-orders')
  @ApiOperation({ summary: '自分の注文一覧取得' })
  @ApiResponse({
    status: 200,
    description: '自分の注文一覧を返します',
  })
  async getMyOrders(
    @Request() req: any,
    @Query() queryDto: OrderQueryDto,
  ): Promise<PaginatedOrderResult> {
    const userId = req.user.id;
    return this.ordersService.findByUserId(userId, queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '注文詳細取得' })
  @ApiParam({ name: 'id', description: '注文ID' })
  @ApiResponse({
    status: 200,
    description: '注文詳細を返します',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: '注文が見つかりません' })
  async findOne(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.findById(id);
    
    // Check if user owns this order or is admin
    if (order.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
      throw new Error('この注文にアクセスする権限がありません');
    }

    return this.ordersService['mapOrderToResponse'](order);
  }

  @Get('order-number/:orderNumber')
  @ApiOperation({ summary: '注文番号で注文詳細取得' })
  @ApiParam({ name: 'orderNumber', description: '注文番号' })
  @ApiResponse({
    status: 200,
    description: '注文詳細を返します',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: '注文が見つかりません' })
  async findByOrderNumber(
    @Request() req: any,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.findByOrderNumber(orderNumber);
    
    // Check if user owns this order or is admin
    if (order.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
      throw new Error('この注文にアクセスする権限がありません');
    }

    return this.ordersService['mapOrderToResponse'](order);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '注文更新（管理者のみ）' })
  @ApiParam({ name: 'id', description: '注文ID' })
  @ApiResponse({
    status: 200,
    description: '注文が更新されました',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: '注文が見つかりません' })
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.update(id, updateOrderDto);
    return this.ordersService['mapOrderToResponse'](order);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: '注文キャンセル' })
  @ApiParam({ name: 'id', description: '注文ID' })
  @ApiResponse({
    status: 200,
    description: '注文がキャンセルされました',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'キャンセルできません' })
  @ApiResponse({ status: 404, description: '注文が見つかりません' })
  async cancel(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.findById(id);
    
    // Check if user owns this order or is admin
    if (order.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
      throw new Error('この注文にアクセスする権限がありません');
    }

    const cancelledOrder = await this.ordersService.cancel(id);
    return this.ordersService['mapOrderToResponse'](cancelledOrder);
  }
}