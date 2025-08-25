import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { AlertManagerService, SmartAlert, AlertNotification } from './alert-manager.service';
import { KeepaTrackingType } from '../external-apis/interfaces/keepa-data.interface';

// DTOs
class CreateSmartAlertDto {
  asin: string;
  desiredPrice: number;
  priceType?: KeepaTrackingType;
  intervalMinutes?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notificationChannels?: ('email' | 'sms' | 'push' | 'webhook')[];
  smartTriggerConditions?: {
    trendCondition?: 'rising' | 'falling' | 'stable';
    volatilityThreshold?: number;
    seasonalAdjustment?: boolean;
    marketContextRequired?: boolean;
  };
  smartSnoozing?: {
    enabled: boolean;
    conditions: string[];
    maxSnoozeTime: number;
  };
}

class UpdateSmartAlertDto {
  desiredPrice?: number;
  isActive?: boolean;
  intervalMinutes?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notificationChannels?: ('email' | 'sms' | 'push' | 'webhook')[];
  smartTriggerConditions?: {
    trendCondition?: 'rising' | 'falling' | 'stable';
    volatilityThreshold?: number;
    seasonalAdjustment?: boolean;
    marketContextRequired?: boolean;
  };
  smartSnoozing?: {
    enabled: boolean;
    conditions: string[];
    maxSnoozeTime: number;
  };
}

class AlertFeedbackDto {
  alertId: string;
  wasUseful: boolean;
  rating: number; // 1-5
  feedback?: string;
  actionTaken?: 'purchased' | 'ignored' | 'snoozed' | 'deleted';
}

class BulkAlertActionDto {
  alertIds: string[];
  action: 'pause' | 'resume' | 'delete' | 'update_priority';
  actionData?: any;
}

