import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartsService } from './carts.service';
import { Cart, CartStatus } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';

describe('CartsService', () => {
  let service: CartsService;
  let cartRepository: Repository<Cart>;
  let cartItemRepository: Repository<CartItem>;
  let productRepository: Repository<Product>;

  const mockCart = {
    id: 'cart-id',
    userId: 'user-id',
    status: CartStatus.ACTIVE,
    totalAmount: 1000,
    totalItems: 2,
    items: [],
  };

  const mockProduct = {
    id: 'product-id',
    name: 'Test Product',
    wholesalePrice: 500,
    status: 'active',
    brand: 'Test Brand',
    primaryImageUrl: 'test-image.jpg',
  };

  const mockRepositories = {
    cart: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    },
    cartItem: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    },
    product: {
      findOne: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartsService,
        {
          provide: getRepositoryToken(Cart),
          useValue: mockRepositories.cart,
        },
        {
          provide: getRepositoryToken(CartItem),
          useValue: mockRepositories.cartItem,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepositories.product,
        },
      ],
    }).compile();

    service = module.get<CartsService>(CartsService);
    cartRepository = module.get<Repository<Cart>>(getRepositoryToken(Cart));
    cartItemRepository = module.get<Repository<CartItem>>(
      getRepositoryToken(CartItem),
    );
    productRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart', async () => {
      mockRepositories.cart.findOne.mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart('user-id');

      expect(result).toEqual(mockCart);
      expect(mockRepositories.cart.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-id', status: CartStatus.ACTIVE },
        relations: ['items', 'items.product'],
      });
    });

    it('should create new cart if none exists', async () => {
      mockRepositories.cart.findOne.mockResolvedValue(null);
      mockRepositories.cart.create.mockReturnValue(mockCart);
      mockRepositories.cart.save.mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart('user-id');

      expect(mockRepositories.cart.create).toHaveBeenCalled();
      expect(mockRepositories.cart.save).toHaveBeenCalled();
      expect(result).toEqual(mockCart);
    });
  });

  describe('addToCart', () => {
    it('should add product to cart', async () => {
      const addToCartDto = {
        productId: 'product-id',
        quantity: 1,
      };

      mockRepositories.product.findOne.mockResolvedValue(mockProduct);
      mockRepositories.cart.findOne.mockResolvedValue(mockCart);
      mockRepositories.cartItem.findOne.mockResolvedValue(null);
      mockRepositories.cartItem.create.mockReturnValue({});
      mockRepositories.cartItem.save.mockResolvedValue({});
      mockRepositories.cartItem.find.mockResolvedValue([]);

      await service.addToCart('user-id', addToCartDto);

      expect(mockRepositories.product.findOne).toHaveBeenCalledWith({
        where: { id: 'product-id' },
      });
      expect(mockRepositories.cartItem.create).toHaveBeenCalled();
      expect(mockRepositories.cartItem.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      const addToCartDto = {
        productId: 'product-id',
        quantity: 1,
      };

      mockRepositories.product.findOne.mockResolvedValue(null);

      await expect(service.addToCart('user-id', addToCartDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if product is not active', async () => {
      const addToCartDto = {
        productId: 'product-id',
        quantity: 1,
      };

      const inactiveProduct = { ...mockProduct, status: 'inactive' };
      mockRepositories.product.findOne.mockResolvedValue(inactiveProduct);

      await expect(service.addToCart('user-id', addToCartDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
