import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  Product,
  ProductStatus,
  ProductCondition,
} from './entities/product.entity';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
import { Category } from '../categories/entities/category.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: Repository<Product>;

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

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(),
    query: jest.fn(),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
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

      // Mock category exists check
      mockCategoryRepository.findOne.mockResolvedValue({
        id: createProductDto.categoryId,
        name: 'Test Category',
      });

      mockRepository.create.mockReturnValue(mockProduct);
      mockRepository.save.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createProductDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll(queryDto);

      expect(result).toEqual({
        data: [mockProduct],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should apply search filter', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        search: 'test',
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search OR product.model ILIKE :search)',
        { search: '%test%' },
      );
    });

    it('should apply category filter', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174001';
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        categoryId,
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.categoryId = :categoryId',
        { categoryId },
      );
    });

    it('should apply price range filter', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        minPrice: 50,
        maxPrice: 200,
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.wholesalePrice >= :minPrice',
        { minPrice: 50 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.wholesalePrice <= :maxPrice',
        { maxPrice: 200 },
      );
    });
  });

  describe('findById', () => {
    it('should return a product by id', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);

      const result = await service.findById(id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.category',
        'category',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.id = :id', {
        id,
      });
      expect(result).toEqual(mockProduct);
    });

    it('should return null if product not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.findById(id);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        wholesalePrice: 120,
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockResolvedValue({
        ...mockProduct,
        ...updateProductDto,
      });

      const result = await service.update(id, updateProductDto);

      expect(result.name).toBe(updateProductDto.name);
      expect(result.wholesalePrice).toBe(updateProductDto.wholesalePrice);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(id, updateProductDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a product', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(id);

      expect(mockRepository.softDelete).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException if product not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.softDelete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count using raw query', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.query.mockResolvedValue(undefined);

      await service.incrementViewCount(id);

      expect(mockRepository.query).toHaveBeenCalledWith(
        'UPDATE products SET "viewCount" = "viewCount" + 1 WHERE id = $1',
        [id],
      );
    });

    it('should use fallback method when query fails', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const productWithViewCount = { ...mockProduct, viewCount: 5 };

      mockRepository.query.mockRejectedValue(new Error('Query failed'));
      mockRepository.findOne.mockResolvedValue(productWithViewCount);
      mockRepository.save.mockResolvedValue({
        ...productWithViewCount,
        viewCount: 6,
      });

      await service.incrementViewCount(id);

      expect(mockRepository.query).toHaveBeenCalled();
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...productWithViewCount,
        viewCount: 6,
      });
    });
  });

  describe('updateMarketData', () => {
    it('should update market data for existing product', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const marketData = { amazonPrice: 150, rakutenPrice: 145 };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateMarketData(id, marketData);

      expect(mockRepository.update).toHaveBeenCalledWith(id, {
        marketData,
        lastUpdatedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const marketData = { amazonPrice: 150 };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.updateMarketData(id, marketData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfitabilityData', () => {
    it('should update profitability data for existing product', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const profitabilityData = { estimatedProfit: 50, profitMargin: 20 };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateProfitabilityData(id, profitabilityData);

      expect(mockRepository.update).toHaveBeenCalledWith(id, {
        profitabilityData,
        lastUpdatedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const profitabilityData = { estimatedProfit: 50 };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.updateProfitabilityData(id, profitabilityData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCategory', () => {
    it('should return products by category', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174001';
      const limit = 5;

      mockRepository.find.mockResolvedValue([mockProduct]);

      const result = await service.findByCategory(categoryId, limit);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { categoryId },
        relations: ['category'],
        take: limit,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('findBySku', () => {
    it('should return product by SKU', async () => {
      const sku = 'TEST-SKU-001';
      const productWithSku = { ...mockProduct, sku };

      mockRepository.findOne.mockResolvedValue(productWithSku);

      const result = await service.findBySku(sku);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { sku },
        relations: ['category'],
      });
      expect(result).toEqual(productWithSku);
    });

    it('should return null if SKU not found', async () => {
      const sku = 'NON-EXISTENT-SKU';

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findBySku(sku);

      expect(result).toBeNull();
    });
  });

  describe('findBySupplier', () => {
    it('should return products by supplier', async () => {
      const supplier = 'Test Supplier';
      const limit = 5;

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([mockProduct]);

      const result = await service.findBySupplier(supplier, limit);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.category',
        'category',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.supplier ILIKE :supplier',
        { supplier: `%${supplier}%` },
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(limit);
      expect(result).toEqual([mockProduct]);
    });
  });
});
