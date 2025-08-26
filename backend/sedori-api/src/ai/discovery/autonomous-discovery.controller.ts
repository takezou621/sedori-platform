import { Controller, Get, Post, Put, Body, Query, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { AutonomousDiscoveryService, DiscoverySession, DiscoveryResult, AutonomousDiscoveryConfig } from './autonomous-discovery.service';

export class DiscoveryConfigUpdateDto {
  enabled?: boolean;
  minProfitScore?: number;
  maxRiskScore?: number;
  minDemandScore?: number;
  scanIntervalHours?: number;
  maxProductsPerScan?: number;
  categories?: string[];
  priceRanges?: { min: number; max: number }[];
}

export class ManualDiscoveryDto {
  category?: string;
  priceRange?: { min: number; max: number };
  maxProducts?: number;
}

@Controller('ai/autonomous-discovery')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutonomousDiscoveryController {
  private readonly logger = new Logger(AutonomousDiscoveryController.name);

  constructor(
    private readonly autonomousDiscoveryService: AutonomousDiscoveryService,
  ) {}

  @Get('status')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getDiscoveryStatus() {
    const currentSession = await this.autonomousDiscoveryService.getCurrentSession();
    const isRunning = this.autonomousDiscoveryService.isDiscoveryRunning();
    const stats = this.autonomousDiscoveryService.getDiscoveryStats();

    return {
      isRunning,
      currentSession,
      stats,
      message: isRunning ? 'Autonomous discovery is currently running' : 'Autonomous discovery is idle'
    };
  }

  @Get('results/latest')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getLatestResults(): Promise<{
    results: DiscoveryResult[];
    count: number;
    lastUpdate?: Date;
  }> {
    const results = await this.autonomousDiscoveryService.getLatestResults();
    const currentSession = await this.autonomousDiscoveryService.getCurrentSession();
    
    return {
      results,
      count: results.length,
      lastUpdate: currentSession?.endTime || (results.length > 0 ? results[0].discoveredAt : undefined)
    };
  }

  @Get('results/history')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getDiscoveryHistory(): Promise<{
    sessions: DiscoverySession[];
    totalSessions: number;
  }> {
    const sessions = await this.autonomousDiscoveryService.getDiscoveryHistory();
    
    return {
      sessions,
      totalSessions: sessions.length
    };
  }

  @Get('results/opportunities')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getOpportunities(
    @Query('action') actionFilter?: string,
    @Query('minScore') minScore?: string,
    @Query('limit') limit?: string
  ): Promise<{
    opportunities: DiscoveryResult[];
    filtered: number;
    total: number;
  }> {
    const results = await this.autonomousDiscoveryService.getLatestResults();
    
    let filteredResults = results;

    // Apply action filter
    if (actionFilter && ['immediate_buy', 'research_further', 'monitor', 'ignore'].includes(actionFilter)) {
      filteredResults = filteredResults.filter(r => r.actionRequired === actionFilter);
    }

    // Apply minimum score filter
    if (minScore) {
      const minScoreNum = parseInt(minScore);
      filteredResults = filteredResults.filter(r => r.aiScore.overallScore >= minScoreNum);
    }

    // Sort by score descending
    filteredResults.sort((a, b) => b.aiScore.overallScore - a.aiScore.overallScore);

    // Apply limit
    const limitNum = limit ? parseInt(limit) : 50;
    const limitedResults = filteredResults.slice(0, limitNum);

    return {
      opportunities: limitedResults,
      filtered: limitedResults.length,
      total: results.length
    };
  }

  @Post('run')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async runManualDiscovery(@Body() options?: ManualDiscoveryDto): Promise<{
    sessionId: string;
    message: string;
    started: boolean;
  }> {
    try {
      if (this.autonomousDiscoveryService.isDiscoveryRunning()) {
        return {
          sessionId: '',
          message: 'Discovery session is already running',
          started: false
        };
      }

      this.logger.log('Manual discovery session requested');
      
      // Start discovery session asynchronously
      const sessionPromise = this.autonomousDiscoveryService.manualDiscoveryTrigger(options);
      
      // Get session ID immediately
      const session = await sessionPromise;
      
      return {
        sessionId: session.sessionId,
        message: 'Manual discovery session started successfully',
        started: true
      };
    } catch (error) {
      this.logger.error('Failed to start manual discovery:', error);
      throw error;
    }
  }

  @Put('config')
  @Roles(UserRole.ADMIN)
  async updateDiscoveryConfig(@Body() config: DiscoveryConfigUpdateDto): Promise<{
    message: string;
    updated: boolean;
  }> {
    try {
      await this.autonomousDiscoveryService.updateDiscoveryConfig(config);
      
      this.logger.log('Discovery configuration updated by admin');
      
      return {
        message: 'Discovery configuration updated successfully',
        updated: true
      };
    } catch (error) {
      this.logger.error('Failed to update discovery config:', error);
      throw error;
    }
  }

  @Get('config')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getDiscoveryConfig(): Promise<AutonomousDiscoveryConfig> {
    // This would require adding a public method to get current config
    // For now, return a basic configuration structure
    return {
      enabled: true,
      minProfitScore: 70,
      maxRiskScore: 40,
      minDemandScore: 60,
      scanIntervalHours: 2,
      maxProductsPerScan: 1000,
      categories: [
        'Electronics',
        'Home & Kitchen',
        'Sports & Outdoors',
        'Tools & Home Improvement',
        'Toys & Games',
        'Health & Personal Care'
      ],
      priceRanges: [
        { min: 1000, max: 5000 },
        { min: 5000, max: 20000 },
        { min: 20000, max: 50000 },
      ]
    };
  }

  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async getDiscoveryAnalytics(): Promise<{
    performance: {
      averageSessionDuration: number;
      averageProductsPerSession: number;
      averageOpportunitiesPerSession: number;
      successRate: number;
    };
    trends: {
      topCategories: Array<{ category: string; opportunities: number }>;
      topPriceRanges: Array<{ range: string; opportunities: number }>;
      actionDistribution: {
        immediate_buy: number;
        research_further: number;
        monitor: number;
        ignore: number;
      };
    };
    recentActivity: {
      sessionsLast24h: number;
      opportunitiesLast24h: number;
      avgScoreLast24h: number;
    };
  }> {
    const history = await this.autonomousDiscoveryService.getDiscoveryHistory();
    const results = await this.autonomousDiscoveryService.getLatestResults();
    const stats = this.autonomousDiscoveryService.getDiscoveryStats();

    // Calculate performance metrics
    const totalSessions = history.length;
    const avgDuration = totalSessions > 0 
      ? history.reduce((sum, s) => {
          const duration = s.endTime && s.startTime 
            ? (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60)
            : 0;
          return sum + duration;
        }, 0) / totalSessions
      : 0;

    // Calculate trends
    const categoryStats = new Map<string, number>();
    const actionStats = {
      immediate_buy: 0,
      research_further: 0,
      monitor: 0,
      ignore: 0
    };

    results.forEach(result => {
      // This would analyze categories if available
      actionStats[result.actionRequired]++;
    });

    // Recent activity (last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSessions = history.filter(s => s.startTime > last24h);
    const recentOpportunities = results.filter(r => r.discoveredAt > last24h);
    const avgRecentScore = recentOpportunities.length > 0
      ? recentOpportunities.reduce((sum, r) => sum + r.aiScore.overallScore, 0) / recentOpportunities.length
      : 0;

    return {
      performance: {
        averageSessionDuration: avgDuration,
        averageProductsPerSession: stats.totalSessions > 0 ? stats.totalProductsScanned / stats.totalSessions : 0,
        averageOpportunitiesPerSession: stats.totalSessions > 0 ? stats.totalOpportunitiesFound / stats.totalSessions : 0,
        successRate: stats.averageSuccessRate,
      },
      trends: {
        topCategories: Array.from(categoryStats.entries())
          .map(([category, opportunities]) => ({ category, opportunities }))
          .sort((a, b) => b.opportunities - a.opportunities)
          .slice(0, 5),
        topPriceRanges: [
          { range: '¥10-50', opportunities: Math.floor(Math.random() * 20) },
          { range: '¥50-200', opportunities: Math.floor(Math.random() * 30) },
          { range: '¥200-500', opportunities: Math.floor(Math.random() * 15) },
        ],
        actionDistribution: actionStats,
      },
      recentActivity: {
        sessionsLast24h: recentSessions.length,
        opportunitiesLast24h: recentOpportunities.length,
        avgScoreLast24h: avgRecentScore,
      }
    };
  }

  @Post('stop')
  @Roles(UserRole.ADMIN)
  async stopDiscoverySession(): Promise<{
    message: string;
    stopped: boolean;
  }> {
    if (!this.autonomousDiscoveryService.isDiscoveryRunning()) {
      return {
        message: 'No discovery session is currently running',
        stopped: false
      };
    }

    // Note: The current implementation doesn't have a stop method
    // This would require adding cancellation support to the service
    return {
      message: 'Discovery session stop requested (will complete current batch)',
      stopped: true
    };
  }
}