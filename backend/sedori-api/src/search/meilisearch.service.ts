import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';
import { Product } from '../products/entities/product.entity';
import { SearchQueryDto, SearchResultsDto } from './dto';

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client: MeiliSearch;
  private productsIndex: Index;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const meilisearchConfig = this.configService.get('app.meilisearch');
      
      this.client = new MeiliSearch({
        host: meilisearchConfig.host,
        apiKey: meilisearchConfig.masterKey,
      });

      // Initialize indexes
      await this.initializeIndexes();
      this.logger.log('Meilisearch client initialized successfully');
    } catch (error) {
      this.logger.warn('Failed to initialize Meilisearch client:', error.message);
      // Don't throw error to prevent app from failing if Meilisearch is unavailable
    }
  }

  private async initializeIndexes() {
    try {
      // Create products index
      this.productsIndex = this.client.index('products');
      
      // Set searchable attributes
      await this.productsIndex.updateSearchableAttributes([
        'name',
        'description', 
        'brand',
        'model',
        'sku',
        'tags',
        'categoryName'
      ]);

      // Set filterable attributes
      await this.productsIndex.updateFilterableAttributes([
        'categoryId',
        'categoryName',
        'brand',
        'condition',
        'status',
        'wholesalePrice',
        'retailPrice',
        'stockQuantity',
        'averageRating',
        'tags'
      ]);

      // Set sortable attributes
      await this.productsIndex.updateSortableAttributes([
        'name',
        'wholesalePrice',
        'retailPrice',
        'createdAt',
        'viewCount',
        'averageRating'
      ]);

      // Set ranking rules for better relevance
      await this.productsIndex.updateRankingRules([
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'viewCount:desc'
      ]);

      this.logger.log('Meilisearch indexes initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Meilisearch indexes:', error.message);
    }
  }

  async indexProduct(product: Product) {
    if (!this.client || !this.productsIndex) {
      this.logger.warn('Meilisearch not available for indexing');
      return;
    }

    try {
      const indexableProduct = {
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        brand: product.brand,
        model: product.model,
        categoryId: product.categoryId,
        categoryName: product.category?.name,
        wholesalePrice: Number(product.wholesalePrice),
        retailPrice: product.retailPrice ? Number(product.retailPrice) : undefined,
        marketPrice: product.marketPrice ? Number(product.marketPrice) : undefined,
        condition: product.condition,
        status: product.status,
        supplier: product.supplier,
        stockQuantity: product.stockQuantity,
        primaryImageUrl: product.primaryImageUrl,
        tags: product.tags || [],
        averageRating: Number(product.averageRating),
        reviewCount: product.reviewCount,
        viewCount: product.viewCount || 0,
        createdAt: product.createdAt?.getTime(),
        updatedAt: product.updatedAt?.getTime(),
      };

      await this.productsIndex.addDocuments([indexableProduct]);
      this.logger.debug(`Product ${product.id} indexed in Meilisearch`);
    } catch (error) {
      this.logger.error(`Failed to index product ${product.id}:`, error.message);
    }
  }

  async indexProducts(products: Product[]) {
    if (!this.client || !this.productsIndex) {
      this.logger.warn('Meilisearch not available for bulk indexing');
      return;
    }

    try {
      const indexableProducts = products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        brand: product.brand,
        model: product.model,
        categoryId: product.categoryId,
        categoryName: product.category?.name,
        wholesalePrice: Number(product.wholesalePrice),
        retailPrice: product.retailPrice ? Number(product.retailPrice) : undefined,
        marketPrice: product.marketPrice ? Number(product.marketPrice) : undefined,
        condition: product.condition,
        status: product.status,
        supplier: product.supplier,
        stockQuantity: product.stockQuantity,
        primaryImageUrl: product.primaryImageUrl,
        tags: product.tags || [],
        averageRating: Number(product.averageRating),
        reviewCount: product.reviewCount,
        viewCount: product.viewCount || 0,
        createdAt: product.createdAt?.getTime(),
        updatedAt: product.updatedAt?.getTime(),
      }));

      await this.productsIndex.addDocuments(indexableProducts);
      this.logger.log(`${products.length} products indexed in Meilisearch`);
    } catch (error) {
      this.logger.error('Failed to bulk index products:', error.message);
    }
  }

  async removeProduct(productId: string) {
    if (!this.client || !this.productsIndex) {
      this.logger.warn('Meilisearch not available for removal');
      return;
    }

    try {
      await this.productsIndex.deleteDocument(productId);
      this.logger.debug(`Product ${productId} removed from Meilisearch`);
    } catch (error) {
      this.logger.error(`Failed to remove product ${productId}:`, error.message);
    }
  }

  async searchProducts(searchQuery: SearchQueryDto): Promise<SearchResultsDto | null> {
    if (!this.client || !this.productsIndex) {
      this.logger.warn('Meilisearch not available for search');
      return null;
    }

    try {
      const startTime = Date.now();

      // Build search parameters
      const searchParams: any = {
        limit: searchQuery.limit || 20,
        offset: ((searchQuery.page || 1) - 1) * (searchQuery.limit || 20),
        attributesToRetrieve: [
          'id',
          'name', 
          'description',
          'sku',
          'brand',
          'model',
          'categoryId',
          'categoryName',
          'wholesalePrice',
          'retailPrice',
          'marketPrice',
          'condition',
          'status',
          'supplier',
          'stockQuantity',
          'primaryImageUrl',
          'tags',
          'averageRating',
          'reviewCount'
        ],
      };

      // Build filters
      const filters = [];
      filters.push('status = "active"');

      if (searchQuery.categoryId) {
        filters.push(`categoryId = "${searchQuery.categoryId}"`);
      }

      if (searchQuery.brands && searchQuery.brands.length > 0) {
        const brandFilters = searchQuery.brands.map(brand => `brand = "${brand}"`);
        filters.push(`(${brandFilters.join(' OR ')})`);
      }

      if (searchQuery.condition) {
        filters.push(`condition = "${searchQuery.condition}"`);
      }

      if (searchQuery.priceRange) {
        if (searchQuery.priceRange.min !== undefined) {
          filters.push(`wholesalePrice >= ${searchQuery.priceRange.min}`);
        }
        if (searchQuery.priceRange.max !== undefined) {
          filters.push(`wholesalePrice <= ${searchQuery.priceRange.max}`);
        }
      }

      if (searchQuery.inStockOnly) {
        filters.push('stockQuantity > 0');
      }

      if (searchQuery.minRating !== undefined) {
        filters.push(`averageRating >= ${searchQuery.minRating}`);
      }

      if (searchQuery.tags && searchQuery.tags.length > 0) {
        const tagFilters = searchQuery.tags.map(tag => `tags = "${tag}"`);
        filters.push(`(${tagFilters.join(' OR ')})`);
      }

      if (filters.length > 0) {
        searchParams.filter = filters.join(' AND ');
      }

      // Add sorting
      if (searchQuery.sortBy) {
        switch (searchQuery.sortBy) {
          case 'price_asc':
            searchParams.sort = ['wholesalePrice:asc'];
            break;
          case 'price_desc':
            searchParams.sort = ['wholesalePrice:desc'];
            break;
          case 'name_asc':
            searchParams.sort = ['name:asc'];
            break;
          case 'name_desc':
            searchParams.sort = ['name:desc'];
            break;
          case 'newest':
            searchParams.sort = ['createdAt:desc'];
            break;
          case 'popularity':
            searchParams.sort = ['viewCount:desc'];
            break;
          case 'rating':
            searchParams.sort = ['averageRating:desc'];
            break;
        }
      }

      // Generate facets if requested
      if (searchQuery.includeFacets) {
        searchParams.facets = ['categoryName', 'brand', 'condition'];
      }

      // Perform search
      const searchResult = await this.productsIndex.search(
        searchQuery.q || '',
        searchParams
      );

      const searchTime = Date.now() - startTime;

      // Build response
      const result: SearchResultsDto = {
        products: searchResult.hits.map(this.mapMeiliHitToProduct),
        categories: [], // Not searching categories through Meilisearch for now
        total: searchResult.totalHits || 0,
        pagination: {
          page: searchQuery.page || 1,
          limit: searchQuery.limit || 20,
          total: searchResult.totalHits || 0,
          totalPages: Math.ceil((searchResult.totalHits || 0) / (searchQuery.limit || 20)),
          hasNext: ((searchQuery.page || 1) * (searchQuery.limit || 20)) < (searchResult.totalHits || 0),
          hasPrev: (searchQuery.page || 1) > 1,
        },
        searchTime,
        query: searchQuery.q || '',
      };

      // Add facets if requested
      if (searchQuery.includeFacets && searchResult.facetDistribution) {
        result.facets = this.buildFacetsFromMeili(searchResult.facetDistribution, searchQuery);
      }

      return result;

    } catch (error) {
      this.logger.error('Meilisearch search failed:', error.message);
      return null;
    }
  }

  private mapMeiliHitToProduct(hit: any) {
    return {
      id: hit.id,
      name: hit.name,
      description: hit.description,
      sku: hit.sku,
      brand: hit.brand,
      model: hit.model,
      categoryId: hit.categoryId,
      categoryName: hit.categoryName,
      wholesalePrice: hit.wholesalePrice,
      retailPrice: hit.retailPrice,
      marketPrice: hit.marketPrice,
      currency: 'JPY',
      condition: hit.condition,
      status: hit.status,
      supplier: hit.supplier,
      stockQuantity: hit.stockQuantity,
      primaryImageUrl: hit.primaryImageUrl,
      tags: hit.tags,
      averageRating: hit.averageRating,
      reviewCount: hit.reviewCount,
    };
  }

  private buildFacetsFromMeili(facetDistribution: any, searchQuery: SearchQueryDto) {
    const facets = [];

    if (facetDistribution.categoryName) {
      facets.push({
        name: 'category',
        label: 'カテゴリ',
        values: Object.entries(facetDistribution.categoryName).map(([name, count]) => ({
          value: name,
          count: count as number,
          selected: false, // Would need category mapping to check this properly
        })),
      });
    }

    if (facetDistribution.brand) {
      facets.push({
        name: 'brand',
        label: 'ブランド',
        values: Object.entries(facetDistribution.brand).map(([brand, count]) => ({
          value: brand,
          count: count as number,
          selected: searchQuery.brands?.includes(brand) || false,
        })),
      });
    }

    if (facetDistribution.condition) {
      facets.push({
        name: 'condition',
        label: '商品状態',
        values: Object.entries(facetDistribution.condition).map(([condition, count]) => ({
          value: condition,
          count: count as number,
          selected: searchQuery.condition === condition,
        })),
      });
    }

    return facets;
  }

  async rebuildIndex() {
    if (!this.client || !this.productsIndex) {
      this.logger.warn('Meilisearch not available for index rebuild');
      return;
    }

    try {
      await this.productsIndex.deleteAllDocuments();
      this.logger.log('Meilisearch index cleared for rebuild');
    } catch (error) {
      this.logger.error('Failed to rebuild Meilisearch index:', error.message);
    }
  }

  async getHealth(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.health();
      return true;
    } catch (error) {
      return false;
    }
  }
}