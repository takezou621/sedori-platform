import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import {
  ComplianceCheck,
  ComplianceStatus,
  CheckType,
} from '../entities/compliance-check.entity';
import {
  AntiqueLicense,
  LicenseStatus,
} from '../entities/antique-license.entity';
import { RegulationRule, RiskLevel } from '../entities/regulation-rule.entity';
import {
  AntiqueDealerRules,
  AntiqueComplianceResult,
} from '../rules/antique-dealer.rules';
import {
  ImportRestrictionRules,
  ImportComplianceResult,
} from '../rules/import-restriction.rules';

export interface ComplianceCheckResult {
  status: ComplianceStatus;
  riskScore: number;
  ruleResults: any[];
  requiredLicenses: any[];
  requiredDocuments: any[];
  prohibitedReasons: any[];
  recommendations: any[];
  complianceActions: any[];
}

@Injectable()
export class ProductComplianceChecker {
  private readonly logger = new Logger(ProductComplianceChecker.name);

  constructor(
    @InjectRepository(ComplianceCheck)
    private readonly complianceCheckRepository: Repository<ComplianceCheck>,
    @InjectRepository(AntiqueLicense)
    private readonly antiqueLicenseRepository: Repository<AntiqueLicense>,
    @InjectRepository(RegulationRule)
    private readonly regulationRuleRepository: Repository<RegulationRule>,
    private readonly antiqueDealerRules: AntiqueDealerRules,
    private readonly importRestrictionRules: ImportRestrictionRules,
  ) {}

  async performCompleteCheck(
    product: Product,
    userId: string,
    checkType: CheckType = CheckType.AUTOMATIC,
    originCountry?: string,
  ): Promise<ComplianceCheck> {
    try {
      this.logger.log(`Starting compliance check for product ${product.id}`);

      // Get user licenses
      const userLicenses = await this.getUserLicenses(userId);

      // Get applicable regulation rules
      const applicableRules = await this.getApplicableRules(product);

      // Perform antique dealer check
      const antiqueResult = this.antiqueDealerRules.checkProductCompliance(
        product,
        userLicenses,
      );

      // Perform import restriction check
      const importResult = this.importRestrictionRules.checkProductCompliance(
        product,
        originCountry,
      );

      // Combine results
      const checkResult = this.combineResults(
        antiqueResult,
        importResult,
        applicableRules,
      );

      // Create compliance check record
      const complianceCheck = await this.createComplianceCheck(
        product,
        userId,
        checkType,
        checkResult,
      );

      this.logger.log(
        `Compliance check completed for product ${product.id}: ${checkResult.status}`,
      );

      return complianceCheck;
    } catch (error) {
      this.logger.error(
        `Compliance check failed for product ${product.id}:`,
        error,
      );
      throw error;
    }
  }

  async performQuickCheck(
    product: Product,
    userId: string,
  ): Promise<ComplianceStatus> {
    try {
      const userLicenses = await this.getUserLicenses(userId);

      const antiqueResult = this.antiqueDealerRules.checkProductCompliance(
        product,
        userLicenses,
      );

      const importResult =
        this.importRestrictionRules.checkProductCompliance(product);

      // Quick assessment
      if (
        antiqueResult.riskLevel === RiskLevel.PROHIBITED ||
        importResult.riskLevel === RiskLevel.PROHIBITED
      ) {
        return ComplianceStatus.PROHIBITED;
      }

      if (!antiqueResult.compliant || !importResult.compliant) {
        if (
          antiqueResult.requiredLicense ||
          importResult.requiredLicenses.length > 0
        ) {
          return ComplianceStatus.NEEDS_LICENSE;
        }
        return ComplianceStatus.NON_COMPLIANT;
      }

      if (
        antiqueResult.warnings.length > 0 ||
        importResult.restrictedReasons.length > 0
      ) {
        return ComplianceStatus.REQUIRES_REVIEW;
      }

      return ComplianceStatus.COMPLIANT;
    } catch (error) {
      this.logger.error(
        `Quick compliance check failed for product ${product.id}:`,
        error,
      );
      return ComplianceStatus.PENDING;
    }
  }

