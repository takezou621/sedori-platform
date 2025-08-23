import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import {
  SearchQueryDto,
  SearchSortBy,
  SearchType,
  SearchResultsDto,
  SearchProductDto,
  SearchCategoryDto,
  SearchFacetDto,
} from './dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async search(searchQuery: SearchQueryDto): Promise<SearchResultsDto> {
    const startTime = Date.now();

    let products: SearchProductDto[] = [];
    let categories: SearchCategoryDto[] = [];
    let total = 0;
    let facets: SearchFacetDto[] = [];

    if (
      searchQuery.type === SearchType.PRODUCTS ||
      searchQuery.type === SearchType.ALL
    ) {
      const productResults = await this.searchProducts(searchQuery);
      products = productResults.products;
      total += productResults.total;

      if (searchQuery.includeFacets) {
        facets = await this.generateFacets(searchQuery);
      }
    }

    if (
      searchQuery.type === SearchType.CATEGORIES ||
      searchQuery.type === SearchType.ALL
    ) {
      const categoryResults = await this.searchCategories(searchQuery);
      categories = categoryResults.categories;
      total += categoryResults.total;
    }

    const searchTime = Date.now() - startTime;

    return {
      products,
      categories,
      total,
      pagination: {
        page: searchQuery.page!,
        limit: searchQuery.limit!,
        total,
        totalPages: Math.ceil(total / searchQuery.limit!),
        hasNext: searchQuery.page! * searchQuery.limit! < total,
        hasPrev: searchQuery.page! > 1,
      },
      facets: searchQuery.includeFacets ? facets : undefined,
      searchTime,
      query: searchQuery.q || '',
      suggestions: searchQuery.q
        ? await this.generateSuggestions(searchQuery.q)
        : undefined,
    };
  }

  private async searchProducts(searchQuery: SearchQueryDto): Promise<{
    products: SearchProductDto[];
    total: number;
  }> {
    const queryBuilder = this.productRepository.createQueryBuilder('product');
    queryBuilder.leftJoinAndSelect('product.category', 'category');

    // Apply filters
    this.applyProductFilters(queryBuilder, searchQuery);

    // Apply search
    if (searchQuery.q) {
      this.applyProductSearch(queryBuilder, searchQuery.q);
    }

    // Apply sorting
    this.applyProductSorting(queryBuilder, searchQuery.sortBy!);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (searchQuery.page! - 1) * searchQuery.limit!;
    queryBuilder.skip(offset).take(searchQuery.limit);

    const products = await queryBuilder.getMany();

    return {
      products: products.map(this.mapProductToSearchResult),
      total,
    };
  }

  private async searchCategories(searchQuery: SearchQueryDto): Promise<{
    categories: SearchCategoryDto[];
    total: number;
  }> {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    // Apply basic filters
    queryBuilder.andWhere('category.isActive = :isActive', { isActive: true });

    // Apply search
    if (searchQuery.q) {
      queryBuilder.andWhere(
        '(category.name ILIKE :search OR category.description ILIKE :search)',
        { search: `%${searchQuery.q}%` },
      );
    }

    // Apply sorting - use simple ordering to avoid PostgreSQL full-text issues
    if (searchQuery.q) {
      // Sort by name relevance (exact matches first, then prefix matches)
      queryBuilder.addSelect(
        `CASE 
          WHEN LOWER(category.name) = LOWER(:exactQuery) THEN 100
          WHEN LOWER(category.name) LIKE LOWER(:prefixQuery) THEN 90
          WHEN LOWER(category.description) LIKE LOWER(:containsQuery) THEN 50
          ELSE 10
        END`,
        'search_rank',
      );
      queryBuilder.setParameter('exactQuery', searchQuery.q);
      queryBuilder.setParameter('prefixQuery', `${searchQuery.q}%`);
      queryBuilder.setParameter('containsQuery', `%${searchQuery.q}%`);
      queryBuilder.orderBy('search_rank', 'DESC');
    } else {
      queryBuilder.orderBy('category.sortOrder', 'ASC');
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (searchQuery.page! - 1) * searchQuery.limit!;
    queryBuilder.skip(offset).take(searchQuery.limit);

    const categories = await queryBuilder.getMany();

    return {
      categories: categories.map(this.mapCategoryToSearchResult),
      total,
    };
  }

  private applyProductFilters(
    queryBuilder: SelectQueryBuilder<Product>,
    searchQuery: SearchQueryDto,
  ): void {
    // Active status
    queryBuilder.andWhere('product.status = :status', { status: 'active' });

    // Category filter
    if (searchQuery.categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId: searchQuery.categoryId,
      });
    }

    // Brand filter
    if (searchQuery.brands && searchQuery.brands.length > 0) {
      queryBuilder.andWhere('product.brand IN (:...brands)', {
        brands: searchQuery.brands,
      });
    }

    // Condition filter
    if (searchQuery.condition) {
      queryBuilder.andWhere('product.condition = :condition', {
        condition: searchQuery.condition,
      });
    }

    // Price range filter
    if (searchQuery.priceRange) {
      if (searchQuery.priceRange.min !== undefined) {
        queryBuilder.andWhere('product.wholesalePrice >= :minPrice', {
          minPrice: searchQuery.priceRange.min,
        });
      }
      if (searchQuery.priceRange.max !== undefined) {
        queryBuilder.andWhere('product.wholesalePrice <= :maxPrice', {
          maxPrice: searchQuery.priceRange.max,
        });
      }
    }

    // Stock filter
    if (searchQuery.inStockOnly) {
      queryBuilder.andWhere('product.stockQuantity > 0');
    }

    // Rating filter
    if (searchQuery.minRating !== undefined) {
      queryBuilder.andWhere('product.averageRating >= :minRating', {
        minRating: searchQuery.minRating,
      });
    }

    // Tags filter
    if (searchQuery.tags && searchQuery.tags.length > 0) {
      queryBuilder.andWhere('product.tags && :tags', {
        tags: searchQuery.tags,
      });
    }
  }

  private applyProductSearch(
    queryBuilder: SelectQueryBuilder<Product>,
    query: string,
  ): void {
    // Sanitize search query to prevent injection
    const sanitizedQuery = query.replace(/[^\w\s-]/g, '').trim();
    
    if (!sanitizedQuery) {
      return;
    }

    // Use simpler ILIKE search for better performance, fall back to full-text for complex queries
    if (sanitizedQuery.length <= 2) {
      // Simple prefix search for short queries
      queryBuilder.andWhere(
        '(product.name ILIKE :prefix OR product.brand ILIKE :prefix)',
        { prefix: `${sanitizedQuery}%` }
      );
    } else if (sanitizedQuery.split(' ').length === 1) {
      // Single word - use ILIKE with ranking
      queryBuilder.addSelect(
        `CASE 
          WHEN product.name ILIKE :exactQuery THEN 100
          WHEN product.name ILIKE :prefixQuery THEN 90
          WHEN product.brand ILIKE :exactQuery THEN 80
          WHEN category.name ILIKE :exactQuery THEN 75
          WHEN product.brand ILIKE :prefixQuery THEN 70
          WHEN category.name ILIKE :prefixQuery THEN 65
          WHEN product.description ILIKE :containsQuery THEN 50
          WHEN category.name ILIKE :containsQuery THEN 45
          ELSE 10
        END`,
        'search_rank',
      );
      
      queryBuilder.andWhere(
        '(product.name ILIKE :containsQuery OR product.brand ILIKE :containsQuery OR product.description ILIKE :containsQuery OR product.model ILIKE :containsQuery OR category.name ILIKE :containsQuery)',
        { 
          exactQuery: sanitizedQuery,
          prefixQuery: `${sanitizedQuery}%`,
          containsQuery: `%${sanitizedQuery}%`
        }
      );
    } else {
      // Multi-word - use PostgreSQL full-text search with better performance
      queryBuilder.addSelect(
        `ts_rank_cd(to_tsvector('simple', 
          product.name || ' ' || 
          COALESCE(product.description, '') || ' ' || 
          COALESCE(product.brand, '') || ' ' || 
          COALESCE(product.model, '') || ' ' || 
          COALESCE(category.name, '')), 
          plainto_tsquery('simple', :query))`,
        'search_rank',
      );

      queryBuilder.andWhere(
        `to_tsvector('simple', 
          product.name || ' ' || 
          COALESCE(product.description, '') || ' ' || 
          COALESCE(product.brand, '') || ' ' || 
          COALESCE(product.model, '') || ' ' || 
          COALESCE(category.name, '')) 
          @@ plainto_tsquery('simple', :query)`,
        { query: sanitizedQuery },
      );
    }

    queryBuilder.setParameter('query', sanitizedQuery);
  }

  private applyProductSorting(
    queryBuilder: SelectQueryBuilder<Product>,
    sortBy: SearchSortBy,
  ): void {
    switch (sortBy) {
      case SearchSortBy.RELEVANCE:
        if (
          queryBuilder.expressionMap.selects.some(
            (select) => select.aliasName === 'search_rank',
          )
        ) {
          queryBuilder.orderBy('search_rank', 'DESC');
        } else {
          queryBuilder.orderBy('product.viewCount', 'DESC');
        }
        break;
      case SearchSortBy.PRICE_ASC:
        queryBuilder.orderBy('product.wholesalePrice', 'ASC');
        break;
      case SearchSortBy.PRICE_DESC:
        queryBuilder.orderBy('product.wholesalePrice', 'DESC');
        break;
      case SearchSortBy.NAME_ASC:
        queryBuilder.orderBy('product.name', 'ASC');
        break;
      case SearchSortBy.NAME_DESC:
        queryBuilder.orderBy('product.name', 'DESC');
        break;
      case SearchSortBy.NEWEST:
        queryBuilder.orderBy('product.createdAt', 'DESC');
        break;
      case SearchSortBy.POPULARITY:
        queryBuilder.orderBy('product.viewCount', 'DESC');
        break;
      case SearchSortBy.RATING:
        queryBuilder.orderBy('product.averageRating', 'DESC');
        break;
      default:
        queryBuilder.orderBy('product.createdAt', 'DESC');
    }

    // Add secondary sort by ID for consistent pagination
    queryBuilder.addOrderBy('product.id', 'ASC');
  }

  private async generateFacets(
    searchQuery: SearchQueryDto,
  ): Promise<SearchFacetDto[]> {
    const facets: SearchFacetDto[] = [];

    // Category facets
    const categoryFacets = await this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('product.status = :status', { status: 'active' })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    if (categoryFacets.length > 0) {
      facets.push({
        name: 'category',
        label: 'カテゴリ',
        values: categoryFacets.map((facet) => ({
          value: facet.id,
          count: parseInt(facet.count),
          selected: searchQuery.categoryId === facet.id,
        })),
      });
    }

    // Brand facets
    const brandFacets = await this.productRepository
      .createQueryBuilder('product')
      .select('product.brand', 'brand')
      .addSelect('COUNT(*)', 'count')
      .where('product.status = :status', { status: 'active' })
      .andWhere('product.brand IS NOT NULL')
      .groupBy('product.brand')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    if (brandFacets.length > 0) {
      facets.push({
        name: 'brand',
        label: 'ブランド',
        values: brandFacets.map((facet) => ({
          value: facet.brand,
          count: parseInt(facet.count),
          selected: searchQuery.brands?.includes(facet.brand) || false,
        })),
      });
    }

    // Condition facets
    const conditionFacets = await this.productRepository
      .createQueryBuilder('product')
      .select('product.condition', 'condition')
      .addSelect('COUNT(*)', 'count')
      .where('product.status = :status', { status: 'active' })
      .groupBy('product.condition')
      .orderBy('count', 'DESC')
      .getRawMany();

    if (conditionFacets.length > 0) {
      facets.push({
        name: 'condition',
        label: '商品状態',
        values: conditionFacets.map((facet) => ({
          value: facet.condition,
          count: parseInt(facet.count),
          selected: searchQuery.condition === facet.condition,
        })),
      });
    }

    return facets;
  }

  private async generateSuggestions(query: string): Promise<string[]> {
    // Simple suggestion generation based on product names
    const suggestions = await this.productRepository
      .createQueryBuilder('product')
      .select('product.name')
      .addSelect('product.viewCount') 
      .where('product.name ILIKE :query', { query: `%${query}%` })
      .andWhere('product.status = :status', { status: 'active' })
      .orderBy('product.viewCount', 'DESC')
      .limit(5)
      .getRawMany();

    return suggestions.map((s) => s.product_name);
  }

  private mapProductToSearchResult(product: Product): SearchProductDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      brand: product.brand,
      model: product.model,
      categoryId: product.categoryId,
      categoryName: product.category?.name,
      wholesalePrice: Number(product.wholesalePrice),
      retailPrice: product.retailPrice
        ? Number(product.retailPrice)
        : undefined,
      marketPrice: product.marketPrice
        ? Number(product.marketPrice)
        : undefined,
      currency: product.currency,
      condition: product.condition,
      status: product.status,
      supplier: product.supplier,
      stockQuantity: product.stockQuantity,
      primaryImageUrl: product.primaryImageUrl,
      tags: product.tags,
      averageRating: Number(product.averageRating),
      reviewCount: product.reviewCount,
    };
  }

  private mapCategoryToSearchResult(category: Category): SearchCategoryDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
    };
  }
}
