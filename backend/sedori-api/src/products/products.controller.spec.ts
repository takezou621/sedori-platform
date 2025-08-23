import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import {
  Product,
  ProductStatus,
  ProductCondition,
} from './entities/product.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  UpdateMarketDataDto,
  UpdateProfitabilityDataDto,
} from './dto';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProduct: Product = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    description: 'Test Description',
    categoryId: '123e4567-e89b-12d3-a456-426614174001',
    wholesalePrice: 100,
    retailPrice: 150,
    currency: 'JPY',
    condition: ProductCondition.NEW,
    status: ProductStatus.ACTIVE,
    supplier: 'Test Supplier',
    viewCount: 0,
    averageRating: 0,
    reviewCount: 0,
    weightUnit: 'kg',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUpdatedAt: new Date(),
  } as Product;

  const mockPaginatedResult = {
    data: [mockProduct],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    incrementViewCount: jest.fn(),
    updateMarketData: jest.fn(),
    updateProfitabilityData: jest.fn(),
    findByCategory: jest.fn(),
    findBySku: jest.fn(),
    findBySupplier: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Test Product',
        categoryId: '123e4567-e89b-12d3-a456-426614174001',
        wholesalePrice: 100,
        supplier: 'Test Supplier',
      };

      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createProductDto);

      expect(mockProductsService.create).toHaveBeenCalledWith(createProductDto);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
      };

      mockProductsService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(queryDto);

      expect(mockProductsService.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockProductsService.findById.mockResolvedValue(mockProduct);
      mockProductsService.incrementViewCount.mockResolvedValue(undefined);

      const result = await controller.findOne(id);

      expect(mockProductsService.findById).toHaveBeenCalledWith(id);
      expect(mockProductsService.incrementViewCount).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockProductsService.findById.mockResolvedValue(null);

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
      };

      const updatedProduct = { ...mockProduct, ...updateProductDto };
      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(id, updateProductDto);

      expect(mockProductsService.update).toHaveBeenCalledWith(
        id,
        updateProductDto,
      );
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('remove', () => {
    it('should remove a product', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockProductsService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(mockProductsService.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('findByCategory', () => {
    it('should return products by category', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174001';
      const limit = 5;

      mockProductsService.findByCategory.mockResolvedValue([mockProduct]);

      const result = await controller.findByCategory(categoryId, limit);

      expect(mockProductsService.findByCategory).toHaveBeenCalledWith(
        categoryId,
        limit,
      );
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('findBySku', () => {
    it('should return product by SKU', async () => {
      const sku = 'TEST-SKU-001';

      mockProductsService.findBySku.mockResolvedValue(mockProduct);

      const result = await controller.findBySku(sku);

      expect(mockProductsService.findBySku).toHaveBeenCalledWith(sku);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if SKU not found', async () => {
      const sku = 'NON-EXISTENT-SKU';

      mockProductsService.findBySku.mockResolvedValue(null);

      await expect(controller.findBySku(sku)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySupplier', () => {
    it('should return products by supplier', async () => {
      const supplier = 'Test Supplier';
      const limit = 5;

      mockProductsService.findBySupplier.mockResolvedValue([mockProduct]);

      const result = await controller.findBySupplier(supplier, limit);

      expect(mockProductsService.findBySupplier).toHaveBeenCalledWith(
        supplier,
        limit,
      );
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('updateMarketData', () => {
    it('should update market data', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const marketData: UpdateMarketDataDto = {
        amazonPrice: 150,
        rakutenPrice: 145,
      };

      mockProductsService.updateMarketData.mockResolvedValue(undefined);

      await controller.updateMarketData(id, marketData);

      expect(mockProductsService.updateMarketData).toHaveBeenCalledWith(
        id,
        marketData,
      );
    });
  });

  describe('updateProfitabilityData', () => {
    it('should update profitability data', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const profitabilityData: UpdateProfitabilityDataDto = {
        estimatedProfit: 50,
        profitMargin: 20,
      };

      mockProductsService.updateProfitabilityData.mockResolvedValue(undefined);

      await controller.updateProfitabilityData(id, profitabilityData);

      expect(mockProductsService.updateProfitabilityData).toHaveBeenCalledWith(
        id,
        profitabilityData,
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle view count increment failure gracefully', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockProductsService.findById.mockResolvedValue(mockProduct);
      mockProductsService.incrementViewCount.mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw error even if increment fails
      const result = await controller.findOne(id);

      expect(result).toEqual(mockProduct);
    });
  });
});
