import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  CategorySortBy,
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
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check if slug is unique
    const existingCategory = await this.categoryRepository.findOne({
      where: { slug: createCategoryDto.slug },
    });

    if (existingCategory) {
      throw new ConflictException('このスラッグは既に使用されています');
    }

    // If parentId is provided, verify parent exists
    if (createCategoryDto.parentId) {
      const parent = await this.findById(createCategoryDto.parentId);
      if (!parent) {
        throw new NotFoundException('親カテゴリが見つかりません');
      }
    }

    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  async findAll(
    queryDto: CategoryQueryDto,
  ): Promise<PaginatedResult<Category>> {
    const {
      page = 1,
      limit = 20,
      search,
      parentId,
      isActive,
      rootOnly,
      includeChildren,
      includeProductCount,
      sortBy = CategorySortBy.SORT_ORDER,
      sortOrder = 'ASC',
    } = queryDto;

    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    // Include parent relationship
    queryBuilder.leftJoinAndSelect('category.parent', 'parent');

    // Include children if requested
    if (includeChildren) {
      queryBuilder.leftJoinAndSelect('category.children', 'children');
    }

    // Include product count if requested
    if (includeProductCount) {
      queryBuilder.leftJoin('category.products', 'products');
      queryBuilder.addSelect('COUNT(products.id)', 'category_productCount');
      queryBuilder.groupBy('category.id');
      if (includeChildren) {
        queryBuilder.addGroupBy('children.id');
      }
      queryBuilder.addGroupBy('parent.id');
    }

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(category.name ILIKE :search OR category.description ILIKE :search OR category.slug ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Parent filter
    if (parentId) {
      queryBuilder.andWhere('category.parentId = :parentId', { parentId });
    }

    // Root only filter (no parent)
    if (rootOnly) {
      queryBuilder.andWhere('category.parentId IS NULL');
    }

    // Active status filter
    if (isActive !== undefined) {
      queryBuilder.andWhere('category.isActive = :isActive', { isActive });
    }

    // Sorting
    if (sortBy === CategorySortBy.PRODUCT_COUNT && includeProductCount) {
      queryBuilder.orderBy('category_productCount', sortOrder);
    } else {
      queryBuilder.orderBy(`category.${sortBy}`, sortOrder);
    }

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

  async findById(id: string): Promise<Category | null> {
    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children')
      .where('category.id = :id', { id })
      .getOne();
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children')
      .where('category.slug = :slug', { slug })
      .getOne();
  }

  async findRootCategories(
    includeChildren: boolean = false,
  ): Promise<Category[]> {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.parentId IS NULL')
      .andWhere('category.isActive = :isActive', { isActive: true })
      .orderBy('category.sortOrder', 'ASC');

    if (includeChildren) {
      queryBuilder
        .leftJoinAndSelect('category.children', 'children')
        .addOrderBy('children.sortOrder', 'ASC');
    }

    return queryBuilder.getMany();
  }

  async findChildrenByParentId(parentId: string): Promise<Category[]> {
    return this.categoryRepository
      .createQueryBuilder('category')
      .where('category.parentId = :parentId', { parentId })
      .andWhere('category.isActive = :isActive', { isActive: true })
      .orderBy('category.sortOrder', 'ASC')
      .getMany();
  }

  async getCategoryHierarchy(): Promise<Category[]> {
    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.children', 'children')
      .where('category.parentId IS NULL')
      .andWhere('category.isActive = :isActive', { isActive: true })
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('children.sortOrder', 'ASC')
      .getMany();
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findById(id);
    if (!category) {
      throw new NotFoundException('カテゴリが見つかりません');
    }

    // Check slug uniqueness if it's being updated
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { slug: updateCategoryDto.slug },
      });

      if (existingCategory) {
        throw new ConflictException('このスラッグは既に使用されています');
      }
    }

    // Validate parent (prevent circular references)
    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new ConflictException(
          '自分自身を親カテゴリに設定することはできません',
        );
      }

      const parent = await this.findById(updateCategoryDto.parentId);
      if (!parent) {
        throw new NotFoundException('親カテゴリが見つかりません');
      }

      // Check for circular reference
      if (
        await this.wouldCreateCircularReference(id, updateCategoryDto.parentId)
      ) {
        throw new ConflictException(
          '循環参照が発生するため、この親カテゴリは設定できません',
        );
      }
    }

    Object.assign(category, updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    // Check if category has children
    const children = await this.findChildrenByParentId(id);
    if (children.length > 0) {
      throw new ConflictException('子カテゴリが存在するため削除できません');
    }

    // Check if category has products (you might want to implement this)
    // const hasProducts = await this.hasProducts(id);
    // if (hasProducts) {
    //   throw new ConflictException('商品が関連付けられているため削除できません');
    // }

    const result = await this.categoryRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('カテゴリが見つかりません');
    }
  }

  async activate(id: string): Promise<Category> {
    const category = await this.findById(id);
    if (!category) {
      throw new NotFoundException('カテゴリが見つかりません');
    }

    category.isActive = true;
    return this.categoryRepository.save(category);
  }

  async deactivate(id: string): Promise<Category> {
    const category = await this.findById(id);
    if (!category) {
      throw new NotFoundException('カテゴリが見つかりません');
    }

    category.isActive = false;
    return this.categoryRepository.save(category);
  }

  async reorder(categoryIds: string[]): Promise<void> {
    const categories = await this.categoryRepository.findByIds(categoryIds);

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('一部のカテゴリが見つかりません');
    }

    // Update sort order
    for (let i = 0; i < categoryIds.length; i++) {
      const category = categories.find((c) => c.id === categoryIds[i]);
      if (category) {
        category.sortOrder = i;
        await this.categoryRepository.save(category);
      }
    }
  }

  private async wouldCreateCircularReference(
    categoryId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentParentId: string | null = newParentId;

    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true;
      }

      const parent = await this.categoryRepository.findOne({
        where: { id: currentParentId },
        select: ['id', 'parentId'],
      });

      if (!parent) {
        break;
      }

      currentParentId = parent.parentId || null;
    }

    return false;
  }

  // Helper method to get category with product count
  async findWithProductCount(
    id: string,
  ): Promise<(Category & { productCount?: number }) | null> {
    const result = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children')
      .leftJoin('category.products', 'products')
      .addSelect('COUNT(products.id)', 'productCount')
      .where('category.id = :id', { id })
      .groupBy('category.id')
      .addGroupBy('parent.id')
      .addGroupBy('children.id')
      .getRawAndEntities();

    if (!result.entities[0]) {
      return null;
    }

    const category = result.entities[0] as Category & { productCount?: number };
    const rawResult = result.raw[0] as { productCount?: string };
    category.productCount = parseInt(rawResult?.productCount || '0');

    return category;
  }
}
