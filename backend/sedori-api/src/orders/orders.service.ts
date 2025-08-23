import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
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

  async createOrder(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    // Use transaction to ensure atomicity
    return await this.orderRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Get user's active cart
        const cart = await this.cartsService.getCart(userId);

        if (!cart.items || cart.items.length === 0) {
          throw new BadRequestException('カートが空です');
        }

        // Validate shipping address
        this.validateShippingAddress(createOrderDto.shippingAddress);

        // Generate order number (with potential retry logic)
        const orderNumber = await this.generateOrderNumberWithRetry(
          transactionalEntityManager,
        );

        // Calculate totals with validation
        const subtotal = Number(cart.totalAmount);
        if (subtotal <= 0) {
          throw new BadRequestException('注文金額が正しくありません');
        }

        const taxAmount = Math.round(subtotal * 0.1 * 100) / 100; // 10% tax, rounded
        const shippingAmount = subtotal >= 5000 ? 0 : 500; // Free shipping over 5000
        const totalAmount =
          Math.round((subtotal + taxAmount + shippingAmount) * 100) / 100; // Round to avoid floating point errors

        // Create order within transaction
        const order = transactionalEntityManager.create(Order, {
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
          billingAddress:
            createOrderDto.billingAddress || createOrderDto.shippingAddress,
          paymentMethod: createOrderDto.paymentMethod || 'pending',
          notes: createOrderDto.notes,
          metadata: createOrderDto.metadata,
        });

        const savedOrder = await transactionalEntityManager.save(Order, order);

        // Create order items from cart items
        const orderItems = cart.items.map((cartItem) => {
          // Validate cart item
          if (!cartItem.product) {
            console.error(`Cart item validation failed:`, {
              cartItemId: cartItem.id,
              productId: cartItem.productId,
              cartId: cart.id,
              userId: userId,
              hasProduct: !!cartItem.product,
            });
            throw new BadRequestException(
              `商品ID ${cartItem.productId} が見つかりません`,
            );
          }

          return transactionalEntityManager.create(OrderItem, {
            orderId: savedOrder.id,
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            unitPrice: cartItem.unitPrice,
            totalPrice: cartItem.totalPrice,
            productSnapshot: {
              name:
                cartItem.productSnapshot?.name || cartItem.product?.name || '',
              sku: cartItem.product?.sku,
              brand: cartItem.productSnapshot?.brand || cartItem.product?.brand,
              model: cartItem.product?.model,
              imageUrl:
                cartItem.productSnapshot?.imageUrl ||
                cartItem.product?.primaryImageUrl,
              specifications: cartItem.product?.specifications,
            },
          });
        });

        const savedOrderItems = await transactionalEntityManager.save(
          OrderItem,
          orderItems,
        );

        // Convert cart to order status
        await this.cartsService.convertCartToOrder(cart.id);

        // Return order with items loaded directly from transaction data
        savedOrder.items = savedOrderItems;
        return savedOrder;
      },
    );
  }

  private validateShippingAddress(address: any): void {
    const required = [
      'fullName',
      'address1',
      'city',
      'state',
      'postalCode',
      'country',
    ];
    for (const field of required) {
      if (!address[field] || address[field].trim() === '') {
        throw new BadRequestException(`配送先の${field}は必須です`);
      }
    }

    // Validate postal code format (basic validation for Japan)
    if (address.country === 'Japan' && address.postalCode) {
      const japanesePostalCode = /^\d{3}-\d{4}$|^\d{7}$/;
      if (!japanesePostalCode.test(address.postalCode)) {
        throw new BadRequestException('郵便番号の形式が正しくありません');
      }
    }
  }

  private async generateOrderNumberWithRetry(
    transactionalEntityManager: any,
    maxRetries: number = 3,
  ): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

        // Get today's order count within transaction
        const todayStart = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        );
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        const count = await transactionalEntityManager
          .createQueryBuilder(Order, 'order')
          .where('order.orderDate >= :todayStart', {
            todayStart: todayStart.toISOString(),
          })
          .andWhere('order.orderDate < :todayEnd', {
            todayEnd: todayEnd.toISOString(),
          })
          .getCount();

        const sequence = String(count + 1 + attempt).padStart(4, '0'); // Add attempt to avoid collisions
        const orderNumber = `ORD${dateStr}${sequence}`;

        // Check if order number already exists
        const existing = await transactionalEntityManager.findOne(Order, {
          where: { orderNumber },
        });

        if (!existing) {
          return orderNumber;
        }
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        // Wait a bit before retry
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    throw new ConflictException('注文番号の生成に失敗しました');
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
      queryBuilder.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus,
      });
    }

    // Date range filter with proper validation
    if (startDate) {
      // Validate date format
      const parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new BadRequestException('Invalid start date format');
      }
      queryBuilder.andWhere('order.orderDate >= :startDate', {
        startDate: parsedStartDate,
      });
    }
    if (endDate) {
      // Validate date format and ensure end of day
      const parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw new BadRequestException('Invalid end date format');
      }
      // Set to end of day for inclusive range
      parsedEndDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('order.orderDate <= :endDate', {
        endDate: parsedEndDate,
      });
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

  async findByUserId(
    userId: string,
    queryDto: OrderQueryDto,
  ): Promise<PaginatedOrderResult> {
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
      queryBuilder.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus,
      });
    }

    if (startDate) {
      // Validate date format
      const parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new BadRequestException('Invalid start date format');
      }
      queryBuilder.andWhere('order.orderDate >= :startDate', {
        startDate: parsedStartDate,
      });
    }
    if (endDate) {
      // Validate date format and ensure end of day
      const parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw new BadRequestException('Invalid end date format');
      }
      // Set to end of day for inclusive range
      parsedEndDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('order.orderDate <= :endDate', {
        endDate: parsedEndDate,
      });
    }

    if (search) {
      queryBuilder.andWhere('order.orderNumber ILIKE :search', {
        search: `%${search}%`,
      });
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

    // Validate status transitions
    if (updateOrderDto.status && updateOrderDto.status !== order.status) {
      this.validateStatusTransition(order.status, updateOrderDto.status);
    }

    // Update order fields
    Object.assign(order, updateOrderDto);

    // Handle status changes
    if (updateOrderDto.status === OrderStatus.DELIVERED && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    // Handle shipping status
    if (
      updateOrderDto.status === OrderStatus.SHIPPED &&
      updateOrderDto.trackingNumber
    ) {
      order.trackingNumber = updateOrderDto.trackingNumber;
    }

    // Validate payment status consistency
    if (updateOrderDto.paymentStatus && updateOrderDto.status) {
      this.validatePaymentStatusConsistency(
        updateOrderDto.status,
        updateOrderDto.paymentStatus,
      );
    }

    await this.orderRepository.save(order);

    return this.findById(id);
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [], // Terminal status
      [OrderStatus.REFUNDED]: [], // Terminal status
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private validatePaymentStatusConsistency(
    orderStatus: OrderStatus,
    paymentStatus: PaymentStatus,
  ): void {
    // Delivered orders should have paid status
    if (
      orderStatus === OrderStatus.DELIVERED &&
      paymentStatus !== PaymentStatus.PAID
    ) {
      throw new BadRequestException(
        'Delivered orders must have paid payment status',
      );
    }

    // Refunded orders should have refunded payment status
    if (
      orderStatus === OrderStatus.REFUNDED &&
      paymentStatus !== PaymentStatus.REFUNDED
    ) {
      throw new BadRequestException(
        'Refunded orders must have refunded payment status',
      );
    }
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

    // Get today's order count using proper date formatting for PostgreSQL
    const todayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const count = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.orderDate >= :todayStart', {
        todayStart: todayStart.toISOString(),
      })
      .andWhere('order.orderDate < :todayEnd', {
        todayEnd: todayEnd.toISOString(),
      })
      .getCount();

    const sequence = String(count + 1).padStart(4, '0');
    
    // Add timestamp suffix for test environment to ensure uniqueness
    if (process.env.NODE_ENV === 'test') {
      const timestamp = Date.now().toString().slice(-6);
      return `ORD${dateStr}${sequence}${timestamp}`;
    }
    
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
      items:
        order.items?.map((item) => ({
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
