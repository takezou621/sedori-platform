import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto } from './dto';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockCategory: Category = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Category',
    slug: 'test-category',
    description: 'Test Description',
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Category;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIds: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getRawAndEntities: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Test Category',
        slug: 'test-category',
      };

      mockRepository.findOne.mockResolvedValue(null); // No existing slug
      mockRepository.create.mockReturnValue(mockCategory);
      mockRepository.save.mockResolvedValue(mockCategory);

      const result = await service.create(createCategoryDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { slug: createCategoryDto.slug },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(createCategoryDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockCategory);
      expect(result).toEqual(mockCategory);
    });

    it('should throw ConflictException if slug already exists', async () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Test Category',
        slug: 'test-category',
      };

      mockRepository.findOne.mockResolvedValue(mockCategory);

      await expect(service.create(createCategoryDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should validate parent exists if parentId provided', async () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Child Category',
        slug: 'child-category',
        parentId: '123e4567-e89b-12d3-a456-426614174001',
      };

      mockRepository.findOne
        .mockResolvedValueOnce(null) // No existing slug
        .mockResolvedValueOnce(null); // Parent not found

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.create(createCategoryDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const queryDto: CategoryQueryDto = {
        page: 1,
        limit: 10,
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockCategory], 1]);

      const result = await service.findAll(queryDto);

      expect(result).toEqual({
        data: [mockCategory],
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
      const queryDto: CategoryQueryDto = {
        page: 1,
        limit: 10,
        search: 'test',
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockCategory], 1]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(category.name ILIKE :search OR category.description ILIKE :search OR category.slug ILIKE :search)',
        { search: '%test%' },
      );
    });

    it('should apply parent filter', async () => {
      const parentId = '123e4567-e89b-12d3-a456-426614174001';
      const queryDto: CategoryQueryDto = {
        page: 1,
        limit: 10,
        parentId,
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockCategory], 1]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category.parentId = :parentId',
        { parentId },
      );
    });

    it('should apply rootOnly filter', async () => {
      const queryDto: CategoryQueryDto = {
        page: 1,
        limit: 10,
        rootOnly: true,
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockCategory], 1]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category.parentId IS NULL',
      );
    });

    it('should include product count when requested', async () => {
      const queryDto: CategoryQueryDto = {
        page: 1,
        limit: 10,
        includeProductCount: true,
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockCategory], 1]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'category.products',
        'products',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'COUNT(products.id)',
        'category_productCount',
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('category.id');
    });
  });

  describe('findById', () => {
    it('should return a category by id', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockCategory);

      const result = await service.findById(id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'category.parent',
        'parent',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'category.children',
        'children',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.id = :id', {
        id,
      });
      expect(result).toEqual(mockCategory);
    });

    it('should return null if category not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.findById(id);

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return a category by slug', async () => {
      const slug = 'test-category';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockCategory);

      const result = await service.findBySlug(slug);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'category.slug = :slug',
        { slug },
      );
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findRootCategories', () => {
    it('should return root categories', async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([mockCategory]);

      const result = await service.findRootCategories();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'category.parentId IS NULL',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category.isActive = :isActive',
        { isActive: true },
      );
      expect(result).toEqual([mockCategory]);
    });

    it('should include children when requested', async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([mockCategory]);

      await service.findRootCategories(true);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'category.children',
        'children',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'children.sortOrder',
        'ASC',
      );
    });
  });

  describe('findChildrenByParentId', () => {
    it('should return children of a parent category', async () => {
      const parentId = '123e4567-e89b-12d3-a456-426614174001';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([mockCategory]);

      const result = await service.findChildrenByParentId(parentId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'category.parentId = :parentId',
        { parentId },
      );
      expect(result).toEqual([mockCategory]);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Category',
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockCategory);
      mockRepository.save.mockResolvedValue({
        ...mockCategory,
        ...updateCategoryDto,
      });

      const result = await service.update(id, updateCategoryDto);

      expect(result.name).toBe(updateCategoryDto.name);
    });

    it('should throw NotFoundException if category not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Category',
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(id, updateCategoryDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow updating same slug', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Name',
        slug: mockCategory.slug, // Same slug
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockCategory);
      mockRepository.save.mockResolvedValue({
        ...mockCategory,
        ...updateCategoryDto,
      });

      const result = await service.update(id, updateCategoryDto);

      expect(result.name).toBe(updateCategoryDto.name);
      expect(mockRepository.findOne).not.toHaveBeenCalled(); // Should not check uniqueness for same slug
    });

    it('should allow updating when slug is unique', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateCategoryDto: UpdateCategoryDto = {
        slug: 'unique-slug',
      };

      const currentCategory = { ...mockCategory, slug: 'current-slug' };

      // Mock findById (via createQueryBuilder) to return current category
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(currentCategory);

      // Mock findOne to return null (slug is unique)
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({
        ...currentCategory,
        ...updateCategoryDto,
      });

      const result = await service.update(id, updateCategoryDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'unique-slug' },
      });
      expect(result.slug).toBe('unique-slug');
    });

    it('should prevent self-parent assignment', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateCategoryDto: UpdateCategoryDto = {
        parentId: id,
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockCategory);

      await expect(service.update(id, updateCategoryDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a category', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([]); // No children
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(id);

      expect(mockRepository.softDelete).toHaveBeenCalledWith(id);
    });

    it('should throw ConflictException if category has children', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([mockCategory]); // Has children

      await expect(service.remove(id)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if category not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([]); // No children
      mockRepository.softDelete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate/deactivate', () => {
    it('should activate a category', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockCategory);
      mockRepository.save.mockResolvedValue({
        ...mockCategory,
        isActive: true,
      });

      const result = await service.activate(id);

      expect(result.isActive).toBe(true);
    });

    it('should deactivate a category', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockCategory);
      mockRepository.save.mockResolvedValue({
        ...mockCategory,
        isActive: false,
      });

      const result = await service.deactivate(id);

      expect(result.isActive).toBe(false);
    });
  });

  describe('reorder', () => {
    it('should reorder categories', async () => {
      const categoryIds = ['id1', 'id2', 'id3'];
      const categories = [
        { id: 'id1', sortOrder: 0 },
        { id: 'id2', sortOrder: 1 },
        { id: 'id3', sortOrder: 2 },
      ] as Category[];

      mockRepository.findByIds.mockResolvedValue(categories);
      mockRepository.save.mockImplementation((category) =>
        Promise.resolve(category),
      );

      await service.reorder(categoryIds);

      expect(mockRepository.findByIds).toHaveBeenCalledWith(categoryIds);
      expect(mockRepository.save).toHaveBeenCalledTimes(3);
    });

    it('should throw NotFoundException if some categories not found', async () => {
      const categoryIds = ['id1', 'id2', 'id3'];
      const categories = [{ id: 'id1' }] as Category[]; // Missing categories

      mockRepository.findByIds.mockResolvedValue(categories);

      await expect(service.reorder(categoryIds)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
