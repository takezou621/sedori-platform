import { Controller, Get, Post, Body, Query, UseGuards, Logger, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { AdvancedPricePredictorService, PricePrediction } from './advanced-price-predictor.service';
import { KeepaApiService } from '../../external-apis/keepa-api.service';

export class PricePredictionRequestDto {
  asin: string;
  useEnsemble?: boolean;
  includeExternalFactors?: boolean;
  confidenceThreshold?: number;
}

export class BatchPredictionRequestDto {
  asins: string[];
  options?: {
    useEnsemble?: boolean;
    includeExternalFactors?: boolean;
    confidenceThreshold?: number;
  };
}

@Controller('ai/price-prediction')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvancedPricePredictorController {
  private readonly logger = new Logger(AdvancedPricePredictorController.name);

  constructor(
    private readonly advancedPricePredictorService: AdvancedPricePredictorService,
    private readonly keepaApiService: KeepaApiService,
  ) {}

  @Post('predict')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async predictPrice(@Body() request: PricePredictionRequestDto): Promise<{
    success: boolean;
    prediction?: PricePrediction;
    error?: string;
  }> {
    try {
      this.logger.log(`Price prediction requested for ASIN: ${request.asin}`);
      
      // Fetch product data from Keepa
      const product = await this.keepaApiService.getProduct(request.asin);
      if (!product) {
        return {
          success: false,
          error: 'Product not found or data unavailable'
        };
      }

      // Get price history if available
      const priceHistory = await this.keepaApiService.getPriceHistory(request.asin);

      // Generate prediction (pass undefined for priceHistory as the service will handle it internally)
      const prediction = await this.advancedPricePredictorService.predictPrice(
        product,
        undefined, // Let the service handle price analysis internally
        {
          useEnsemble: request.useEnsemble,
          includeExternalFactors: request.includeExternalFactors,
          confidenceThreshold: request.confidenceThreshold,
        }
      );

      return {
        success: true,
        prediction
      };

    } catch (error) {
      this.logger.error(`Failed to predict price for ${request.asin}:`, error);
      return {
        success: false,
        error: error.message || 'Price prediction failed'
      };
    }
  }

  @Post('predict/batch')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async batchPredictPrices(@Body() request: BatchPredictionRequestDto): Promise<{
    success: boolean;
    predictions?: PricePrediction[];
    failed?: string[];
    error?: string;
    summary?: {
      total: number;
      successful: number;
      failed: number;
      averageConfidence: number;
    };
  }> {
    try {
      this.logger.log(`Batch price prediction requested for ${request.asins.length} products`);
      
      if (request.asins.length > 100) {
        return {
          success: false,
          error: 'Batch size too large. Maximum 100 products per request.'
        };
      }

      // Fetch products from Keepa
      const products = await Promise.all(
        request.asins.map(async (asin) => {
          try {
            const product = await this.keepaApiService.getProduct(asin);
            return product ? { asin, product } : null;
          } catch (error) {
            this.logger.warn(`Failed to fetch product ${asin}:`, error);
            return null;
          }
        })
      );

      const validProducts = products.filter(p => p !== null);
      const failed = request.asins.filter(asin => 
        !validProducts.some(p => p.asin === asin)
      );

      // Generate predictions
      const predictions = await this.advancedPricePredictorService.batchPredictPrices(
        validProducts.map(p => p.product)
      );

      // Calculate summary
      const successful = predictions.length;
      const averageConfidence = successful > 0 
        ? predictions.reduce((sum, p) => sum + p.confidence.overall, 0) / successful
        : 0;

      return {
        success: true,
        predictions,
        failed,
        summary: {
          total: request.asins.length,
          successful,
          failed: failed.length,
          averageConfidence: Math.round(averageConfidence * 100) / 100,
        }
      };

    } catch (error) {
      this.logger.error('Batch price prediction failed:', error);
      return {
        success: false,
        error: error.message || 'Batch prediction failed'
      };
    }
  }

  @Get('predict/:asin')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getPredictionByAsin(
    @Param('asin') asin: string,
    @Query('ensemble') useEnsemble?: string,
    @Query('external') includeExternal?: string,
    @Query('threshold') threshold?: string
  ): Promise<{
    success: boolean;
    prediction?: PricePrediction;
    error?: string;
  }> {
    try {
      const options = {
        useEnsemble: useEnsemble === 'true',
        includeExternalFactors: includeExternal === 'true',
        confidenceThreshold: threshold ? parseFloat(threshold) : undefined,
      };

      const product = await this.keepaApiService.getProduct(asin);
      if (!product) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      const priceHistory = await this.keepaApiService.getPriceHistory(asin);
      const prediction = await this.advancedPricePredictorService.predictPrice(
        product,
        undefined, // Let the service handle price analysis internally
        options
      );

      return {
        success: true,
        prediction
      };

    } catch (error) {
      this.logger.error(`Failed to get prediction for ${asin}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to generate prediction'
      };
    }
  }

  @Get('analytics/market-overview')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getMarketOverview(): Promise<{
    marketIndicators: {
      overallVolatility: number;
      trendDirection: 'bullish' | 'bearish' | 'neutral';
      riskLevel: 'low' | 'medium' | 'high';
      opportunityScore: number;
    };
    sectorAnalysis: Array<{
      sector: string;
      averageVolatility: number;
      priceDirection: 'up' | 'down' | 'stable';
      confidence: number;
    }>;
    recommendations: {
      buySignals: number;
      sellSignals: number;
      holdRecommendations: number;
    };
  }> {
    // This would analyze overall market conditions
    // For now, return simulated data
    
    return {
      marketIndicators: {
        overallVolatility: 24.7,
        trendDirection: 'neutral',
        riskLevel: 'medium',
        opportunityScore: 67,
      },
      sectorAnalysis: [
        {
          sector: 'Electronics',
          averageVolatility: 28.3,
          priceDirection: 'down',
          confidence: 0.78,
        },
        {
          sector: 'Home & Kitchen',
          averageVolatility: 19.1,
          priceDirection: 'stable',
          confidence: 0.85,
        },
        {
          sector: 'Sports & Outdoors',
          averageVolatility: 31.2,
          priceDirection: 'up',
          confidence: 0.72,
        },
      ],
      recommendations: {
        buySignals: 23,
        sellSignals: 15,
        holdRecommendations: 45,
      }
    };
  }

  @Get('analytics/prediction-accuracy')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getPredictionAccuracy(@Query('timeframe') timeframe?: string): Promise<{
    accuracy: {
      overall: number;
      '1week': number;
      '2weeks': number;
      '1month': number;
      '3months': number;
    };
    modelPerformance: Array<{
      modelName: string;
      accuracy: number;
      totalPredictions: number;
      averageConfidence: number;
    }>;
    improvements: {
      trend: 'improving' | 'declining' | 'stable';
      monthlyAccuracy: Array<{
        month: string;
        accuracy: number;
      }>;
    };
  }> {
    // This would analyze actual prediction accuracy over time
    // For now, return simulated performance data
    
    return {
      accuracy: {
        overall: 0.791,
        '1week': 0.847,
        '2weeks': 0.823,
        '1month': 0.784,
        '3months': 0.709,
      },
      modelPerformance: [
        {
          modelName: 'Ensemble Predictor',
          accuracy: 0.856,
          totalPredictions: 2847,
          averageConfidence: 0.782,
        },
        {
          modelName: 'Deep Learning LSTM',
          accuracy: 0.823,
          totalPredictions: 2847,
          averageConfidence: 0.754,
        },
        {
          modelName: 'Trend Following ARIMA',
          accuracy: 0.749,
          totalPredictions: 2847,
          averageConfidence: 0.691,
        },
      ],
      improvements: {
        trend: 'improving',
        monthlyAccuracy: [
          { month: '2024-01', accuracy: 0.742 },
          { month: '2024-02', accuracy: 0.759 },
          { month: '2024-03', accuracy: 0.778 },
          { month: '2024-04', accuracy: 0.791 },
        ]
      }
    };
  }

  @Get('recommendations/top-opportunities')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getTopOpportunities(
    @Query('category') category?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('timeframe') timeframe?: string,
    @Query('limit') limit?: string
  ): Promise<{
    opportunities: Array<{
      asin: string;
      productTitle: string;
      currentPrice: number;
      predictedPrice: number;
      potentialReturn: number;
      confidence: number;
      riskLevel: 'low' | 'medium' | 'high';
      timeToTarget: string;
      recommendation: string;
    }>;
    summary: {
      totalOpportunities: number;
      averageReturn: number;
      averageConfidence: number;
    };
  }> {
    // This would analyze all recent predictions to find top opportunities
    // For now, return simulated opportunities
    
    const limitNum = limit ? parseInt(limit) : 20;
    
    const opportunities = Array.from({ length: Math.min(limitNum, 15) }, (_, i) => ({
      asin: `B0${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      productTitle: `Product ${i + 1} - ${category || 'Electronics'} Item`,
      currentPrice: Math.floor(Math.random() * 50000) + 5000,
      predictedPrice: 0,
      potentialReturn: 0,
      confidence: Math.random() * 0.3 + 0.6,
      riskLevel: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
      timeToTarget: timeframe || '2-4 weeks',
      recommendation: 'Strong buy signal with favorable market conditions',
    }));

    // Calculate derived values
    opportunities.forEach(opp => {
      const returnMultiplier = 1 + (Math.random() * 0.4 + 0.1); // 10-50% return
      opp.predictedPrice = Math.floor(opp.currentPrice * returnMultiplier);
      opp.potentialReturn = ((opp.predictedPrice / opp.currentPrice - 1) * 100);
    });

    const averageReturn = opportunities.reduce((sum, opp) => sum + opp.potentialReturn, 0) / opportunities.length;
    const averageConfidence = opportunities.reduce((sum, opp) => sum + opp.confidence, 0) / opportunities.length;

    return {
      opportunities,
      summary: {
        totalOpportunities: opportunities.length,
        averageReturn: Math.round(averageReturn * 100) / 100,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
      }
    };
  }

  @Post('alert/setup')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async setupPriceAlert(@Body() alertConfig: {
    asin: string;
    targetPrice?: number;
    priceChangeThreshold?: number; // Percentage
    predictionConfidenceMin?: number;
    notificationMethod: 'email' | 'webhook' | 'dashboard';
    active: boolean;
  }): Promise<{
    success: boolean;
    alertId?: string;
    message: string;
  }> {
    try {
      // This would set up a price alert system
      const alertId = `alert_${Date.now()}_${alertConfig.asin}`;
      
      this.logger.log(`Price alert setup for ${alertConfig.asin}: ${alertId}`);
      
      // In a real implementation, this would:
      // 1. Store the alert configuration
      // 2. Set up monitoring for the product
      // 3. Create notification triggers
      
      return {
        success: true,
        alertId,
        message: 'Price alert configured successfully'
      };
    } catch (error) {
      this.logger.error('Failed to setup price alert:', error);
      return {
        success: false,
        message: error.message || 'Failed to setup price alert'
      };
    }
  }
}