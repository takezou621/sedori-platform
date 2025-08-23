import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from '../../products/entities/product.entity';
import { MarketDataService } from '../market-data.service';

@Injectable()
export class PriceUpdateScheduler {
  private readonly logger = new Logger(PriceUpdateScheduler.name);
  private isUpdating = false;
  private readonly batchSize = 50;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly marketDataService: MarketDataService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async updateMarketPrices(): Promise<void> {
    if (this.isUpdating) {
      this.logger.warn('Price update already in progress, skipping...');
      return;
    }

    this.isUpdating = true;
    this.logger.log('Starting scheduled price update');

    try {
      let offset = 0;
      let totalUpdated = 0;
      let totalErrors = 0;

      while (true) {
        // Get batch of active products
        const products = await this.productRepository.find({
          where: { status: ProductStatus.ACTIVE },
          take: this.batchSize,
          skip: offset,
          order: { updatedAt: 'ASC' }, // Update oldest first
        });

        if (products.length === 0) {
          break;
        }

        // Update prices for this batch
        for (const product of products) {
          try {
            await this.updateProductMarketData(product);
            totalUpdated++;

            // Small delay to avoid API rate limits
            await this.sleep(200);
          } catch (error) {
            this.logger.error(
              `Failed to update price for product ${product.id}:`,
              error.message,
            );
            totalErrors++;
          }
        }

        offset += this.batchSize;
        this.logger.log(`Processed ${offset} products...`);

        // Longer delay between batches
        await this.sleep(2000);
      }

      this.logger.log(
        `Price update completed. Updated: ${totalUpdated}, Errors: ${totalErrors}`,
      );
    } catch (error) {
      this.logger.error('Price update scheduler failed:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  @Cron('0 9 * * 1') // Every Monday at 9 AM
  async updateTrendingProducts(): Promise<void> {
    this.logger.log('Starting trending products update');

    try {
      // Get products with high view counts or recent activity
      const trendingProducts = await this.productRepository
        .createQueryBuilder('product')
        .where('product.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere(
          '(product.viewCount > 100 OR product.updatedAt > :recentDate)',
          {
            recentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        )
        .orderBy('product.viewCount', 'DESC')
        .take(100)
        .getMany();

      let updated = 0;
      for (const product of trendingProducts) {
        try {
          await this.updateProductMarketData(product, true);
          updated++;
          await this.sleep(500); // Longer delay for thorough analysis
        } catch (error) {
          this.logger.error(
            `Failed to update trending product ${product.id}:`,
            error.message,
          );
        }
      }

      this.logger.log(`Updated ${updated} trending products`);
    } catch (error) {
      this.logger.error('Trending products update failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async quickPriceCheck(): Promise<void> {
    try {
      // Quick check for products that need urgent price updates
      // (e.g., products with significant price changes or alerts)
      const urgentProducts = await this.productRepository
        .createQueryBuilder('product')
        .where('product.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere('product.metadata ? :priceAlert', {
          priceAlert: 'priceAlert',
        })
        .take(10)
        .getMany();

      if (urgentProducts.length > 0) {
        this.logger.log(
          `Processing ${urgentProducts.length} urgent price updates`,
        );

        for (const product of urgentProducts) {
          try {
            await this.updateProductMarketData(product);

            // Remove price alert flag after update
            if (product.metadata && product.metadata.priceAlert) {
              delete product.metadata.priceAlert;
              await this.productRepository.save(product);
            }

            await this.sleep(100);
          } catch (error) {
            this.logger.error(
              `Failed to update urgent product ${product.id}:`,
              error.message,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Quick price check failed:', error);
    }
  }

  private async updateProductMarketData(
    product: Product,
    thoroughAnalysis: boolean = false,
  ): Promise<void> {
    try {
      // Get latest market analysis
      const marketAnalysis =
        await this.marketDataService.analyzeMarket(product);

      // Update product with new market data
      const updatedMetadata = {
        ...product.metadata,
        lastPriceUpdate: new Date().toISOString(),
        competitorPriceCount: marketAnalysis.competitorPrices.length,
        avgCompetitorPrice:
          marketAnalysis.competitorPrices.length > 0
            ? marketAnalysis.competitorPrices.reduce(
                (sum, p) => sum + p.price,
                0,
              ) / marketAnalysis.competitorPrices.length
            : null,
        demandScore: marketAnalysis.demandScore,
        trendIndicator: marketAnalysis.trendIndicator,
        priceVolatility: marketAnalysis.priceVolatility,
      };

      // Update market price with recommended price range midpoint
      const newMarketPrice = marketAnalysis.recommendedPriceRange
        ? (marketAnalysis.recommendedPriceRange.min +
            marketAnalysis.recommendedPriceRange.max) /
          2
        : null;

      const updates: Partial<Product> = {
        metadata: updatedMetadata,
        updatedAt: new Date(),
      };

      if (newMarketPrice && newMarketPrice > 0) {
        updates.marketPrice = newMarketPrice;
      }

      await this.productRepository.update(product.id, updates);

      if (thoroughAnalysis) {
        this.logger.debug(
          `Updated product ${product.id} with thorough market analysis. ` +
            `Demand Score: ${marketAnalysis.demandScore}, ` +
            `Trend: ${marketAnalysis.trendIndicator}, ` +
            `Volatility: ${marketAnalysis.priceVolatility}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update market data for product ${product.id}:`,
        error.message,
      );
      throw error;
    }
  }

  async triggerManualPriceUpdate(productId: string): Promise<void> {
    this.logger.log(`Manual price update triggered for product ${productId}`);

    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      await this.updateProductMarketData(product, true);
      this.logger.log(`Manual price update completed for product ${productId}`);
    } catch (error) {
      this.logger.error(
        `Manual price update failed for product ${productId}:`,
        error,
      );
      throw error;
    }
  }

  async getUpdateStatus(): Promise<{
    isUpdating: boolean;
    lastUpdate: Date | null;
    nextScheduledUpdate: Date;
  }> {
    try {
      // Get timestamp of last updated product
      const lastUpdatedProduct = await this.productRepository
        .createQueryBuilder('product')
        .orderBy('product.updatedAt', 'DESC')
        .take(1)
        .getOne();

      // Calculate next scheduled update (every 6 hours)
      const now = new Date();
      const nextUpdate = new Date(now);
      nextUpdate.setHours(Math.ceil(now.getHours() / 6) * 6, 0, 0, 0);

      return {
        isUpdating: this.isUpdating,
        lastUpdate: lastUpdatedProduct?.updatedAt || null,
        nextScheduledUpdate: nextUpdate,
      };
    } catch (error) {
      this.logger.error('Failed to get update status:', error);
      return {
        isUpdating: this.isUpdating,
        lastUpdate: null,
        nextScheduledUpdate: new Date(),
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
