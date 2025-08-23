import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AntiqueLicense,
  LicenseStatus,
} from '../entities/antique-license.entity';
import {
  ComplianceCheck,
  ComplianceStatus,
} from '../entities/compliance-check.entity';
import { NotificationService } from '../../notifications/services/notification.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/dto/create-notification.dto';

interface AlertSummary {
  totalAlerts: number;
  expiringLicenses: number;
  nonCompliantProducts: number;
  prohibitedProducts: number;
  reviewRequired: number;
}

@Injectable()
export class ComplianceAlertService {
  private readonly logger = new Logger(ComplianceAlertService.name);

  constructor(
    @InjectRepository(AntiqueLicense)
    private readonly antiqueLicenseRepository: Repository<AntiqueLicense>,
    @InjectRepository(ComplianceCheck)
    private readonly complianceCheckRepository: Repository<ComplianceCheck>,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkLicenseExpirations(): Promise<void> {
    this.logger.log('Starting daily license expiration check');

    try {
      const expiringLicenses = await this.antiqueLicenseRepository
        .createQueryBuilder('license')
        .where('license.status = :status', { status: 'active' })
        .andWhere('license.expiresAt <= :date', {
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        })
        .andWhere('license.notificationSent = false')
        .getMany();

      for (const license of expiringLicenses) {
        await this.sendLicenseExpirationAlert(license);

        // Mark notification as sent
        license.notificationSent = true;
        await this.antiqueLicenseRepository.save(license);
      }

      this.logger.log(
        `Processed ${expiringLicenses.length} license expiration alerts`,
      );
    } catch (error) {
      this.logger.error('Failed to check license expirations:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkComplianceIssues(): Promise<void> {
    this.logger.log('Starting daily compliance issues check');

    try {
      // Find products that need compliance review
      const needsReview = await this.complianceCheckRepository
        .createQueryBuilder('check')
        .where('check.nextCheckAt <= :now', { now: new Date() })
        .andWhere('check.status IN (:...statuses)', {
          statuses: [
            ComplianceStatus.REQUIRES_REVIEW,
            ComplianceStatus.NON_COMPLIANT,
          ],
        })
        .getMany();

      // Group by user
      const userAlerts = new Map<string, ComplianceCheck[]>();
      for (const check of needsReview) {
        if (!userAlerts.has(check.userId)) {
          userAlerts.set(check.userId, []);
        }
        userAlerts.get(check.userId)!.push(check);
      }

      // Send alerts to users
      for (const [userId, checks] of userAlerts) {
        await this.sendComplianceReviewAlert(userId, checks);
      }

      this.logger.log(
        `Processed compliance alerts for ${userAlerts.size} users`,
      );
    } catch (error) {
      this.logger.error('Failed to check compliance issues:', error);
    }
  }

  @Cron('0 8 * * 1') // Every Monday at 8AM
  async sendWeeklyComplianceSummary(): Promise<void> {
    this.logger.log('Starting weekly compliance summary');

    try {
      // Get all users with active licenses or compliance checks
      const usersWithCompliance = await this.getUsersWithCompliance();

      for (const userId of usersWithCompliance) {
        const summary = await this.generateComplianceSummary(userId);

        if (summary.totalAlerts > 0) {
          await this.sendWeeklySummaryAlert(userId, summary);
        }
      }

      this.logger.log(
        `Sent weekly compliance summaries to ${usersWithCompliance.length} users`,
      );
    } catch (error) {
      this.logger.error('Failed to send weekly compliance summaries:', error);
    }
  }

  async sendLicenseExpirationAlert(license: AntiqueLicense): Promise<void> {
    const daysUntilExpiry = license.daysUntilExpiry;
    const isExpired = license.isExpired;

    let title: string;
    let message: string;
    let urgency: 'high' | 'medium' = 'medium';

    if (isExpired) {
      title = '古物商許可証が期限切れです';
      message = `古物商許可証「${license.licenseNumber}」が期限切れです。営業を継続するためには更新手続きが必要です。`;
      urgency = 'high';
    } else if (daysUntilExpiry <= 7) {
      title = '古物商許可証の期限が近づいています（緊急）';
      message = `古物商許可証「${license.licenseNumber}」の有効期限まで${daysUntilExpiry}日です。至急更新手続きを行ってください。`;
      urgency = 'high';
    } else if (daysUntilExpiry <= 30) {
      title = '古物商許可証の更新手続きをお忘れなく';
      message = `古物商許可証「${license.licenseNumber}」の有効期限まで${daysUntilExpiry}日です。更新手続きを開始してください。`;
    } else {
      return; // No alert needed
    }

    await this.notificationService.create({
      userId: license.userId,
      title,
      message,
      type: NotificationType.SYSTEM,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      category: 'compliance_license',
      data: {
        licenseId: license.id,
        licenseNumber: license.licenseNumber,
        expiresAt: license.expiresAt.toISOString(),
        daysUntilExpiry,
        isExpired,
        urgency,
      },
      actionUrl: '/compliance/licenses',
    });

    this.logger.log(
      `Sent license expiration alert for license ${license.licenseNumber}`,
    );
  }

  async sendComplianceReviewAlert(
    userId: string,
    checks: ComplianceCheck[],
  ): Promise<void> {
    const prohibited = checks.filter(
      (c) => c.status === ComplianceStatus.PROHIBITED,
    );
    const nonCompliant = checks.filter(
      (c) => c.status === ComplianceStatus.NON_COMPLIANT,
    );
    const needsReview = checks.filter(
      (c) => c.status === ComplianceStatus.REQUIRES_REVIEW,
    );
    const needsLicense = checks.filter(
      (c) => c.status === ComplianceStatus.NEEDS_LICENSE,
    );

    let title = 'コンプライアンス確認が必要な商品があります';
    let message = '';
    let priority: 'high' | 'medium' | 'low' = 'medium';

    if (prohibited.length > 0) {
      title = '禁止商品が検出されました（緊急対応必要）';
      message = `${prohibited.length}点の商品で法的リスクが検出されました。即座に販売を停止し、対応を確認してください。`;
      priority = 'high';
    } else if (nonCompliant.length > 0) {
      title = 'コンプライアンス違反の可能性があります';
      message = `${nonCompliant.length}点の商品でコンプライアンス上の問題が検出されました。`;
      priority = 'high';
    } else if (needsLicense.length > 0) {
      title = '許可証が必要な商品があります';
      message = `${needsLicense.length}点の商品で追加の許可証が必要です。`;
      priority = 'medium';
    } else if (needsReview.length > 0) {
      title = 'コンプライアンス確認が必要です';
      message = `${needsReview.length}点の商品でレビューが必要です。`;
      priority = 'low';
    }

    if (message) {
      await this.notificationService.create({
        userId,
        title,
        message: message + ' 詳細を確認してください。',
        type: NotificationType.SYSTEM,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        category: 'compliance_review',
        data: {
          totalProducts: checks.length,
          prohibited: prohibited.length,
          nonCompliant: nonCompliant.length,
          needsReview: needsReview.length,
          needsLicense: needsLicense.length,
          priority,
        },
        actionUrl: '/compliance/products',
      });
    }
  }

  async sendWeeklySummaryAlert(
    userId: string,
    summary: AlertSummary,
  ): Promise<void> {
    const title = 'コンプライアンス週次サマリー';
    const message = `
今週のコンプライアンス状況をお知らせします。
- 有効期限切れ近接許可証: ${summary.expiringLicenses}件
- 要確認商品: ${summary.nonCompliantProducts}件
- 禁止商品: ${summary.prohibitedProducts}件
- レビュー必要: ${summary.reviewRequired}件

詳細な状況を確認し、必要な対応を行ってください。
    `.trim();

    await this.notificationService.create({
      userId,
      title,
      message,
      type: NotificationType.SYSTEM,
      channels: [NotificationChannel.EMAIL],
      category: 'compliance_summary',
      data: {
        ...summary,
        weekOf: new Date().toISOString(),
      },
      actionUrl: '/compliance/dashboard',
    });
  }

  async sendRegulatoryUpdateAlert(
    userIds: string[],
    updateTitle: string,
    updateDescription: string,
    effectiveDate: Date,
    affectedCategories: string[],
  ): Promise<void> {
    const title = '法規制改正のお知らせ';
    const message = `
${updateTitle}

${updateDescription}

施行日: ${effectiveDate.toLocaleDateString('ja-JP')}
影響カテゴリ: ${affectedCategories.join(', ')}

詳細を確認し、必要な対応を行ってください。
    `.trim();

    for (const userId of userIds) {
      await this.notificationService.create({
        userId,
        title,
        message,
        type: NotificationType.SYSTEM,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        category: 'regulatory_update',
        data: {
          updateTitle,
          updateDescription,
          effectiveDate: effectiveDate.toISOString(),
          affectedCategories,
        },
        actionUrl: '/compliance/regulations',
      });
    }

    this.logger.log(`Sent regulatory update alert to ${userIds.length} users`);
  }

  private async getUsersWithCompliance(): Promise<string[]> {
    const licenseUsers = await this.antiqueLicenseRepository
      .createQueryBuilder('license')
      .select('DISTINCT license.userId', 'userId')
      .where('license.status = :status', { status: 'active' })
      .getRawMany();

    const checkUsers = await this.complianceCheckRepository
      .createQueryBuilder('check')
      .select('DISTINCT check.userId', 'userId')
      .where('check.performedAt >= :date', {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      })
      .getRawMany();

    const allUsers = [
      ...licenseUsers.map((u) => u.userId),
      ...checkUsers.map((u) => u.userId),
    ];

    return [...new Set(allUsers)];
  }

  private async generateComplianceSummary(
    userId: string,
  ): Promise<AlertSummary> {
    const [expiringLicenses, recentChecks] = await Promise.all([
      this.antiqueLicenseRepository.count({
        where: {
          userId,
          status: LicenseStatus.ACTIVE,
        },
      }),
      this.complianceCheckRepository.find({
        where: {
          userId,
          performedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      }),
    ]);

    const nonCompliantProducts = recentChecks.filter(
      (c) => c.status === ComplianceStatus.NON_COMPLIANT,
    ).length;

    const prohibitedProducts = recentChecks.filter(
      (c) => c.status === ComplianceStatus.PROHIBITED,
    ).length;

    const reviewRequired = recentChecks.filter(
      (c) => c.status === ComplianceStatus.REQUIRES_REVIEW,
    ).length;

    const totalAlerts =
      expiringLicenses +
      nonCompliantProducts +
      prohibitedProducts +
      reviewRequired;

    return {
      totalAlerts,
      expiringLicenses,
      nonCompliantProducts,
      prohibitedProducts,
      reviewRequired,
    };
  }

  // Manual alert methods
  async sendCustomAlert(
    userId: string,
    title: string,
    message: string,
    category: string,
    actionUrl?: string,
  ): Promise<void> {
    await this.notificationService.create({
      userId,
      title,
      message,
      type: NotificationType.SYSTEM,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      category,
      actionUrl,
    });
  }

  async broadcastRegulatoryUpdate(
    title: string,
    message: string,
    affectedUsers: string[],
  ): Promise<void> {
    await this.notificationService.createBulkNotifications(affectedUsers, {
      title,
      message,
      type: NotificationType.SYSTEM,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      category: 'regulatory_broadcast',
    });

    this.logger.log(
      `Broadcast regulatory update to ${affectedUsers.length} users`,
    );
  }
}