  async getLatestCheck(productId: string): Promise<ComplianceCheck | null> {
    return this.complianceCheckRepository
      .createQueryBuilder('check')
      .where('check.productId = :productId', { productId })
      .orderBy('check.performedAt', 'DESC')
      .getOne();
  }

  async getChecksForUser(
    userId: string,
    status?: ComplianceStatus,
    limit: number = 50,
  ): Promise<ComplianceCheck[]> {
    const query = this.complianceCheckRepository
      .createQueryBuilder('check')
      .where('check.userId = :userId', { userId });

    if (status) {
      query.andWhere('check.status = :status', { status });
    }

    return query.orderBy('check.performedAt', 'DESC').take(limit).getMany();
  }

  async scheduleRecheck(productId: string, days: number = 30): Promise<void> {
    const nextCheckAt = new Date();
    nextCheckAt.setDate(nextCheckAt.getDate() + days);

    await this.complianceCheckRepository.update({ productId }, { nextCheckAt });
  }

  private async getUserLicenses(userId: string): Promise<AntiqueLicense[]> {
    return this.antiqueLicenseRepository.find({
      where: { userId, status: LicenseStatus.ACTIVE },
    });
  }

  private async getApplicableRules(
    product: Product,
  ): Promise<RegulationRule[]> {
    const searchText = [
      product.name,
      product.description,
      product.category?.name,
    ]
      .join(' ')
      .toLowerCase();

    const keywords = searchText.split(' ').filter((word) => word.length > 2);

    return this.regulationRuleRepository
      .createQueryBuilder('rule')
      .where('rule.status = :status', { status: 'active' })
      .andWhere(
        keywords
          .map((_, index) => `LOWER(rule.keywords::text) LIKE :keyword${index}`)
          .join(' OR '),
        keywords.reduce(
          (params, keyword, index) => {
            params[`keyword${index}`] = `%${keyword}%`;
            return params;
          },
          {} as Record<string, string>,
        ),
      )
      .getMany();
  }

