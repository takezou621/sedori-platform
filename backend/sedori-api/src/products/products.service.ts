import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductSortBy,
  UpdateMarketDataDto,
  UpdateProfitabilityDataDto,
} from './dto';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Validate category exists if provided
    if (createProductDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: createProductDto.categoryId },
      });
      if (!category) {
        throw new BadRequestException('指定されたカテゴリが見つかりません');
      }
    }

    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async findAll(queryDto: ProductQueryDto): Promise<PaginatedResult<Product>> {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      status,
      condition,
      brand,
      supplier,
      minPrice,
      maxPrice,
      sortBy = ProductSortBy.CREATED_AT,
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search OR product.model ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Category filter
    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('product.status = :status', { status });
    }

    // Condition filter
    if (condition) {
      queryBuilder.andWhere('product.condition = :condition', { condition });
    }

    // Brand filter
    if (brand) {
      queryBuilder.andWhere('product.brand ILIKE :brand', {
        brand: `%${brand}%`,
      });
    }

    // Supplier filter
    if (supplier) {
      queryBuilder.andWhere('product.supplier ILIKE :supplier', {
        supplier: `%${supplier}%`,
      });
    }

    // Price range filter
    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.wholesalePrice >= :minPrice', {
        minPrice,
      });
    }
    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.wholesalePrice <= :maxPrice', {
        maxPrice,
      });
    }

    // Sorting
    queryBuilder.orderBy(`product.${sortBy}`, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
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

  async findById(id: string): Promise<Product | null> {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.id = :id', { id })
      .getOne();
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('商品が見つかりません');
    }

    Object.assign(product, updateProductDto);
    product.lastUpdatedAt = new Date();
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const result = await this.productRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('商品が見つかりません');
    }
  }

  async incrementViewCount(id: string): Promise<void> {
    try {
      // Use raw query with better connection handling
      await this.productRepository.query(
        'UPDATE products SET "viewCount" = "viewCount" + 1 WHERE id = $1',
        [id],
      );
    } catch (error) {
      // Log error but don't fail the request - view count is not critical
      console.warn(
        `Failed to increment view count for product ${id}:`,
        error.message,
      );

      // Fallback to standard repository method
      try {
        const product = await this.productRepository.findOne({ where: { id } });
        if (product) {
          product.viewCount = product.viewCount + 1;
          await this.productRepository.save(product);
        }
      } catch (fallbackError) {
        console.warn(
          `Fallback view count increment also failed for product ${id}:`,
          fallbackError.message,
        );
      }
    }
  }

  async updateMarketData(
    id: string,
    marketData: UpdateMarketDataDto,
  ): Promise<void> {
    // Verify product exists before updating
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('商品が見つかりません');
    }

    await this.productRepository.update(id, {
      marketData,
      lastUpdatedAt: new Date(),
    });
  }

  async updateProfitabilityData(
    id: string,
    profitabilityData: UpdateProfitabilityDataDto,
  ): Promise<void> {
    // Verify product exists before updating
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('商品が見つかりません');
    }

    await this.productRepository.update(id, {
      profitabilityData,
      lastUpdatedAt: new Date(),
    });
  }

  async findByCategory(
    categoryId: string,
    limit: number = 10,
  ): Promise<Product[]> {
    return this.productRepository.find({
      where: { categoryId },
      relations: ['category'],
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { sku },
      relations: ['category'],
    });
  }

  async findBySupplier(
    supplier: string,
    limit: number = 10,
  ): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.supplier ILIKE :supplier', { supplier: `%${supplier}%` })
      .take(limit)
      .orderBy('product.createdAt', 'DESC')
      .getMany();
  }
}
