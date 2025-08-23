import { Injectable } from '@nestjs/common';
import { Product } from '../../products/entities/product.entity';
import {
  AntiqueLicense,
  AntiqueDealerCategory,
} from '../entities/antique-license.entity';
import { RiskLevel } from '../entities/regulation-rule.entity';

export interface AntiqueComplianceResult {
  compliant: boolean;
  riskLevel: RiskLevel;
  requiredLicense: boolean;
  applicableCategories: AntiqueDealerCategory[];
  violations: string[];
  warnings: string[];
  recommendations: string[];
}

@Injectable()
export class AntiqueDealerRules {
  private readonly antiqueKeywords = [
    '古物',
    '中古',
    '骨董',
    '古美術',
    'アンティーク',
    'ヴィンテージ',
    'used',
    'antique',
    'vintage',
    'secondhand',
    'pre-owned',
    '古書',
    '古着',
    '古道具',
    '古家具',
    '古写真',
    '古絵画',
  ];

  private readonly categoryKeywords: Record<AntiqueDealerCategory, string[]> = {
    [AntiqueDealerCategory.BOOKS]: [
      '本',
      '書籍',
      '古書',
      '雑誌',
      'book',
      'magazine',
      '文庫',
      '単行本',
      '漫画',
      'コミック',
    ],
    [AntiqueDealerCategory.PAINTINGS]: [
      '絵画',
      '掛軸',
      '屏風',
      '浮世絵',
      'painting',
      '美術品',
      '版画',
      '書道',
      '墨絵',
    ],
    [AntiqueDealerCategory.METAL_PRODUCTS]: [
      '金属',
      '鉄器',
      '銅器',
      '真鍮',
      'metal',
      '刀剣',
      '甲冑',
      '仏具',
      '茶道具',
    ],
    [AntiqueDealerCategory.JEWELRY]: [
      '宝石',
      '貴金属',
      'jewelry',
      'jewellery',
      '指輪',
      'ネックレス',
      '時計',
      'watch',
    ],
    [AntiqueDealerCategory.CLOTHING]: [
      '衣類',
      '着物',
      '洋服',
      'clothing',
      'fashion',
      'dress',
      'kimono',
      'textile',
    ],
    [AntiqueDealerCategory.MACHINERY]: [
      '機械',
      'machine',
      'equipment',
      '工具',
      'tool',
      '計器',
      'instrument',
    ],
    [AntiqueDealerCategory.ELECTRONICS]: [
      '電化製品',
      '電子機器',
      'electronics',
      'radio',
      'camera',
      'television',
      'audio',
    ],
    [AntiqueDealerCategory.PHOTOGRAPHS]: [
      '写真',
      'photograph',
      'photo',
      'camera',
      '古写真',
      'vintage photo',
    ],
    [AntiqueDealerCategory.LEATHER_GOODS]: [
      '革製品',
      'leather',
      'bag',
      'belt',
      'shoes',
      'wallet',
      'handbag',
    ],
    [AntiqueDealerCategory.ALL_CATEGORIES]: [],
  };

  private readonly prohibitedItems = [
    '拳銃',
    '銃砲',
    '刀剣類',
    '麻薬',
    '覚醒剤',
    '偽造品',
    '盗品',
    '模倣品',
    '象牙',
    'ivory',
    '鼈甲',
    'tortoiseshell',
    '熊胆',
    '虎骨',
    '犀角',
    '医薬品',
    'medicine',
    '化粧品',
    'cosmetics',
    '食品',
    'food',
  ];

  checkProductCompliance(
    product: Product,
    userLicenses?: AntiqueLicense[],
  ): AntiqueComplianceResult {
    const result: AntiqueComplianceResult = {
      compliant: true,
      riskLevel: RiskLevel.LOW,
      requiredLicense: false,
      applicableCategories: [],
      violations: [],
      warnings: [],
      recommendations: [],
    };

    // Check if product is likely an antique/used item
    const isAntique = this.isAntiqueItem(product);
    if (!isAntique) {
      return result; // Not an antique, no regulation applies
    }

    result.requiredLicense = true;
    result.applicableCategories = this.determineCategories(product);

    // Check for prohibited items
    const prohibitedViolations = this.checkProhibitedItems(product);
    if (prohibitedViolations.length > 0) {
      result.compliant = false;
      result.riskLevel = RiskLevel.PROHIBITED;
      result.violations.push(...prohibitedViolations);
      return result;
    }

    // Check license requirements
    const licenseCheck = this.checkLicenseRequirements(
      result.applicableCategories,
      userLicenses,
    );

    if (!licenseCheck.hasValidLicense) {
      result.compliant = false;
      result.riskLevel = RiskLevel.HIGH;
      result.violations.push(
        '古物商許可証が必要です。適切なカテゴリの許可証を取得してください。',
      );
    }

    if (licenseCheck.expiringSoon) {
      result.warnings.push(
        '古物商許可証の有効期限が近づいています。更新手続きを行ってください。',
      );
      result.riskLevel = RiskLevel.MEDIUM;
    }

    // Add recommendations
    this.addRecommendations(result, product);

    return result;
  }