  private combineResults(
    antiqueResult: AntiqueComplianceResult,
    importResult: ImportComplianceResult,
    rules: RegulationRule[],
  ): ComplianceCheckResult {
    const ruleResults = [
      {
        ruleId: 'antique-dealer',
        ruleType: 'ANTIQUE_DEALER',
        ruleTitle: '古物商法',
        matched: antiqueResult.requiredLicense,
        riskLevel: antiqueResult.riskLevel,
        details: antiqueResult.violations.join('; '),
        requiredActions: antiqueResult.requiredLicense
          ? ['古物商許可証の取得']
          : [],
        warnings: antiqueResult.warnings,
      },
      {
        ruleId: 'import-restriction',
        ruleType: 'IMPORT_RESTRICTION',
        ruleTitle: '輸入規制',
        matched:
          importResult.prohibitedReasons.length > 0 ||
          importResult.restrictedReasons.length > 0,
        riskLevel: importResult.riskLevel,
        details: [
          ...importResult.prohibitedReasons,
          ...importResult.restrictedReasons,
        ].join('; '),
        requiredActions: importResult.requiredDocuments,
        warnings: importResult.recommendations,
      },
      ...rules.map((rule) => ({
        ruleId: rule.id,
        ruleType: rule.type,
        ruleTitle: rule.title,
        matched: true,
        riskLevel: rule.riskLevel,
        details: rule.description,
        requiredActions: rule.requiredDocuments,
        warnings: rule.requirements ? [rule.requirements] : [],
      })),
    ];

    // Calculate overall risk score
    const riskScores = ruleResults.map((result) => {
      switch (result.riskLevel) {
        case RiskLevel.PROHIBITED:
          return 1.0;
        case RiskLevel.HIGH:
          return 0.8;
        case RiskLevel.MEDIUM:
          return 0.5;
        case RiskLevel.LOW:
          return 0.2;
        default:
          return 0.0;
      }
    });

    const riskScore = Math.max(...riskScores, 0);

    // Determine status
    let status: ComplianceStatus;
    if (
      antiqueResult.riskLevel === RiskLevel.PROHIBITED ||
      importResult.riskLevel === RiskLevel.PROHIBITED
    ) {
      status = ComplianceStatus.PROHIBITED;
    } else if (!antiqueResult.compliant || !importResult.compliant) {
      if (
        antiqueResult.requiredLicense ||
        importResult.requiredLicenses.length > 0
      ) {
        status = ComplianceStatus.NEEDS_LICENSE;
      } else {
        status = ComplianceStatus.NON_COMPLIANT;
      }
    } else if (riskScore > 0.3) {
      status = ComplianceStatus.REQUIRES_REVIEW;
    } else {
      status = ComplianceStatus.COMPLIANT;
    }

    return {
      status,
      riskScore,
      ruleResults,
      requiredLicenses: [
        ...(antiqueResult.requiredLicense
          ? [
              {
                type: 'antique_dealer',
                name: '古物商許可証',
                required: true,
                possessed: false,
                authority: '公安委員会',
              },
            ]
          : []),
        ...importResult.requiredLicenses.map((license) => ({
          type: 'import_license',
          name: license,
          required: true,
          possessed: false,
          authority: '関連官庁',
        })),
      ],
      requiredDocuments: [
        ...importResult.requiredDocuments.map((doc) => ({
          type: 'import_document',
          name: doc,
          required: true,
          uploaded: false,
        })),
      ],
      prohibitedReasons: [
        ...antiqueResult.violations.map((reason) => ({
          rule: '古物商法',
          reason,
          legalBasis: '古物営業法',
          penalty: '懲役・罰金',
        })),
        ...importResult.prohibitedReasons.map((reason) => ({
          rule: '輸入規制',
          reason,
          legalBasis: '各種法令',
          penalty: '没収・罰金',
        })),
      ],
      recommendations: [
        ...antiqueResult.recommendations.map((rec) => ({
          type: 'action' as const,
          message: rec,
          priority: 'medium' as const,
          actionRequired: true,
        })),
        ...importResult.recommendations.map((rec) => ({
          type: 'info' as const,
          message: rec,
          priority: 'low' as const,
          actionRequired: false,
        })),
      ],
      complianceActions: [],
    };
  }

  private async createComplianceCheck(
    product: Product,
    userId: string,
    checkType: CheckType,
    result: ComplianceCheckResult,
  ): Promise<ComplianceCheck> {
    const complianceCheck = this.complianceCheckRepository.create({
      productId: product.id,
      userId,
      status: result.status,
      checkType,
      overallRiskScore: result.riskScore,
      ruleResults: result.ruleResults,
      requiredLicenses: result.requiredLicenses,
      requiredDocuments: result.requiredDocuments,
      prohibitedReasons: result.prohibitedReasons,
      recommendations: result.recommendations,
      complianceActions: result.complianceActions,
      performedAt: new Date(),
      nextCheckAt: this.calculateNextCheckDate(result.status),
      metadata: {
        productName: product.name,
        productCategory: product.category?.name,
        checkVersion: '1.0',
      },
    });

    return this.complianceCheckRepository.save(complianceCheck);
  }

  private calculateNextCheckDate(status: ComplianceStatus): Date {
    const nextCheck = new Date();

    switch (status) {
      case ComplianceStatus.PROHIBITED:
        // No next check for prohibited items
        return nextCheck;
      case ComplianceStatus.NON_COMPLIANT:
      case ComplianceStatus.NEEDS_LICENSE:
        // Check again in 7 days
        nextCheck.setDate(nextCheck.getDate() + 7);
        break;
      case ComplianceStatus.REQUIRES_REVIEW:
        // Check again in 30 days
        nextCheck.setDate(nextCheck.getDate() + 30);
        break;
      case ComplianceStatus.COMPLIANT:
        // Check again in 90 days
        nextCheck.setDate(nextCheck.getDate() + 90);
        break;
      default:
        // Default to 30 days
        nextCheck.setDate(nextCheck.getDate() + 30);
    }

    return nextCheck;
  }
}
