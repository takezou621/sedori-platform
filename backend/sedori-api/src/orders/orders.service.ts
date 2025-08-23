import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart, CartStatus } from '../carts/entities/cart.entity';
import { CartsService } from '../carts/carts.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  PaginatedOrderResult,
  OrderResponseDto,
} from './dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly cartsService: CartsService,
  ) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    // Get user's active cart
    const cart = await this.cartsService.getCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('カートが空です');
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Calculate totals
    const subtotal = Number(cart.totalAmount);
    const taxAmount = subtotal * 0.1; // 10% tax
    const shippingAmount = subtotal >= 5000 ? 0 : 500; // Free shipping over 5000
    const totalAmount = subtotal + taxAmount + shippingAmount;

    // Create order
    const order = this.orderRepository.create({
      orderNumber,
      userId,
      status: OrderStatus.PENDING,
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount: 0,
      totalAmount,
      orderDate: new Date(),
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      shippingAddress: createOrderDto.shippingAddress,
      billingAddress: createOrderDto.billingAddress || createOrderDto.shippingAddress,
      paymentMethod: createOrderDto.paymentMethod,
      notes: createOrderDto.notes,
      metadata: createOrderDto.metadata,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create order items from cart items
    const orderItems = cart.items.map((cartItem) =>
      this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unitPrice,
        totalPrice: cartItem.totalPrice,
        productSnapshot: {
          name: cartItem.productSnapshot?.name || cartItem.product?.name || '',
          sku: cartItem.product?.sku,
          brand: cartItem.productSnapshot?.brand || cartItem.product?.brand,
          model: cartItem.product?.model,
          imageUrl: cartItem.productSnapshot?.imageUrl || cartItem.product?.primaryImageUrl,
          specifications: cartItem.product?.specifications,
        },
      }),
    );

    await this.orderItemRepository.save(orderItems);

    // Convert cart to order status
    await this.cartsService.convertCartToOrder(cart.id);

    return this.findById(savedOrder.id);
  }

  async findAll(queryDto: OrderQueryDto): Promise<PaginatedOrderResult> {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      startDate,
      endDate,
      search,
      sortBy = 'orderDate',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    // Include items relationship
    queryBuilder.leftJoinAndSelect('order.items', 'items');

    // Status filter
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // Payment status filter
    if (paymentStatus) {
      queryBuilder.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });
    }

    // Date range filter
    if (startDate) {
      queryBuilder.andWhere('order.orderDate >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.orderDate <= :endDate', { endDate });
    }

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(order.orderNumber ILIKE :search OR order.shippingAddress::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sorting
    queryBuilder.orderBy(`order.${sortBy}`, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(this.mapOrderToResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('注文が見つかりません');
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('注文が見つかりません');
    }

    return order;
  }

  async findByUserId(userId: string, queryDto: OrderQueryDto): Promise<PaginatedOrderResult> {
    const queryWithUser = { ...queryDto };
    const queryBuilder = this.orderRepository.createQueryBuilder('order');
    
    queryBuilder.where('order.userId = :userId', { userId });
    queryBuilder.leftJoinAndSelect('order.items', 'items');

    // Apply other filters from queryDto
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      startDate,
      endDate,
      search,
      sortBy = 'orderDate',
      sortOrder = 'DESC',
    } = queryDto;

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (paymentStatus) {
      queryBuilder.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });
    }

    if (startDate) {
      queryBuilder.andWhere('order.orderDate >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.orderDate <= :endDate', { endDate });
    }

    if (search) {
      queryBuilder.andWhere('order.orderNumber ILIKE :search', { search: `%${search}%` });
    }

    queryBuilder.orderBy(`order.${sortBy}`, sortOrder);

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(this.mapOrderToResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findById(id);

    // Update order fields
    Object.assign(order, updateOrderDto);

    // Handle status changes
    if (updateOrderDto.status === OrderStatus.DELIVERED && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    await this.orderRepository.save(order);

    return this.findById(id);
  }

  async cancel(id: string): Promise<Order> {
    const order = await this.findById(id);

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('配送済みの注文はキャンセルできません');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('この注文は既にキャンセル済みです');
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return order;
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get today's order count
    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const count = await this.orderRepository.count({
      where: {
        orderDate: {
          gte: todayStart,
          lt: todayEnd,
        } as any,
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `ORD${dateStr}${sequence}`;
  }

  private mapOrderToResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      shippingAmount: Number(order.shippingAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      orderDate: order.orderDate,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      deliveredAt: order.deliveredAt,
      shippingAddress: order.shippingAddress!,
      billingAddress: order.billingAddress,
      notes: order.notes,
      trackingNumber: order.trackingNumber,
      paymentMethod: order.paymentMethod,
      paymentTransactionId: order.paymentTransactionId,
      items: order.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        productSnapshot: item.productSnapshot,
      })) || [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}