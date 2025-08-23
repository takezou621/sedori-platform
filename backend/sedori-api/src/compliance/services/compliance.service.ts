import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AntiqueLicense,
  LicenseStatus,
} from '../entities/antique-license.entity';
import { RegulationRule } from '../entities/regulation-rule.entity';
import {
  ComplianceCheck,
  ComplianceStatus,
} from '../entities/compliance-check.entity';
import { ProductComplianceChecker } from '../checkers/product-compliance.checker';
import { ComplianceAlertService } from '../alerts/compliance-alert.service';
import { CreateAntiqueLicenseDto } from '../dto/create-antique-license.dto';
import { UpdateAntiqueLicenseDto } from '../dto/update-antique-license.dto';
import { ComplianceCheckRequestDto } from '../dto/compliance-check-request.dto';
import { Product } from '../../products/entities/product.entity';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(AntiqueLicense)
    private readonly antiqueLicenseRepository: Repository<AntiqueLicense>,
    @InjectRepository(RegulationRule)
    private readonly regulationRuleRepository: Repository<RegulationRule>,
    @InjectRepository(ComplianceCheck)
    private readonly complianceCheckRepository: Repository<ComplianceCheck>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly complianceChecker: ProductComplianceChecker,
    private readonly alertService: ComplianceAlertService,
  ) {}

  // Antique License Management
  async createAntiqueLicense(
    userId: string,
    createDto: CreateAntiqueLicenseDto,
  ): Promise<AntiqueLicense> {
    const license = this.antiqueLicenseRepository.create({
      ...createDto,
      userId,
      issuedAt: new Date(createDto.issuedAt),
      expiresAt: new Date(createDto.expiresAt),
    });

    const savedLicense = await this.antiqueLicenseRepository.save(license);
    this.logger.log(
      `Created antique license ${savedLicense.licenseNumber} for user ${userId}`,
    );

    return savedLicense;
  }

  async updateAntiqueLicense(
    id: string,
    userId: string,
    updateDto: UpdateAntiqueLicenseDto,
  ): Promise<AntiqueLicense> {
    const license = await this.antiqueLicenseRepository.findOne({
      where: { id, userId },
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    Object.assign(license, {
      ...updateDto,
      ...(updateDto.issuedAt && { issuedAt: new Date(updateDto.issuedAt) }),
      ...(updateDto.expiresAt && { expiresAt: new Date(updateDto.expiresAt) }),
    });

    return this.antiqueLicenseRepository.save(license);
  }

  async deleteAntiqueLicense(id: string, userId: string): Promise<void> {
    const result = await this.antiqueLicenseRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException('License not found');
    }
  }

  async getUserLicenses(userId: string): Promise<AntiqueLicense[]> {
    return this.antiqueLicenseRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLicenseById(id: string, userId: string): Promise<AntiqueLicense> {
    const license = await this.antiqueLicenseRepository.findOne({
      where: { id, userId },
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    return license;
  }

  // Compliance Checking
  async performProductComplianceCheck(
    userId: string,
    checkRequest: ComplianceCheckRequestDto,
  ): Promise<ComplianceCheck> {
    const product = await this.productRepository.findOne({
      where: { id: checkRequest.productId },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.complianceChecker.performCompleteCheck(
      product,
      userId,
      checkRequest.checkType,
      checkRequest.originCountry,
    );
  }

  async getProductComplianceStatus(
    productId: string,
  ): Promise<ComplianceStatus | null> {
    const latestCheck = await this.complianceChecker.getLatestCheck(productId);
    return latestCheck?.status || null;
  }

  async getUserComplianceChecks(
    userId: string,
    status?: ComplianceStatus,
    limit: number = 50,
  ): Promise<ComplianceCheck[]> {
    return this.complianceChecker.getChecksForUser(userId, status, limit);
  }

  async getComplianceCheckById(
    id: string,
    userId: string,
  ): Promise<ComplianceCheck> {
    const check = await this.complianceCheckRepository.findOne({
      where: { id, userId },
      relations: ['product'],
    });

    if (!check) {
      throw new NotFoundException('Compliance check not found');
    }

    return check;
  }

  // Dashboard and Statistics
  async getComplianceDashboard(userId: string): Promise<{
    licenses: {
      total: number;
      active: number;
      expiring: number;
      expired: number;
    };
    products: {
      total: number;
      compliant: number;
      nonCompliant: number;
      prohibited: number;
      needsReview: number;
    };
    recentChecks: ComplianceCheck[];
    upcomingExpirations: AntiqueLicense[];
  }> {
    const [licenses, recentChecks] = await Promise.all([
      this.antiqueLicenseRepository.find({ where: { userId } }),
      this.complianceChecker.getChecksForUser(userId, undefined, 10),
    ]);

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const licensesStats = {
      total: licenses.length,
      active: licenses.filter(
        (l) => l.status === LicenseStatus.ACTIVE && !l.isExpired,
      ).length,
      expiring: licenses.filter((l) => l.isExpiringSoon && !l.isExpired).length,
      expired: licenses.filter((l) => l.isExpired).length,
    };

    const productStats = {
      total: recentChecks.length,
      compliant: recentChecks.filter(
        (c) => c.status === ComplianceStatus.COMPLIANT,
      ).length,
      nonCompliant: recentChecks.filter(
        (c) => c.status === ComplianceStatus.NON_COMPLIANT,
      ).length,
      prohibited: recentChecks.filter(
        (c) => c.status === ComplianceStatus.PROHIBITED,
      ).length,
      needsReview: recentChecks.filter(
        (c) => c.status === ComplianceStatus.REQUIRES_REVIEW,
      ).length,
    };

    const upcomingExpirations = licenses
      .filter((l) => l.expiresAt <= thirtyDaysFromNow && !l.isExpired)
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
      .slice(0, 5);

    return {
      licenses: licensesStats,
      products: productStats,
      recentChecks,
      upcomingExpirations,
    };
  }

  // Regulation Rules Management
  async getRegulationRules(
    category?: string,
    type?: string,
    limit: number = 100,
  ): Promise<RegulationRule[]> {
    const query = this.regulationRuleRepository
      .createQueryBuilder('rule')
      .where('rule.status = :status', { status: 'active' });

    if (category) {
      query.andWhere('rule.category = :category', { category });
    }

    if (type) {
      query.andWhere('rule.type = :type', { type });
    }

    return query.orderBy('rule.effectiveFrom', 'DESC').take(limit).getMany();
  }

  async searchRegulationRules(searchTerm: string): Promise<RegulationRule[]> {
    return this.regulationRuleRepository
      .createQueryBuilder('rule')
      .where('rule.status = :status', { status: 'active' })
      .andWhere(
        '(LOWER(rule.title) LIKE :searchTerm OR LOWER(rule.description) LIKE :searchTerm OR rule.keywords && :keywords)',
        {
          searchTerm: `%${searchTerm.toLowerCase()}%`,
          keywords: [searchTerm.toLowerCase()],
        },
      )
      .orderBy('rule.riskLevel', 'DESC')
      .take(50)
      .getMany();
  }

  // Batch Operations
  async checkMultipleProducts(
    userId: string,
    productIds: string[],
    originCountry?: string,
  ): Promise<ComplianceCheck[]> {
    const results: ComplianceCheck[] = [];

    for (const productId of productIds) {
      try {
        const check = await this.performProductComplianceCheck(userId, {
          productId,
          originCountry,
        });
        results.push(check);
      } catch (error) {
        this.logger.error(`Failed to check product ${productId}:`, error);
      }
    }

    return results;
  }

  async updateExpiredLicenses(): Promise<void> {
    await this.antiqueLicenseRepository
      .createQueryBuilder()
      .update()
      .set({ status: LicenseStatus.EXPIRED })
      .where('expiresAt < :now', { now: new Date() })
      .andWhere('status = :status', { status: LicenseStatus.ACTIVE })
      .execute();

    this.logger.log('Updated expired licenses');
  }

  // Reports
  async generateComplianceReport(
    userId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    summary: any;
    licenseStatus: any[];
    complianceChecks: any[];
    recommendations: string[];
  }> {
    const [licenses, checks] = await Promise.all([
      this.antiqueLicenseRepository.find({
        where: { userId },
      }),
      this.complianceCheckRepository.find({
        where: {
          userId,
        },
        order: { performedAt: 'DESC' },
      }),
    ]);

    const summary = {
      reportPeriod: { from: dateFrom, to: dateTo },
      licenseCount: licenses.length,
      checksPerformed: checks.length,
      complianceRate:
        checks.length > 0
          ? (checks.filter((c) => c.status === ComplianceStatus.COMPLIANT)
              .length /
              checks.length) *
            100
          : 100,
      riskProducts: checks.filter((c) => c.hasHighRisk).length,
    };

    const licenseStatus = licenses.map((license) => ({
      licenseNumber: license.licenseNumber,
      businessName: license.businessName,
      status: license.status,
      expiresAt: license.expiresAt,
      daysUntilExpiry: license.daysUntilExpiry,
      isExpiringSoon: license.isExpiringSoon,
    }));

    const complianceChecks = checks.map((check) => ({
      productId: check.productId,
      status: check.status,
      riskScore: check.overallRiskScore,
      performedAt: check.performedAt,
      issuesCount: check.prohibitedReasons?.length || 0,
      recommendationsCount: check.recommendations?.length || 0,
    }));

    const recommendations = this.generateReportRecommendations(
      licenses,
      checks,
    );

    return {
      summary,
      licenseStatus,
      complianceChecks,
      recommendations,
    };
  }

  private generateReportRecommendations(
    licenses: AntiqueLicense[],
    checks: ComplianceCheck[],
  ): string[] {
    const recommendations: string[] = [];

    const expiredLicenses = licenses.filter((l) => l.isExpired).length;
    const expiring = licenses.filter((l) => l.isExpiringSoon).length;
    const prohibited = checks.filter(
      (c) => c.status === ComplianceStatus.PROHIBITED,
    ).length;
    const highRisk = checks.filter((c) => c.hasHighRisk).length;

    if (expiredLicenses > 0) {
      recommendations.push(
        `${expiredLicenses}件の許可証が期限切れです。至急更新手続きを行ってください。`,
      );
    }

    if (expiring > 0) {
      recommendations.push(
        `${expiring}件の許可証の更新時期が近づいています。早めの手続きを推奨します。`,
      );
    }

    if (prohibited > 0) {
      recommendations.push(
        `${prohibited}件の商品で法的リスクが検出されています。即座に販売を停止し、法的助言を求めることを強く推奨します。`,
      );
    }

    if (highRisk > 0) {
      recommendations.push(
        `${highRisk}件の商品で高リスクが検出されています。詳細な確認と対策が必要です。`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        '現在のコンプライアンス状況は良好です。定期的な確認を継続してください。',
      );
    }

    return recommendations;
  }
}
