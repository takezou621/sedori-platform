import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpStatus,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { IntelligentSyncService } from '../sync/intelligent-sync.service';
import { ResourceOptimizerService } from './resource-optimizer.service';

@Controller('ai/optimization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OptimizationController {
  constructor(
    private readonly intelligentSyncService: IntelligentSyncService,
    private readonly resourceOptimizerService: ResourceOptimizerService,
  ) {}

  @Get('sync/metrics')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getSyncMetrics() {
    try {
      const metrics = await this.intelligentSyncService.getSyncMetrics();
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get sync metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sync/queue')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getSyncQueue() {
    try {
      const queue = await this.intelligentSyncService.getSyncQueue();
      return {
        success: true,
        data: queue,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get sync queue',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sync/optimize')
  @Roles(UserRole.ADMIN)
  async optimizeSync() {
    try {
      await this.intelligentSyncService.optimizeSyncSchedule();
      return {
        success: true,
        message: 'Sync optimization completed',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to optimize sync',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sync/force/:productId')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async forceSyncProduct(@Param('productId') productId: string) {
    try {
      const result = await this.intelligentSyncService.forceSyncProduct(productId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to force sync product ${productId}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sync/status/:productId')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.SELLER)
  async getSyncStatus(@Param('productId') productId: string) {
    try {
      const status = await this.intelligentSyncService.getSyncStatus(productId);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get sync status for product ${productId}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('resources/metrics')
  @Roles(UserRole.ADMIN)
  async getResourceMetrics() {
    try {
      const metrics = await this.resourceOptimizerService.getResourceMetrics();
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get resource metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('resources/recommendations')
  @Roles(UserRole.ADMIN)
  async getOptimizationRecommendations() {
    try {
      const recommendations = await this.resourceOptimizerService.getOptimizationRecommendations();
      return {
        success: true,
        data: recommendations,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get optimization recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('resources/optimize')
  @Roles(UserRole.ADMIN)
  async performResourceOptimization() {
    try {
      const result = await this.resourceOptimizerService.forceOptimization();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to perform resource optimization',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('resources/reset')
  @Roles(UserRole.ADMIN)
  async resetOptimizations() {
    try {
      await this.resourceOptimizerService.resetOptimizations();
      return {
        success: true,
        message: 'All optimizations reset successfully',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to reset optimizations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('resources/status')
  @Roles(UserRole.ADMIN)
  async getOptimizationStatus() {
    try {
      const status = await this.resourceOptimizerService.getOptimizationStatus();
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get optimization status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  async getOptimizationDashboard() {
    try {
      const [syncMetrics, resourceMetrics, syncQueue, recommendations, optimizationStatus] = await Promise.all([
        this.intelligentSyncService.getSyncMetrics(),
        this.resourceOptimizerService.getResourceMetrics(),
        this.intelligentSyncService.getSyncQueue(),
        this.resourceOptimizerService.getOptimizationRecommendations(),
        this.resourceOptimizerService.getOptimizationStatus(),
      ]);

      return {
        success: true,
        data: {
          sync: {
            metrics: syncMetrics,
            queue: syncQueue.slice(0, 10), // Top 10 items
          },
          resources: {
            metrics: resourceMetrics,
            recommendations,
            status: optimizationStatus,
          },
          summary: {
            totalOptimizations: optimizationStatus.appliedCount,
            syncQueueSize: syncQueue.length,
            criticalItems: syncQueue.filter(item => item.importance === 'critical').length,
            systemHealth: this.calculateSystemHealth(resourceMetrics),
          },
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get optimization dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private calculateSystemHealth(metrics: any): 'excellent' | 'good' | 'warning' | 'critical' {
    const cpuScore = metrics.cpu.usage < 50 ? 3 : metrics.cpu.usage < 70 ? 2 : metrics.cpu.usage < 90 ? 1 : 0;
    const memoryScore = metrics.memory.usage < 60 ? 3 : metrics.memory.usage < 80 ? 2 : metrics.memory.usage < 95 ? 1 : 0;
    const cacheScore = metrics.cache.hitRate > 85 ? 3 : metrics.cache.hitRate > 70 ? 2 : metrics.cache.hitRate > 50 ? 1 : 0;
    
    const totalScore = cpuScore + memoryScore + cacheScore;
    
    if (totalScore >= 8) return 'excellent';
    if (totalScore >= 6) return 'good';
    if (totalScore >= 3) return 'warning';
    return 'critical';
  }
}