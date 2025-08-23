import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto } from './dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;

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

  const mockPaginatedResult = {
    data: [mockCategory],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findRootCategories: jest.fn(),
    findChildrenByParentId: jest.fn(),
    getCategoryHierarchy: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    reorder: jest.fn(),
    findWithProductCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
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

      mockCategoriesService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(createCategoryDto);

      expect(mockCategoriesService.create).toHaveBeenCalledWith(
        createCategoryDto,
      );
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const queryDto: CategoryQueryDto = {
        page: 1,
        limit: 10,
      };

      mockCategoriesService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(queryDto);

      expect(mockCategoriesService.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('getHierarchy', () => {
    it('should return category hierarchy', async () => {
      mockCategoriesService.getCategoryHierarchy.mockResolvedValue([
        mockCategory,
      ]);

      const result = await controller.getHierarchy();

      expect(mockCategoriesService.getCategoryHierarchy).toHaveBeenCalled();
      expect(result).toEqual([mockCategory]);
    });
  });

  describe('getRootCategories', () => {
    it('should return root categories', async () => {
      mockCategoriesService.findRootCategories.mockResolvedValue([
        mockCategory,
      ]);

      const result = await controller.getRootCategories();

      expect(mockCategoriesService.findRootCategories).toHaveBeenCalledWith(
        false,
      );
      expect(result).toEqual([mockCategory]);
    });

    it('should return root categories with children when requested', async () => {
      mockCategoriesService.findRootCategories.mockResolvedValue([
        mockCategory,
      ]);

      const result = await controller.getRootCategories(true);

      expect(mockCategoriesService.findRootCategories).toHaveBeenCalledWith(
        true,
      );
      expect(result).toEqual([mockCategory]);
    });
  });

  describe('findBySlug', () => {
    it('should return category by slug', async () => {
      const slug = 'test-category';

      mockCategoriesService.findBySlug.mockResolvedValue(mockCategory);

      const result = await controller.findBySlug(slug);

      expect(mockCategoriesService.findBySlug).toHaveBeenCalledWith(slug);
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException if slug not found', async () => {
      const slug = 'non-existent-slug';

      mockCategoriesService.findBySlug.mockResolvedValue(null);

      await expect(controller.findBySlug(slug)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getChildren', () => {
    it('should return children of a category', async () => {
      const parentId = '123e4567-e89b-12d3-a456-426614174001';

      mockCategoriesService.findById.mockResolvedValue(mockCategory);
      mockCategoriesService.findChildrenByParentId.mockResolvedValue([
        mockCategory,
      ]);

      const result = await controller.getChildren(parentId);

      expect(mockCategoriesService.findById).toHaveBeenCalledWith(parentId);
      expect(mockCategoriesService.findChildrenByParentId).toHaveBeenCalledWith(
        parentId,
      );
      expect(result).toEqual([mockCategory]);
    });

    it('should throw NotFoundException if parent not found', async () => {
      const parentId = '123e4567-e89b-12d3-a456-426614174001';

      mockCategoriesService.findById.mockResolvedValue(null);

      await expect(controller.getChildren(parentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockCategoriesService.findById.mockResolvedValue(mockCategory);

      const result = await controller.findOne(id);

      expect(mockCategoriesService.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockCategory);
    });

    it('should return a category with product count when requested', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const categoryWithCount = { ...mockCategory, productCount: 5 };

      mockCategoriesService.findWithProductCount.mockResolvedValue(
        categoryWithCount,
      );

      const result = await controller.findOne(id, true);

      expect(mockCategoriesService.findWithProductCount).toHaveBeenCalledWith(
        id,
      );
      expect(result).toEqual(categoryWithCount);
    });

    it('should throw NotFoundException if category not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockCategoriesService.findById.mockResolvedValue(null);

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Category',
      };

      const updatedCategory = { ...mockCategory, ...updateCategoryDto };
      mockCategoriesService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update(id, updateCategoryDto);

      expect(mockCategoriesService.update).toHaveBeenCalledWith(
        id,
        updateCategoryDto,
      );
      expect(result).toEqual(updatedCategory);
    });
  });

  describe('remove', () => {
    it('should remove a category', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockCategoriesService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(mockCategoriesService.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('activate', () => {
    it('should activate a category', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const activatedCategory = { ...mockCategory, isActive: true };

      mockCategoriesService.activate.mockResolvedValue(activatedCategory);

      const result = await controller.activate(id);

      expect(mockCategoriesService.activate).toHaveBeenCalledWith(id);
      expect(result).toEqual(activatedCategory);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a category', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const deactivatedCategory = { ...mockCategory, isActive: false };

      mockCategoriesService.deactivate.mockResolvedValue(deactivatedCategory);

      const result = await controller.deactivate(id);

      expect(mockCategoriesService.deactivate).toHaveBeenCalledWith(id);
      expect(result).toEqual(deactivatedCategory);
    });
  });

  describe('reorder', () => {
    it('should reorder categories', async () => {
      const categoryIds = ['id1', 'id2', 'id3'];

      mockCategoriesService.reorder.mockResolvedValue(undefined);

      await controller.reorder({ categoryIds });

      expect(mockCategoriesService.reorder).toHaveBeenCalledWith(categoryIds);
    });
  });
});
