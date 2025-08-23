import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartsService } from '../carts/carts.service';
import { CartStatus } from '../carts/entities/cart.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;
  let cartsService: CartsService;

  const mockOrder = {
    id: 'order-id',
    orderNumber: 'ORD20240101001',
    userId: 'user-id',
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    totalAmount: 1100,
    items: [],
  };

  const mockCart = {
    id: 'cart-id',
    userId: 'user-id',
    status: CartStatus.ACTIVE,
    totalAmount: 1000,
    totalItems: 2,
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        quantity: 1,
        unitPrice: 500,
        totalPrice: 500,
        product: {
          id: 'product-1',
          name: 'Test Product 1',
          sku: 'SKU1',
          brand: 'Brand A',
        },
        productSnapshot: {
          name: 'Test Product 1',
          brand: 'Brand A',
        },
      },
      {
        id: 'item-2',
        productId: 'product-2',
        quantity: 1,
        unitPrice: 500,
        totalPrice: 500,
        product: {
          id: 'product-2',
          name: 'Test Product 2',
          sku: 'SKU2',
          brand: 'Brand B',
        },
        productSnapshot: {
          name: 'Test Product 2',
          brand: 'Brand B',
        },
      },
    ],
  };

  const mockRepositories = {
    order: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        transaction: jest.fn((fn) => {
          // Mock transaction manager
          const mockManager = {
            save: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(0),
            }),
          };

          // Configure save method to return different things based on entity type
          mockManager.save.mockImplementation((EntityType, entity) => {
            if (EntityType === Order || (entity && !EntityType)) {
              return Promise.resolve(mockOrder);
            }
            return Promise.resolve(entity || {});
          });

          // Configure create method to return appropriate entities
          mockManager.create.mockImplementation((EntityType, data) => {
            if (EntityType === Order) {
              return { ...mockOrder, ...data };
            }
            return { ...data };
          });

          // No existing order with same order number
          mockManager.findOne.mockImplementation((EntityType, options) => {
            if (EntityType === Order && options?.where?.orderNumber) {
              return Promise.resolve(null);
            }
            return Promise.resolve(null);
          });

          return fn(mockManager);
        }),
      },
    },
    orderItem: {
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockCartsService = {
    getCart: jest.fn(),
    convertCartToOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepositories.order,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockRepositories.orderItem,
        },
        {
          provide: CartsService,
          useValue: mockCartsService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    orderItemRepository = module.get<Repository<OrderItem>>(
      getRepositoryToken(OrderItem),
    );
    cartsService = module.get<CartsService>(CartsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create order from cart', async () => {
      const createOrderDto = {
        shippingAddress: {
          fullName: 'Test User',
          address1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          postalCode: '123-4567',
          country: 'Japan',
        },
      };

      mockCartsService.getCart.mockResolvedValue(mockCart);
      mockRepositories.order.count.mockResolvedValue(0);
      mockRepositories.order.create.mockReturnValue(mockOrder);
      mockRepositories.order.save.mockResolvedValue(mockOrder);
      mockRepositories.orderItem.create.mockReturnValue({});
      mockRepositories.orderItem.save.mockResolvedValue([]);
      mockRepositories.order.findOne.mockResolvedValue({
        ...mockOrder,
        items: [],
      });

      const result = await service.createOrder('user-id', createOrderDto);

      expect(mockCartsService.getCart).toHaveBeenCalledWith('user-id');
      expect(mockRepositories.order.manager.transaction).toHaveBeenCalled();
      expect(mockCartsService.convertCartToOrder).toHaveBeenCalledWith(
        'cart-id',
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if cart is empty', async () => {
      const createOrderDto = {
        shippingAddress: {
          fullName: 'Test User',
          address1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          postalCode: '123-4567',
          country: 'Japan',
        },
      };

      const emptyCart = { ...mockCart, items: [] };
      mockCartsService.getCart.mockResolvedValue(emptyCart);

      await expect(
        service.createOrder('user-id', createOrderDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return order by id', async () => {
      mockRepositories.order.findOne.mockResolvedValue(mockOrder);

      const result = await service.findById('order-id');

      expect(result).toEqual(mockOrder);
      expect(mockRepositories.order.findOne).toHaveBeenCalledWith({
        where: { id: 'order-id' },
        relations: ['items'],
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      mockRepositories.order.findOne.mockResolvedValue(null);

      await expect(service.findById('order-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel order', async () => {
      const orderToCancel = {
        ...mockOrder,
        status: OrderStatus.PENDING,
      };

      mockRepositories.order.findOne.mockResolvedValue(orderToCancel);
      mockRepositories.order.save.mockResolvedValue({
        ...orderToCancel,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.cancel('order-id');

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockRepositories.order.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if order is already delivered', async () => {
      const deliveredOrder = {
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      };

      mockRepositories.order.findOne.mockResolvedValue(deliveredOrder);

      await expect(service.cancel('order-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if order is already cancelled', async () => {
      const cancelledOrder = {
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      };

      mockRepositories.order.findOne.mockResolvedValue(cancelledOrder);

      await expect(service.cancel('order-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