  private isAntiqueItem(product: Product): boolean {
    const searchText = [
      product.name,
      product.description,
      product.category?.name,
      ...Object.values(product.metadata || {}),
    ]
      .join(' ')
      .toLowerCase();

    return this.antiqueKeywords.some((keyword) =>
      searchText.includes(keyword.toLowerCase()),
    );
  }

  private determineCategories(product: Product): AntiqueDealerCategory[] {
    const searchText = [
      product.name,
      product.description,
      product.category?.name,
    ]
      .join(' ')
      .toLowerCase();

    const categories: AntiqueDealerCategory[] = [];

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (category === AntiqueDealerCategory.ALL_CATEGORIES) continue;

      if (
        keywords.some((keyword) => searchText.includes(keyword.toLowerCase()))
      ) {
        categories.push(category as AntiqueDealerCategory);
      }
    }

    // If no specific category matches, it might fall under general antiques
    if (categories.length === 0) {
      categories.push(AntiqueDealerCategory.ALL_CATEGORIES);
    }

    return categories;
  }

  private checkProhibitedItems(product: Product): string[] {
    const searchText = [product.name, product.description]
      .join(' ')
      .toLowerCase();

    const violations: string[] = [];

    for (const prohibitedItem of this.prohibitedItems) {
      if (searchText.includes(prohibitedItem.toLowerCase())) {
        violations.push(
          `禁制品の可能性があります: ${prohibitedItem}。この商品の取引は法的に禁止されている場合があります。`,
        );
      }
    }

    return violations;
  }

  private checkLicenseRequirements(
    requiredCategories: AntiqueDealerCategory[],
    userLicenses?: AntiqueLicense[],
  ): { hasValidLicense: boolean; expiringSoon: boolean } {
    if (!userLicenses || userLicenses.length === 0) {
      return { hasValidLicense: false, expiringSoon: false };
    }

    const validLicenses = userLicenses.filter(
      (license) => license.status === 'active' && !license.isExpired,
    );

    if (validLicenses.length === 0) {
      return { hasValidLicense: false, expiringSoon: false };
    }

    // Check if any license covers the required categories
    const hasValidLicense = validLicenses.some(
      (license) =>
        license.categories.includes(AntiqueDealerCategory.ALL_CATEGORIES) ||
        requiredCategories.some((category) =>
          license.categories.includes(category),
        ),
    );

    // Check if any valid license is expiring soon
    const expiringSoon = validLicenses.some(
      (license) => license.isExpiringSoon,
    );

    return { hasValidLicense, expiringSoon };
  }

  private addRecommendations(
    result: AntiqueComplianceResult,
    product: Product,
  ): void {
    if (result.requiredLicense) {
      result.recommendations.push(
        '古物商許可証の取得が必要です。管轄の公安委員会に申請してください。',
      );
      result.recommendations.push(
        '古物台帳への記録が義務付けられています。取引記録を適切に保管してください。',
      );
    }

    if (result.applicableCategories.length > 1) {
      result.recommendations.push(
        '複数カテゴリに該当する可能性があります。適切な許可カテゴリを確認してください。',
      );
    }

    // Add category-specific recommendations
    if (result.applicableCategories.includes(AntiqueDealerCategory.JEWELRY)) {
      result.recommendations.push(
        '貴金属類の取引には品位表示や証明書の確認が重要です。',
      );
    }

    if (result.applicableCategories.includes(AntiqueDealerCategory.BOOKS)) {
      result.recommendations.push('古書の取引では著作権の確認も重要です。');
    }
  }

  // Utility method to get all antique dealer categories
  getAllCategories(): AntiqueDealerCategory[] {
    return Object.values(AntiqueDealerCategory);
  }

  // Get category display name in Japanese
  getCategoryDisplayName(category: AntiqueDealerCategory): string {
    const displayNames: Record<AntiqueDealerCategory, string> = {
      [AntiqueDealerCategory.BOOKS]: '書籍類',
      [AntiqueDealerCategory.PAINTINGS]: '美術品類',
      [AntiqueDealerCategory.METAL_PRODUCTS]: '金属製品類',
      [AntiqueDealerCategory.JEWELRY]: '宝飾品類',
      [AntiqueDealerCategory.CLOTHING]: '衣類',
      [AntiqueDealerCategory.MACHINERY]: '機械器具類',
      [AntiqueDealerCategory.ELECTRONICS]: '電化製品類',
      [AntiqueDealerCategory.PHOTOGRAPHS]: '写真類',
      [AntiqueDealerCategory.LEATHER_GOODS]: '皮革製品類',
      [AntiqueDealerCategory.ALL_CATEGORIES]: '全カテゴリ',
    };

    return displayNames[category];
  }
}
