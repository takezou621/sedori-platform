import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { OptimizationService } from './optimization.service';
import { OptimizationController } from './optimization.controller';
import { OptimizationResult } from './entities/optimization-result.entity';
import { Product } from '../products/entities/product.entity';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ExternalApisModule } from '../external-apis/external-apis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OptimizationResult, Product]),
    ThrottlerModule,
    AnalyticsModule,
    ExternalApisModule,
  ],
  controllers: [OptimizationController],
  providers: [OptimizationService],
  exports: [OptimizationService],
})
export class OptimizationModule {}