@ApiTags('Smart Alerts')
@ApiBearerAuth()
@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertManagerService: AlertManagerService) {}

  @Post()
  @ApiOperation({ summary: 'スマートアラート作成' })
  @ApiResponse({
    status: 201,
    description: 'アラート作成成功',
    schema: { type: 'object' }
  })
  @ApiResponse({ status: 400, description: 'リクエストパラメータエラー' })
  async createSmartAlert(
    @Body() createAlertDto: CreateSmartAlertDto,
    @GetUser() user: User,
  ): Promise<SmartAlert> {
    // Validate ASIN format
    if (!/^[A-Z0-9]{10}$/.test(createAlertDto.asin)) {
      throw new BadRequestException('無効なASIN形式です');
    }

    // Validate price
    if (createAlertDto.desiredPrice <= 0) {
      throw new BadRequestException('価格は0より大きい値を設定してください');
    }

    // Check user's alert limit (business rule)
    const userAlerts = await this.alertManagerService.getUserAlerts(user.id);
    const maxAlerts = this.getMaxAlertsForUser(user);
    
    if (userAlerts.length >= maxAlerts) {
      throw new BadRequestException(`アラート作成上限に達しています（最大${maxAlerts}件）`);
    }

    const alertData: Partial<SmartAlert> = {
      ...createAlertDto,
      userId: user.id,
      domain: 1, // Default to Amazon.com
      smartTriggerConditions: createAlertDto.smartTriggerConditions ? {
        priceTarget: createAlertDto.desiredPrice,
        ...createAlertDto.smartTriggerConditions,
      } : undefined,
    };

    return this.alertManagerService.createSmartAlert(alertData);
  }

  @Get()
  @ApiOperation({ summary: 'ユーザーのアラート一覧取得' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'paused', 'all'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['low', 'medium', 'high', 'urgent'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'アラート一覧取得成功',
    schema: {
      type: 'object',
      properties: {
        alerts: { type: 'array' },
        pagination: { type: 'object' },
        summary: { type: 'object' },
      }
    }
  })
  async getUserAlerts(
    @GetUser() user: User,
    @Query('status') status: 'active' | 'paused' | 'all' = 'all',
    @Query('priority') priority?: 'low' | 'medium' | 'high' | 'urgent',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    let alerts = await this.alertManagerService.getUserAlerts(user.id);

    // Apply filters
    if (status !== 'all') {
      alerts = alerts.filter(alert => 
        status === 'active' ? alert.isActive : !alert.isActive
      );
    }

    if (priority) {
      alerts = alerts.filter(alert => alert.priority === priority);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedAlerts = alerts.slice(startIndex, startIndex + limit);

    // Summary statistics
    const summary = {
      total: alerts.length,
      active: alerts.filter(a => a.isActive).length,
      paused: alerts.filter(a => !a.isActive).length,
      byPriority: {
        urgent: alerts.filter(a => a.priority === 'urgent').length,
        high: alerts.filter(a => a.priority === 'high').length,
        medium: alerts.filter(a => a.priority === 'medium').length,
        low: alerts.filter(a => a.priority === 'low').length,
      },
      avgProbabilityOfTrigger: this.calculateAverageProbability(alerts),
    };

    return {
      alerts: paginatedAlerts,
      pagination: {
        page,
        limit,
        total: alerts.length,
        pages: Math.ceil(alerts.length / limit),
      },
      summary,
    };
  }

  @Get(':alertId')
  @ApiOperation({ summary: 'アラート詳細取得' })
  @ApiParam({ name: 'alertId', description: 'アラートID' })
  @ApiResponse({
    status: 200,
    description: 'アラート詳細取得成功',
    schema: { type: 'object' }
  })
  @ApiResponse({ status: 404, description: 'アラートが見つかりません' })
  async getAlert(
    @Param('alertId') alertId: string,
    @GetUser() user: User,
  ): Promise<SmartAlert> {
    const alert = await this.alertManagerService.getAlert(alertId);
    
    if (!alert) {
      throw new NotFoundException(`アラートが見つかりません: ${alertId}`);
    }

    // Check ownership
    if (alert.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('このアラートにアクセスする権限がありません');
    }

    return alert;
  }

  @Put(':alertId')
  @ApiOperation({ summary: 'アラート更新' })
  @ApiParam({ name: 'alertId', description: 'アラートID' })
  @ApiResponse({
    status: 200,
    description: 'アラート更新成功',
    schema: { type: 'object' }
  })
  @ApiResponse({ status: 404, description: 'アラートが見つかりません' })
  async updateAlert(
    @Param('alertId') alertId: string,
    @Body() updateAlertDto: UpdateSmartAlertDto,
    @GetUser() user: User,
  ): Promise<SmartAlert> {
    const alert = await this.alertManagerService.getAlert(alertId);
    
    if (!alert) {
      throw new NotFoundException(`アラートが見つかりません: ${alertId}`);
    }

    // Check ownership
    if (alert.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('このアラートを更新する権限がありません');
    }

    // Validate updated price if provided
    if (updateAlertDto.desiredPrice !== undefined && updateAlertDto.desiredPrice <= 0) {
      throw new BadRequestException('価格は0より大きい値を設定してください');
    }

    const updateData: Partial<SmartAlert> = {
      ...updateAlertDto,
      smartTriggerConditions: updateAlertDto.smartTriggerConditions ? {
        priceTarget: updateAlertDto.desiredPrice || alert.desiredPrice,
        ...updateAlertDto.smartTriggerConditions,
      } : alert.smartTriggerConditions,
    };

    return this.alertManagerService.updateAlert(alertId, updateData);
  }

  @Delete(':alertId')
  @ApiOperation({ summary: 'アラート削除' })
  @ApiParam({ name: 'alertId', description: 'アラートID' })
  @ApiResponse({ status: 200, description: 'アラート削除成功' })
  @ApiResponse({ status: 404, description: 'アラートが見つかりません' })
  async deleteAlert(
    @Param('alertId') alertId: string,
    @GetUser() user: User,
  ): Promise<{ message: string }> {
    const alert = await this.alertManagerService.getAlert(alertId);
    
    if (!alert) {
      throw new NotFoundException(`アラートが見つかりません: ${alertId}`);
    }

    // Check ownership
    if (alert.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('このアラートを削除する権限がありません');
    }

    await this.alertManagerService.deleteAlert(alertId);
    return { message: 'アラートを削除しました' };
  }

  @Post(':alertId/pause')
  @ApiOperation({ summary: 'アラート一時停止' })
  @ApiParam({ name: 'alertId', description: 'アラートID' })
  @ApiQuery({ name: 'duration', required: false, type: Number, description: '停止時間（分）' })
  @ApiResponse({ status: 200, description: 'アラート一時停止成功' })
  async pauseAlert(
    @Param('alertId') alertId: string,
    @GetUser() user: User,
    @Query('duration') duration?: number,
  ): Promise<{ message: string }> {
    const alert = await this.alertManagerService.getAlert(alertId);
    
    if (!alert) {
      throw new NotFoundException(`アラートが見つかりません: ${alertId}`);
    }

    // Check ownership
    if (alert.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('このアラートを操作する権限がありません');
    }

    await this.alertManagerService.pauseAlert(alertId, duration);
    
    const message = duration 
      ? `アラートを${duration}分間一時停止しました`
      : 'アラートを一時停止しました';
      
    return { message };
  }

  @Post(':alertId/resume')
  @ApiOperation({ summary: 'アラート再開' })
  @ApiParam({ name: 'alertId', description: 'アラートID' })
  @ApiResponse({ status: 200, description: 'アラート再開成功' })
  async resumeAlert(
    @Param('alertId') alertId: string,
    @GetUser() user: User,
  ): Promise<{ message: string }> {
    const alert = await this.alertManagerService.getAlert(alertId);
    
    if (!alert) {
      throw new NotFoundException(`アラートが見つかりません: ${alertId}`);
    }

    // Check ownership
    if (alert.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('このアラートを操作する権限がありません');
    }

    await this.alertManagerService.updateAlert(alertId, { isActive: true });
    return { message: 'アラートを再開しました' };
  }

  @Post('bulk-actions')
  @ApiOperation({ summary: 'アラート一括操作' })
  @ApiResponse({ status: 200, description: '一括操作成功' })
  @ApiResponse({ status: 400, description: 'リクエストパラメータエラー' })
  async bulkAlertActions(
    @Body() bulkActionDto: BulkAlertActionDto,
    @GetUser() user: User,
  ): Promise<{ processed: number; failed: number; errors: any[] }> {
    if (!bulkActionDto.alertIds || bulkActionDto.alertIds.length === 0) {
      throw new BadRequestException('アラートIDリストが必要です');
    }

    if (bulkActionDto.alertIds.length > 100) {
      throw new BadRequestException('一度に操作できるのは100件までです');
    }

    let processed = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const alertId of bulkActionDto.alertIds) {
      try {
        const alert = await this.alertManagerService.getAlert(alertId);
        
        if (!alert) {
          errors.push({ alertId, error: 'アラートが見つかりません' });
          failed++;
          continue;
        }

        // Check ownership
        if (alert.userId !== user.id && user.role !== UserRole.ADMIN) {
          errors.push({ alertId, error: '権限がありません' });
          failed++;
          continue;
        }

        // Perform action
        switch (bulkActionDto.action) {
          case 'pause':
            await this.alertManagerService.pauseAlert(alertId);
            break;
          case 'resume':
            await this.alertManagerService.updateAlert(alertId, { isActive: true });
            break;
          case 'delete':
            await this.alertManagerService.deleteAlert(alertId);
            break;
          case 'update_priority':
            if (bulkActionDto.actionData?.priority) {
              await this.alertManagerService.updateAlert(alertId, {
                priority: bulkActionDto.actionData.priority
              });
            }
            break;
        }
        
        processed++;
      } catch (error) {
        errors.push({ alertId, error: error.message });
        failed++;
      }
    }

    return { processed, failed, errors };
  }

  @Post(':alertId/feedback')
  @ApiOperation({ summary: 'アラートフィードバック送信' })
  @ApiParam({ name: 'alertId', description: 'アラートID' })
  @ApiResponse({ status: 200, description: 'フィードバック送信成功' })
  async submitAlertFeedback(
    @Param('alertId') alertId: string,
    @Body() feedbackDto: AlertFeedbackDto,
    @GetUser() user: User,
  ): Promise<{ message: string }> {
    const alert = await this.alertManagerService.getAlert(alertId);
    
    if (!alert) {
      throw new NotFoundException(`アラートが見つかりません: ${alertId}`);
    }

    // Check ownership
    if (alert.userId !== user.id) {
      throw new ForbiddenException('このアラートにアクセスする権限がありません');
    }

    // Store feedback (implementation would save to database)
    // This helps improve AI accuracy over time
    
    return { message: 'フィードバックを送信しました' };
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'アラート分析サマリー' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['7d', '30d', '90d'] })
  @ApiResponse({
    status: 200,
    description: '分析サマリー取得成功',
    schema: {
      type: 'object',
      properties: {
        totalAlerts: { type: 'number' },
        triggeredAlerts: { type: 'number' },
        accuracy: { type: 'number' },
        avgResponseTime: { type: 'number' },
        topPerformingCategories: { type: 'array' },
      }
    }
  })
  async getAlertAnalytics(
    @GetUser() user: User,
    @Query('timeframe') timeframe: '7d' | '30d' | '90d' = '30d',
  ) {
    const alerts = await this.alertManagerService.getUserAlerts(user.id);
    
    // Calculate analytics (simplified implementation)
    const triggeredAlerts = alerts.filter(a => a.triggeredAt).length;
    const avgProbability = this.calculateAverageProbability(alerts);
    
    return {
      totalAlerts: alerts.length,
      triggeredAlerts,
      accuracy: avgProbability,
      avgResponseTime: 15, // Mock data
      topPerformingCategories: ['Electronics', 'Home & Kitchen'], // Mock data
      aiPredictionAccuracy: avgProbability,
      recommendedOptimizations: this.generateOptimizationRecommendations(alerts),
    };
  }

  // Helper methods
  private getMaxAlertsForUser(user: User): number {
    switch (user.role) {
      case UserRole.ADMIN:
        return 1000;
      case UserRole.SELLER:
        return 100;
      case UserRole.USER:
      default:
        return 20;
    }
  }

  private calculateAverageProbability(alerts: SmartAlert[]): number {
    const alertsWithPredictions = alerts.filter(a => a.aiPredictions?.probabilityOfTrigger);
    if (alertsWithPredictions.length === 0) return 0;
    
    const totalProbability = alertsWithPredictions.reduce(
      (sum, alert) => sum + (alert.aiPredictions!.probabilityOfTrigger || 0),
      0
    );
    
    return totalProbability / alertsWithPredictions.length;
  }

  private generateOptimizationRecommendations(alerts: SmartAlert[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze alert patterns and generate recommendations
    const highVolumeAlerts = alerts.filter(a => a.notificationsSent > 10);
    if (highVolumeAlerts.length > 0) {
      recommendations.push('頻繁に通知されるアラートの条件を調整することを検討してください');
    }
    
    const lowAccuracyAlerts = alerts.filter(a => 
      a.aiPredictions && a.aiPredictions.probabilityOfTrigger < 0.3
    );
    if (lowAccuracyAlerts.length > alerts.length * 0.3) {
      recommendations.push('AI予測精度を向上させるため、より具体的な条件を設定してください');
    }
    
    return recommendations;
  }
}