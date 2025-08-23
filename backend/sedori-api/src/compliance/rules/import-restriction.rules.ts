import { Injectable } from '@nestjs/common';
import { Product } from '../../products/entities/product.entity';
import { RiskLevel } from '../entities/regulation-rule.entity';

export interface ImportComplianceResult {
  compliant: boolean;
  riskLevel: RiskLevel;
  prohibitedReasons: string[];
  restrictedReasons: string[];
  requiredDocuments: string[];
  requiredLicenses: string[];
  estimatedTariff?: {
    rate: number;
    amount: number;
    currency: string;
  };
  recommendations: string[];
}

interface ImportRestriction {
  category: string;
  keywords: string[];
  prohibited: boolean;
  restricted: boolean;
  documents: string[];
  licenses: string[];
  tariffCode?: string;
  tariffRate?: number;
  description: string;
  authority: string;
}

@Injectable()
export class ImportRestrictionRules {
  private readonly importRestrictions: ImportRestriction[] = [
    {
      category: 'pharmaceutical',
      keywords: [
        '薬',
        'medicine',
        'drug',
        'サプリメント',
        'supplement',
        '医薬品',
        'pharmaceutical',
      ],
      prohibited: true,
      restricted: false,
      documents: [],
      licenses: [],
      description: '医薬品の個人輸入は原則禁止',
      authority: '厚生労働省',
    },
    {
      category: 'food_safety',
      keywords: ['食品', 'food', '健康食品', '栄養補助食品', 'health food'],
      prohibited: false,
      restricted: true,
      documents: ['食品等輸入届出書', '原材料表', '製造工程表'],
      licenses: ['食品輸入業許可'],
      description: '食品衛生法による規制',
      authority: '厚生労働省・検疫所',
    },
    {
      category: 'cosmetics',
      keywords: ['化粧品', 'cosmetics', 'beauty', '美容', 'skincare'],
      prohibited: false,
      restricted: true,
      documents: ['化粧品等輸入届出書', '成分表', '製造販売業許可証'],
      licenses: ['化粧品製造販売業許可'],
      description: '薬機法による規制',
      authority: '厚生労働省',
    },
    {
      category: 'weapons',
      keywords: [
        '武器',
        'weapon',
        '銃',
        'gun',
        '刀',
        'sword',
        '爆発物',
        'explosive',
      ],
      prohibited: true,
      restricted: false,
      documents: [],
      licenses: [],
      description: '武器類の輸入は原則禁止',
      authority: '経済産業省',
    },
    {
      category: 'endangered_species',
      keywords: [
        '象牙',
        'ivory',
        '鼈甲',
        'tortoiseshell',
        '毛皮',
        'fur',
        'ワニ革',
        'crocodile',
      ],
      prohibited: true,
      restricted: false,
      documents: [],
      licenses: [],
      description: 'ワシントン条約による規制',
      authority: '経済産業省・環境省',
    },
    {
      category: 'electronics',
      keywords: [
        '電子機器',
        'electronics',
        'radio',
        'wireless',
        '無線機',
        'bluetooth',
      ],
      prohibited: false,
      restricted: true,
      documents: ['技術基準適合証明書', '電波法適合証明'],
      licenses: ['技術基準適合認定'],
      tariffCode: '8517',
      tariffRate: 0,
      description: '電波法・電気用品安全法による規制',
      authority: '総務省・経済産業省',
    },
    {
      category: 'textiles',
      keywords: ['繊維製品', 'textile', '衣類', 'clothing', 'fabric'],
      prohibited: false,
      restricted: true,
      documents: ['品質表示書', '原産地証明書'],
      licenses: [],
      tariffCode: '6109',
      tariffRate: 7.4,
      description: '繊維製品の品質表示に関する法律',
      authority: '消費者庁',
    },
    {
      category: 'tobacco',
      keywords: ['たばこ', 'tobacco', 'cigarette', '煙草'],
      prohibited: false,
      restricted: true,
      documents: ['たばこ輸入許可申請書'],
      licenses: ['たばこ輸入業許可'],
      description: 'たばこ事業法による規制',
      authority: '財務省',
    },
    {
      category: 'alcohol',
      keywords: ['酒', 'alcohol', 'wine', 'beer', 'spirits', 'アルコール'],
      prohibited: false,
      restricted: true,
      documents: ['酒類輸入申告書', '成分分析書'],
      licenses: ['酒類販売業免許'],
      tariffCode: '2208',
      tariffRate: 20,
      description: '酒税法による規制',
      authority: '国税庁',
    },
    {
      category: 'counterfeit',
      keywords: ['偽物', 'fake', 'replica', 'copy', 'imitation', '模倣品'],
      prohibited: true,
      restricted: false,
      documents: [],
      licenses: [],
      description: '知的財産権侵害物品',
      authority: '税関',
    },
  ];

