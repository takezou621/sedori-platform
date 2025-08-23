import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from '../../products/entities/product.entity';
import { MeilisearchService } from '../meilisearch.service';

@Injectable()
export class ProductIndexerService {
  private readonly logger = new Logger(ProductIndexerService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly meilisearchService: MeilisearchService,
  ) {}

  async indexAllProducts(): Promise<void> {
    this.logger.log('Starting full product indexing...');

    try {
      const products = await this.productRepository.find({
        relations: ['category'],
        where: { status: ProductStatus.ACTIVE },
      });

      await this.meilisearchService.indexProducts(products);

      this.logger.log(`Successfully indexed ${products.length} products`);
    } catch (error) {
      this.logger.error('Failed to index all products:', error.message);
      throw error;
    }
  }

  async indexProduct(productId: string): Promise<void> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
        relations: ['category'],
      });

      if (!product) {
        this.logger.warn(`Product ${productId} not found for indexing`);
        return;
      }

      await this.meilisearchService.indexProduct(product);
      this.logger.debug(`Successfully indexed product ${productId}`);
    } catch (error) {
      this.logger.error(`Failed to index product ${productId}:`, error.message);
      throw error;
    }
  }

  async removeProductFromIndex(productId: string): Promise<void> {
    try {
      await this.meilisearchService.removeProduct(productId);
      this.logger.debug(`Successfully removed product ${productId} from index`);
    } catch (error) {
      this.logger.error(
        `Failed to remove product ${productId} from index:`,
        error.message,
      );
      throw error;
    }
  }

  async reindexProducts(): Promise<void> {
    this.logger.log('Starting product reindexing...');

    try {
      // Clear existing index
      await this.meilisearchService.rebuildIndex();

      // Index all products again
      await this.indexAllProducts();

      this.logger.log('Product reindexing completed successfully');
    } catch (error) {
      this.logger.error('Failed to reindex products:', error.message);
      throw error;
    }
  }
}
