import { Controller, Get, Post, Body, Query, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { 
  SupplyChainOptimizerService,
  OptimizationResult,
  CashFlowForecast,
  ProcurementRecommendation,
  InventoryAdjustment,
  SupplierOptimization 
} from './supply-chain-optimizer.service';

export class OptimizationRequestDto {
  budget?: number;
  storageCapacity?: number;
  riskTolerance?: number; // 0-1
  timeHorizon?: number; // days
  optimizationType?: 'procurement' | 'inventory' | 'distribution' | 'full_chain';
}

export class CashFlowForecastDto {
  timeHorizon?: number; // days, default 90
  includeScenarios?: boolean;
  riskLevel?: 'conservative' | 'moderate' | 'aggressive';
}

@Controller('ai/supply-chain')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupplyChainOptimizerController {
  private readonly logger = new Logger(SupplyChainOptimizerController.name);

  constructor(
    private readonly supplyChainOptimizerService: SupplyChainOptimizerService,
  ) {}

  @Post('optimize')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async runOptimization(@Body() request: OptimizationRequestDto): Promise<{
    success: boolean;
    result?: OptimizationResult;
    error?: string;
  }> {
    try {
      this.logger.log('Supply chain optimization requested');
      
      const result = await this.supplyChainOptimizerService.runFullChainOptimization({
        budget: request.budget,
        storageCapacity: request.storageCapacity,
        riskTolerance: request.riskTolerance,
        timeHorizon: request.timeHorizon,
      });

      return {
        success: true,
        result
      };

    } catch (error) {
      this.logger.error('Supply chain optimization failed:', error);
      return {
        success: false,
        error: error.message || 'Optimization failed'
      };
    }
  }

  @Get('optimization/history')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getOptimizationHistory(): Promise<{
    optimizations: OptimizationResult[];
    summary: {
      totalOptimizations: number;
      averageSavings: number;
      totalSavings: number;
      averageImplementationTime: number;
    };
  }> {
    const optimizations = await this.supplyChainOptimizerService.getOptimizationHistory();
    
    const summary = {
      totalOptimizations: optimizations.length,
      averageSavings: optimizations.length > 0 
        ? optimizations.reduce((sum, opt) => sum + opt.performance.projectedSavings, 0) / optimizations.length
        : 0,
      totalSavings: optimizations.reduce((sum, opt) => sum + opt.performance.projectedSavings, 0),
      averageImplementationTime: optimizations.length > 0
        ? optimizations.reduce((sum, opt) => sum + opt.performance.timeToImplement, 0) / optimizations.length
        : 0,
    };

    return {
      optimizations,
      summary
    };
  }

  @Get('inventory/overview')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getInventoryOverview(): Promise<{
    overview: {
      totalItems: number;
      totalValue: number;
      lowStockAlerts: number;
      overStockAlerts: number;
      avgTurnoverRate: number;
    };
    recommendations: {
      criticalActions: number;
      potentialSavings: number;
      optimizationOpportunities: string[];
    };
  }> {
    const overview = await this.supplyChainOptimizerService.getInventoryOverview();
    
    // Generate recommendations based on overview
    const recommendations = {
      criticalActions: overview.lowStockAlerts + overview.overStockAlerts,
      potentialSavings: overview.totalValue * 0.15, // Estimate 15% potential savings
      optimizationOpportunities: [
        overview.lowStockAlerts > 0 ? `${overview.lowStockAlerts}件の在庫不足アラートを解決` : null,
        overview.overStockAlerts > 0 ? `${overview.overStockAlerts}件の過剰在庫を最適化` : null,
        overview.avgTurnoverRate < 6 ? '在庫回転率の改善が必要' : null,
        '自動リオーダーポイントの最適化',
        'サプライヤー交渉による仕入れコスト削減'
      ].filter((item): item is string => item !== null)
    };

    return {
      overview,
      recommendations
    };
  }

  @Post('cashflow/forecast')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async generateCashFlowForecast(@Body() request: CashFlowForecastDto): Promise<{
    forecast: CashFlowForecast[];
    summary: {
      totalInflow: number;
      totalOutflow: number;
      netCashFlow: number;
      riskPeriods: Array<{
        period: Date;
        riskLevel: 'low' | 'medium' | 'high';
        balance: number;
      }>;
    };
    recommendations: string[];
  }> {
    try {
      const timeHorizon = request.timeHorizon || 90;
      const forecast = await this.supplyChainOptimizerService.generateCashFlowForecast(timeHorizon);
      
      // Calculate summary metrics
      const totalInflow = forecast.reduce((sum, f) => sum + f.inflow, 0);
      const totalOutflow = forecast.reduce((sum, f) => sum + f.outflow, 0);
      const netCashFlow = totalInflow - totalOutflow;
      
      // Identify risk periods
      const riskPeriods = forecast
        .filter(f => f.projectedBalance < 1000000 || f.netFlow < -100000) // Balance < ¥1M or daily loss > ¥100K
        .map(f => ({
          period: f.period,
          riskLevel: (f.projectedBalance < 500000 ? 'high' : f.projectedBalance < 1000000 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
          balance: f.projectedBalance,
        }));

      // Generate recommendations
      const recommendations = [
        netCashFlow < 0 ? 'キャッシュフロー改善策が必要' : null,
        riskPeriods.length > 0 ? `${riskPeriods.length}期間でキャッシュフロー注意が必要` : null,
        totalOutflow > totalInflow * 0.9 ? '支出削減の検討が推奨' : null,
        '季節変動を考慮した資金計画の最適化',
        '支払条件交渉による資金繰り改善'
      ].filter((item): item is string => item !== null);

      return {
        forecast,
        summary: {
          totalInflow,
          totalOutflow,
          netCashFlow,
          riskPeriods,
        },
        recommendations,
      };

    } catch (error) {
      this.logger.error('Cash flow forecast failed:', error);
      throw error;
    }
  }

  @Get('procurement/recommendations')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getProcurementRecommendations(
    @Query('urgency') urgency?: string,
    @Query('minRoi') minRoi?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string
  ): Promise<{
    recommendations: ProcurementRecommendation[];
    summary: {
      totalInvestment: number;
      totalExpectedProfit: number;
      averageRoi: number;
      riskDistribution: {
        low: number;
        medium: number;
        high: number;
      };
    };
  }> {
    // This would get the latest procurement recommendations
    // For now, return simulated data based on the latest optimization
    const history = await this.supplyChainOptimizerService.getOptimizationHistory();
    const latestOptimization = history[history.length - 1];
    
    let recommendations = latestOptimization?.recommendations.procurement || [];
    
    // Apply filters
    if (urgency && ['critical', 'high', 'medium', 'low'].includes(urgency)) {
      recommendations = recommendations.filter(r => r.urgency === urgency);
    }
    
    if (minRoi) {
      const minRoiNum = parseFloat(minRoi);
      recommendations = recommendations.filter(r => r.financialImpact.roi >= minRoiNum);
    }
    
    const limitNum = limit ? parseInt(limit) : 20;
    recommendations = recommendations.slice(0, limitNum);
    
    // Calculate summary
    const totalInvestment = recommendations.reduce((sum, r) => sum + r.financialImpact.investmentRequired, 0);
    const totalExpectedProfit = recommendations.reduce((sum, r) => sum + r.financialImpact.expectedProfit, 0);
    const averageRoi = recommendations.length > 0 
      ? recommendations.reduce((sum, r) => sum + r.financialImpact.roi, 0) / recommendations.length
      : 0;
    
    const riskDistribution = {
      low: recommendations.filter(r => r.riskAssessment.overallRisk <= 0.3).length,
      medium: recommendations.filter(r => r.riskAssessment.overallRisk > 0.3 && r.riskAssessment.overallRisk <= 0.7).length,
      high: recommendations.filter(r => r.riskAssessment.overallRisk > 0.7).length,
    };

    return {
      recommendations,
      summary: {
        totalInvestment,
        totalExpectedProfit,
        averageRoi: Math.round(averageRoi * 10000) / 100, // Convert to percentage
        riskDistribution,
      }
    };
  }

  @Get('suppliers/performance')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getSupplierPerformance(): Promise<{
    suppliers: Array<{
      supplierId: string;
      name: string;
      performance: {
        reliabilityScore: number;
        qualityScore: number;
        costEfficiency: number;
        onTimeDelivery: number;
      };
      recommendations: string[];
      riskLevel: 'low' | 'medium' | 'high';
    }>;
    summary: {
      totalSuppliers: number;
      averagePerformance: number;
      underperformingSuppliers: number;
      recommendedActions: string[];
    };
  }> {
    const supplierReport = await this.supplyChainOptimizerService.getSupplierPerformanceReport();
    
    const suppliers = supplierReport.map(report => {
      const avgPerformance = (report.performance.onTimeDeliveryRate + 
                            (1 - report.performance.defectRate) + 
                            report.performance.costEfficiency) / 3;
      
      return {
        supplierId: report.supplier.id,
        name: report.supplier.name,
        performance: {
          reliabilityScore: report.performance.onTimeDeliveryRate,
          qualityScore: 1 - report.performance.defectRate,
          costEfficiency: report.performance.costEfficiency,
          onTimeDelivery: report.performance.onTimeDeliveryRate,
        },
        recommendations: report.recommendations,
        riskLevel: (avgPerformance >= 0.8 ? 'low' : avgPerformance >= 0.6 ? 'medium' : 'high') as 'low' | 'medium' | 'high',
      };
    });

    const summary = {
      totalSuppliers: suppliers.length,
      averagePerformance: suppliers.reduce((sum, s) => 
        sum + (s.performance.reliabilityScore + s.performance.qualityScore + s.performance.costEfficiency) / 3, 0
      ) / suppliers.length,
      underperformingSuppliers: suppliers.filter(s => s.riskLevel === 'high').length,
      recommendedActions: [
        suppliers.filter(s => s.riskLevel === 'high').length > 0 ? 'パフォーマンス不良サプライヤーとの交渉' : null,
        'コスト効率改善の取り組み',
        '品質管理プロセスの強化',
        'サプライヤー多様化の検討'
      ].filter((item): item is string => item !== null),
    };

    return {
      suppliers,
      summary,
    };
  }

  @Get('analytics/efficiency-metrics')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getEfficiencyMetrics(): Promise<{
    metrics: {
      inventoryTurnover: number;
      cashConversionCycle: number;
      supplierLeadTime: number;
      orderFulfillmentRate: number;
      costReduction: number;
      demandForecastAccuracy: number;
    };
    trends: {
      inventoryOptimization: 'improving' | 'stable' | 'declining';
      supplierPerformance: 'improving' | 'stable' | 'declining';
      costManagement: 'improving' | 'stable' | 'declining';
    };
    benchmarks: {
      industryAverage: {
        inventoryTurnover: number;
        orderFulfillmentRate: number;
        supplierLeadTime: number;
      };
      yourPerformance: 'above_average' | 'average' | 'below_average';
    };
  }> {
    // This would calculate real efficiency metrics
    // For now, return simulated metrics
    
    return {
      metrics: {
        inventoryTurnover: 8.3,
        cashConversionCycle: 45.2, // days
        supplierLeadTime: 5.8, // days
        orderFulfillmentRate: 0.94,
        costReduction: 12.5, // percentage
        demandForecastAccuracy: 0.82,
      },
      trends: {
        inventoryOptimization: 'improving',
        supplierPerformance: 'stable',
        costManagement: 'improving',
      },
      benchmarks: {
        industryAverage: {
          inventoryTurnover: 6.5,
          orderFulfillmentRate: 0.89,
          supplierLeadTime: 7.2,
        },
        yourPerformance: 'above_average',
      }
    };
  }

  @Post('alerts/setup')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async setupSupplyChainAlert(@Body() alertConfig: {
    type: 'low_stock' | 'supplier_performance' | 'cash_flow' | 'demand_spike';
    threshold: number;
    products?: string[];
    suppliers?: string[];
    notificationMethod: 'email' | 'webhook' | 'dashboard';
    active: boolean;
  }): Promise<{
    success: boolean;
    alertId?: string;
    message: string;
  }> {
    try {
      const alertId = `sc_alert_${Date.now()}_${alertConfig.type}`;
      
      this.logger.log(`Supply chain alert setup: ${alertConfig.type} - ${alertId}`);
      
      // In a real implementation, this would:
      // 1. Store the alert configuration
      // 2. Set up monitoring for the specified metrics
      // 3. Create notification triggers
      
      return {
        success: true,
        alertId,
        message: 'Supply chain alert configured successfully'
      };
    } catch (error) {
      this.logger.error('Failed to setup supply chain alert:', error);
      return {
        success: false,
        message: error.message || 'Failed to setup alert'
      };
    }
  }

  @Get('reports/roi-analysis')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getRoiAnalysis(@Query('period') period?: string): Promise<{
    analysis: {
      totalInvestment: number;
      totalReturn: number;
      netRoi: number;
      paybackPeriod: number; // months
    };
    breakdown: {
      procurement: { investment: number; return: number; roi: number };
      inventory: { investment: number; return: number; roi: number };
      suppliers: { investment: number; return: number; roi: number };
    };
    projections: {
      next3Months: { expectedRoi: number; confidence: number };
      next6Months: { expectedRoi: number; confidence: number };
      next12Months: { expectedRoi: number; confidence: number };
    };
  }> {
    // This would analyze actual ROI from supply chain optimizations
    // For now, return simulated ROI analysis
    
    const totalInvestment = 5000000; // ¥5M invested
    const totalReturn = 6500000; // ¥6.5M returned
    const netRoi = (totalReturn - totalInvestment) / totalInvestment;
    
    return {
      analysis: {
        totalInvestment,
        totalReturn,
        netRoi: Math.round(netRoi * 10000) / 100, // Convert to percentage
        paybackPeriod: 8.2, // months
      },
      breakdown: {
        procurement: {
          investment: 2500000,
          return: 3400000,
          roi: 36.0,
        },
        inventory: {
          investment: 1500000,
          return: 1950000,
          roi: 30.0,
        },
        suppliers: {
          investment: 1000000,
          return: 1150000,
          roi: 15.0,
        },
      },
      projections: {
        next3Months: { expectedRoi: 28.5, confidence: 0.82 },
        next6Months: { expectedRoi: 32.1, confidence: 0.75 },
        next12Months: { expectedRoi: 38.7, confidence: 0.68 },
      }
    };
  }
}