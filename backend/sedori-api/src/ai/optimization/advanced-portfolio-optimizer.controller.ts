import { Controller, Get, Post, Body, Query, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { 
  AdvancedPortfolioOptimizerService,
} from './advanced-portfolio-optimizer.service';
import type { 
  PortfolioOptimizationRequest,
  OptimizationSolution 
} from './advanced-portfolio-optimizer.service';

@Controller('ai/portfolio-optimization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvancedPortfolioOptimizerController {
  private readonly logger = new Logger(AdvancedPortfolioOptimizerController.name);

  constructor(
    private readonly portfolioOptimizerService: AdvancedPortfolioOptimizerService,
  ) {}

  @Post('optimize')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async optimizePortfolio(@Body() request: PortfolioOptimizationRequest): Promise<{
    success: boolean;
    solution?: OptimizationSolution;
    error?: string;
  }> {
    try {
      this.logger.log('Quantum-level portfolio optimization requested');
      
      const solution = await this.portfolioOptimizerService.optimizePortfolio(request);

      return {
        success: true,
        solution
      };

    } catch (error) {
      this.logger.error('Portfolio optimization failed:', error);
      return {
        success: false,
        error: error.message || 'Optimization failed'
      };
    }
  }

  @Post('optimize/large-scale')
  @Roles(UserRole.ADMIN)
  async optimizeLargePortfolio(@Body() request: {
    products: Array<any>;
    constraints: any;
  }): Promise<{
    success: boolean;
    solution?: OptimizationSolution;
    message?: string;
  }> {
    try {
      this.logger.log(`Large-scale optimization for ${request.products.length} products`);
      
      if (request.products.length > 100000) {
        return {
          success: false,
          message: 'Portfolio too large. Maximum 100,000 products supported.'
        };
      }

      const solution = await this.portfolioOptimizerService.optimizeLargePortfolio(
        request.products,
        request.constraints
      );

      return {
        success: true,
        solution,
        message: `Successfully optimized portfolio of ${request.products.length} products using quantum-inspired algorithms`
      };

    } catch (error) {
      this.logger.error('Large-scale optimization failed:', error);
      return {
        success: false,
        message: error.message || 'Large-scale optimization failed'
      };
    }
  }

  @Get('algorithms/performance')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getAlgorithmPerformance(): Promise<any> {
    return await this.portfolioOptimizerService.getAlgorithmPerformance();
  }

  @Get('status/:problemId')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getOptimizationStatus(@Query('problemId') problemId: string): Promise<any> {
    return await this.portfolioOptimizerService.getOptimizationStatus(problemId);
  }
}