  checkProductCompliance(
    product: Product,
    originCountry?: string,
  ): ImportComplianceResult {
    const result: ImportComplianceResult = {
      compliant: true,
      riskLevel: RiskLevel.LOW,
      prohibitedReasons: [],
      restrictedReasons: [],
      requiredDocuments: [],
      requiredLicenses: [],
      recommendations: [],
    };

    const searchText = [
      product.name,
      product.description,
      product.category?.name,
      ...Object.values(product.metadata || {}),
    ]
      .join(' ')
      .toLowerCase();

    const applicableRestrictions: ImportRestriction[] = [];

    // Find applicable restrictions
    for (const restriction of this.importRestrictions) {
      if (
        restriction.keywords.some((keyword) =>
          searchText.includes(keyword.toLowerCase()),
        )
      ) {
        applicableRestrictions.push(restriction);
      }
    }

    // Process restrictions
    for (const restriction of applicableRestrictions) {
      if (restriction.prohibited) {
        result.compliant = false;
        result.riskLevel = RiskLevel.PROHIBITED;
        result.prohibitedReasons.push(
          `${restriction.description}（管轄：${restriction.authority}）`,
        );
      } else if (restriction.restricted) {
        if (
          result.riskLevel === RiskLevel.LOW ||
          result.riskLevel === RiskLevel.MEDIUM
        ) {
          result.riskLevel = RiskLevel.HIGH;
        }
        result.restrictedReasons.push(
          `${restriction.description}（管轄：${restriction.authority}）`,
        );

        // Add required documents and licenses
        result.requiredDocuments.push(...restriction.documents);
        result.requiredLicenses.push(...restriction.licenses);

        // Calculate tariff if applicable
        if (
          restriction.tariffCode &&
          restriction.tariffRate !== undefined &&
          product.retailPrice
        ) {
          result.estimatedTariff = {
            rate: restriction.tariffRate,
            amount: product.retailPrice * (restriction.tariffRate / 100),
            currency: 'JPY',
          };
        }
      }
    }

    // Remove duplicates
    result.requiredDocuments = [...new Set(result.requiredDocuments)];
    result.requiredLicenses = [...new Set(result.requiredLicenses)];

    // Add country-specific restrictions
    if (originCountry) {
      this.addCountrySpecificRestrictions(result, originCountry, product);
    }

    // Add general recommendations
    this.addGeneralRecommendations(result, applicableRestrictions);

    // Final compliance assessment
    if (
      result.prohibitedReasons.length === 0 &&
      result.restrictedReasons.length === 0
    ) {
      result.compliant = true;
      result.riskLevel = RiskLevel.LOW;
    } else if (
      result.restrictedReasons.length > 0 &&
      result.prohibitedReasons.length === 0
    ) {
      result.compliant = false; // Non-compliant until proper documentation is provided
    }

    return result;
  }

  private addCountrySpecificRestrictions(
    result: ImportComplianceResult,
    originCountry: string,
    product: Product,
  ): void {
    // Add restrictions based on country of origin
    const restrictedCountries = ['北朝鮮', 'North Korea', 'DPRK'];

    if (
      restrictedCountries.some((country) =>
        originCountry.toLowerCase().includes(country.toLowerCase()),
      )
    ) {
      result.compliant = false;
      result.riskLevel = RiskLevel.PROHIBITED;
      result.prohibitedReasons.push(
        '経済制裁対象国からの輸入は禁止されています（外為法）',
      );
    }

    // Add specific country recommendations
    const developingCountries = [
      '中国',
      'China',
      'タイ',
      'Thailand',
      'ベトナム',
      'Vietnam',
    ];

    if (
      developingCountries.some((country) =>
        originCountry.toLowerCase().includes(country.toLowerCase()),
      )
    ) {
      result.recommendations.push(
        '原産地証明書の取得を推奨します。品質管理の確認も重要です。',
      );
    }
  }

  private addGeneralRecommendations(
    result: ImportComplianceResult,
    restrictions: ImportRestriction[],
  ): void {
    if (restrictions.length === 0) {
      result.recommendations.push(
        '特別な輸入制限は検出されませんでしたが、通関時に詳細な検査が必要な場合があります。',
      );
    }

    if (result.requiredDocuments.length > 0) {
      result.recommendations.push(
        '必要書類を事前に準備し、関連法規制の最新情報を確認してください。',
      );
    }

    if (result.requiredLicenses.length > 0) {
      result.recommendations.push(
        '必要な許可・免許の取得には時間がかかる場合があります。事前に手続きを開始してください。',
      );
    }

    if (result.estimatedTariff) {
      result.recommendations.push(
        `推定関税額: ${result.estimatedTariff.amount.toLocaleString()}円 (税率${result.estimatedTariff.rate}%)`,
      );
    }

    // General import recommendations
    result.recommendations.push(
      '通関士や貿易実務専門家への相談を推奨します。',
      '輸入前に税関への事前相談を検討してください。',
      'インボイス、パッキングリスト、船荷証券等の基本書類を準備してください。',
    );
  }

  // Get all restriction categories
  getAllRestrictionCategories(): string[] {
    return [...new Set(this.importRestrictions.map((r) => r.category))];
  }

  // Get restrictions by category
  getRestrictionsByCategory(category: string): ImportRestriction[] {
    return this.importRestrictions.filter((r) => r.category === category);
  }

  // Get tariff information for product
  getTariffEstimate(
    product: Product,
  ): { code: string; rate: number; amount: number } | null {
    const searchText = [
      product.name,
      product.description,
      product.category?.name,
    ]
      .join(' ')
      .toLowerCase();

    for (const restriction of this.importRestrictions) {
      if (restriction.tariffCode && restriction.tariffRate !== undefined) {
        if (
          restriction.keywords.some((keyword) =>
            searchText.includes(keyword.toLowerCase()),
          )
        ) {
          return {
            code: restriction.tariffCode,
            rate: restriction.tariffRate,
            amount: product.retailPrice
              ? product.retailPrice * (restriction.tariffRate / 100)
              : 0,
          };
        }
      }
    }

    return null;
  }

  // Check if product requires special import license
  requiresImportLicense(product: Product): boolean {
    const searchText = [
      product.name,
      product.description,
      product.category?.name,
    ]
      .join(' ')
      .toLowerCase();

    return this.importRestrictions.some(
      (restriction) =>
        restriction.licenses.length > 0 &&
        restriction.keywords.some((keyword) =>
          searchText.includes(keyword.toLowerCase()),
        ),
    );
  }
}
