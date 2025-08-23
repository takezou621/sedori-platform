import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Product, ProductStatus, ProductCondition } from '../../products/entities/product.entity';
import { Category } from '../../categories/entities/category.entity';

export async function seedProducts(dataSource: DataSource): Promise<void> {
  const productRepository = dataSource.getRepository(Product);
  const categoryRepository = dataSource.getRepository(Category);

  // すべてのカテゴリを取得（子カテゴリのみ）
  const categories = await categoryRepository.find({
    where: { parentId: undefined },
    relations: ['children'],
  });

  const childCategories: Category[] = [];
  categories.forEach(parent => {
    if (parent.children) {
      childCategories.push(...parent.children);
    }
  });

  if (childCategories.length === 0) {
    console.log('⚠️  No child categories found. Please run category seed first.');
    return;
  }

  // 商品データテンプレート
  const productTemplates = [
    // Electronics
    {
      categorySlug: 'smartphones',
      products: [
        { name: 'iPhone 15 Pro Max', brand: 'Apple', model: '15 Pro Max', wholesalePrice: 120000, retailPrice: 159800, marketPrice: 155000 },
        { name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', model: 'S24 Ultra', wholesalePrice: 110000, retailPrice: 149800, marketPrice: 145000 },
        { name: 'Google Pixel 8 Pro', brand: 'Google', model: 'Pixel 8 Pro', wholesalePrice: 85000, retailPrice: 119800, marketPrice: 115000 },
        { name: 'iPhone 14', brand: 'Apple', model: '14', wholesalePrice: 95000, retailPrice: 129800, marketPrice: 125000 },
        { name: 'OnePlus 12', brand: 'OnePlus', model: '12', wholesalePrice: 70000, retailPrice: 99800, marketPrice: 95000 },
      ],
    },
    {
      categorySlug: 'laptops',
      products: [
        { name: 'MacBook Air M2', brand: 'Apple', model: 'MacBook Air', wholesalePrice: 135000, retailPrice: 179800, marketPrice: 175000 },
        { name: 'ThinkPad X1 Carbon', brand: 'Lenovo', model: 'X1 Carbon', wholesalePrice: 180000, retailPrice: 249800, marketPrice: 240000 },
        { name: 'Dell XPS 13', brand: 'Dell', model: 'XPS 13', wholesalePrice: 120000, retailPrice: 169800, marketPrice: 165000 },
        { name: 'Surface Laptop 5', brand: 'Microsoft', model: 'Surface Laptop 5', wholesalePrice: 110000, retailPrice: 149800, marketPrice: 145000 },
        { name: 'MacBook Pro 14"', brand: 'Apple', model: 'MacBook Pro', wholesalePrice: 220000, retailPrice: 299800, marketPrice: 290000 },
      ],
    },
    {
      categorySlug: 'audio-video',
      products: [
        { name: 'Sony WH-1000XM5', brand: 'Sony', model: 'WH-1000XM5', wholesalePrice: 35000, retailPrice: 49800, marketPrice: 47000 },
        { name: 'AirPods Pro 2', brand: 'Apple', model: 'AirPods Pro', wholesalePrice: 25000, retailPrice: 39800, marketPrice: 37000 },
        { name: 'Bose QuietComfort', brand: 'Bose', model: 'QuietComfort', wholesalePrice: 30000, retailPrice: 45800, marketPrice: 43000 },
        { name: 'Marshall Acton III', brand: 'Marshall', model: 'Acton III', wholesalePrice: 18000, retailPrice: 29800, marketPrice: 27000 },
        { name: 'JBL Flip 6', brand: 'JBL', model: 'Flip 6', wholesalePrice: 8000, retailPrice: 14800, marketPrice: 13000 },
      ],
    },
    // Books
    {
      categorySlug: 'business-books',
      products: [
        { name: 'The Lean Startup', brand: 'Crown Business', model: 'Paperback', wholesalePrice: 1200, retailPrice: 2200, marketPrice: 2000 },
        { name: 'Zero to One', brand: 'Crown Business', model: 'Hardcover', wholesalePrice: 1500, retailPrice: 2800, marketPrice: 2500 },
        { name: 'Good to Great', brand: 'HarperBusiness', model: 'Paperback', wholesalePrice: 1100, retailPrice: 2100, marketPrice: 1900 },
        { name: 'The Hard Thing About Hard Things', brand: 'Harper Business', model: 'Hardcover', wholesalePrice: 1600, retailPrice: 2900, marketPrice: 2600 },
        { name: '4-Hour Workweek', brand: 'Crown', model: 'Paperback', wholesalePrice: 1000, retailPrice: 1900, marketPrice: 1700 },
      ],
    },
    {
      categorySlug: 'technology-books',
      products: [
        { name: 'Clean Code', brand: 'Prentice Hall', model: 'Paperback', wholesalePrice: 3200, retailPrice: 5800, marketPrice: 5500 },
        { name: 'Design Patterns', brand: 'Addison-Wesley', model: 'Hardcover', wholesalePrice: 4500, retailPrice: 7800, marketPrice: 7200 },
        { name: 'You Don\'t Know JS', brand: 'O\'Reilly Media', model: 'Series', wholesalePrice: 2800, retailPrice: 4800, marketPrice: 4500 },
        { name: 'System Design Interview', brand: 'ByteByteGo', model: 'Paperback', wholesalePrice: 2500, retailPrice: 4200, marketPrice: 4000 },
        { name: 'Cracking the Coding Interview', brand: 'CareerCup', model: '6th Edition', wholesalePrice: 2200, retailPrice: 3800, marketPrice: 3500 },
      ],
    },
    // Fashion
    {
      categorySlug: 'mens-clothing',
      products: [
        { name: 'Uniqlo Heattech Crew Neck T-Shirt', brand: 'Uniqlo', model: 'Heattech', wholesalePrice: 800, retailPrice: 1500, marketPrice: 1400 },
        { name: 'Nike Dri-FIT Training Shorts', brand: 'Nike', model: 'Dri-FIT', wholesalePrice: 2000, retailPrice: 3800, marketPrice: 3500 },
        { name: 'Levi\'s 501 Original Jeans', brand: 'Levi\'s', model: '501', wholesalePrice: 4500, retailPrice: 8800, marketPrice: 8000 },
        { name: 'Champion Reverse Weave Hoodie', brand: 'Champion', model: 'Reverse Weave', wholesalePrice: 3200, retailPrice: 6800, marketPrice: 6200 },
        { name: 'Adidas Originals Track Jacket', brand: 'Adidas', model: 'Originals', wholesalePrice: 4000, retailPrice: 7800, marketPrice: 7200 },
      ],
    },
    // Home & Garden
    {
      categorySlug: 'kitchen',
      products: [
        { name: 'KitchenAid Stand Mixer', brand: 'KitchenAid', model: 'Artisan', wholesalePrice: 35000, retailPrice: 58000, marketPrice: 55000 },
        { name: 'Vitamix Professional Blender', brand: 'Vitamix', model: 'Professional', wholesalePrice: 42000, retailPrice: 68000, marketPrice: 65000 },
        { name: 'Instant Pot Duo 7-in-1', brand: 'Instant Pot', model: 'Duo', wholesalePrice: 8000, retailPrice: 14800, marketPrice: 13500 },
        { name: 'Breville Smart Oven', brand: 'Breville', model: 'Smart Oven', wholesalePrice: 18000, retailPrice: 32000, marketPrice: 30000 },
        { name: 'Cuisinart Coffee Maker', brand: 'Cuisinart', model: 'DCC-3200', wholesalePrice: 6500, retailPrice: 12800, marketPrice: 12000 },
      ],
    },
  ];

  const products: Partial<Product>[] = [];

  // 各カテゴリの商品を生成
  for (const template of productTemplates) {
    const category = childCategories.find(cat => cat.slug === template.categorySlug);
    if (!category) continue;

    for (let i = 0; i < template.products.length; i++) {
      const productData = template.products[i];
      
      // 利益計算
      const profit = productData.retailPrice - productData.wholesalePrice;
      const profitMargin = (profit / productData.retailPrice) * 100;
      const roi = (profit / productData.wholesalePrice) * 100;

      // 市場データの生成
      const amazonPrice = productData.marketPrice * faker.number.float({ min: 0.95, max: 1.05 });
      const rakutenPrice = productData.marketPrice * faker.number.float({ min: 0.92, max: 1.08 });
      const yahooPrice = productData.marketPrice * faker.number.float({ min: 0.94, max: 1.06 });

      products.push({
        name: productData.name,
        description: faker.lorem.paragraphs(2),
        sku: `${template.categorySlug.toUpperCase()}-${String(i + 1).padStart(3, '0')}-${faker.string.alphanumeric(4).toUpperCase()}`,
        brand: productData.brand,
        model: productData.model,
        categoryId: category.id,
        wholesalePrice: productData.wholesalePrice,
        retailPrice: productData.retailPrice,
        marketPrice: productData.marketPrice,
        currency: 'JPY',
        condition: faker.helpers.weightedArrayElement([
          { weight: 70, value: ProductCondition.NEW },
          { weight: 20, value: ProductCondition.LIKE_NEW },
          { weight: 8, value: ProductCondition.VERY_GOOD },
          { weight: 2, value: ProductCondition.GOOD },
        ]),
        status: faker.helpers.weightedArrayElement([
          { weight: 80, value: ProductStatus.ACTIVE },
          { weight: 15, value: ProductStatus.INACTIVE },
          { weight: 4, value: ProductStatus.OUT_OF_STOCK },
          { weight: 1, value: ProductStatus.DISCONTINUED },
        ]),
        supplier: faker.company.name(),
        supplierUrl: faker.internet.url(),
        stockQuantity: faker.number.int({ min: 0, max: 500 }),
        minOrderQuantity: faker.number.int({ min: 1, max: 5 }),
        maxOrderQuantity: faker.number.int({ min: 50, max: 200 }),
        weight: faker.number.float({ min: 0.1, max: 10, fractionDigits: 2 }),
        weightUnit: 'kg',
        dimensions: `${faker.number.int({ min: 10, max: 50 })}x${faker.number.int({ min: 10, max: 30 })}x${faker.number.int({ min: 5, max: 20 })} cm`,
        images: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => 
          faker.image.url({ width: 800, height: 600 })
        ),
        primaryImageUrl: faker.image.url({ width: 800, height: 600 }),
        specifications: {
          color: faker.color.human(),
          material: faker.helpers.arrayElement(['Plastic', 'Metal', 'Glass', 'Wood', 'Fabric', 'Leather']),
          warranty: `${faker.number.int({ min: 6, max: 36 })} months`,
          countryOfOrigin: faker.location.country(),
        },
        tags: faker.helpers.arrayElements([
          'bestseller', 'new-arrival', 'limited-edition', 'eco-friendly', 
          'premium', 'budget-friendly', 'trending', 'recommended'
        ], { min: 1, max: 4 }),
        viewCount: faker.number.int({ min: 0, max: 10000 }),
        averageRating: faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 }),
        reviewCount: faker.number.int({ min: 0, max: 500 }),
        lastUpdatedAt: faker.date.recent({ days: 30 }),
        marketData: {
          amazonPrice: Math.round(amazonPrice),
          rakutenPrice: Math.round(rakutenPrice),
          yahooPrice: Math.round(yahooPrice),
          mercariPrice: Math.round(productData.marketPrice * faker.number.float({ min: 0.7, max: 0.9 })),
          averageSellingPrice: Math.round((amazonPrice + rakutenPrice + yahooPrice) / 3),
          competitorCount: faker.number.int({ min: 3, max: 50 }),
          demandScore: faker.number.float({ min: 1, max: 10, fractionDigits: 1 }),
          trendScore: faker.number.float({ min: -5, max: 5, fractionDigits: 1 }),
          lastScrapedAt: faker.date.recent({ days: 1 }),
        },
        profitabilityData: {
          estimatedProfit: Math.round(profit),
          profitMargin: Math.round(profitMargin * 100) / 100,
          roi: Math.round(roi * 100) / 100,
          breakEvenDays: faker.number.int({ min: 7, max: 90 }),
          riskLevel: profitMargin > 30 ? 'low' : profitMargin > 15 ? 'medium' : 'high',
          calculatedAt: faker.date.recent({ days: 1 }),
        },
        metadata: {
          source: 'seed',
          importedAt: new Date(),
          lastPriceUpdate: faker.date.recent({ days: 7 }),
        },
      });
    }
  }

  // 追加でランダムな商品を生成
  for (let i = 0; i < 50; i++) {
    const randomCategory = faker.helpers.arrayElement(childCategories);
    const wholesalePrice = faker.number.int({ min: 500, max: 100000 });
    const markup = faker.number.float({ min: 1.2, max: 2.5 });
    const retailPrice = Math.round(wholesalePrice * markup);
    const marketPrice = Math.round(retailPrice * faker.number.float({ min: 0.9, max: 1.1 }));
    
    const profit = retailPrice - wholesalePrice;
    const profitMargin = (profit / retailPrice) * 100;
    const roi = (profit / wholesalePrice) * 100;

    products.push({
      name: faker.commerce.productName(),
      description: faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 })),
      sku: `RAND-${faker.string.alphanumeric(8).toUpperCase()}`,
      brand: faker.company.name(),
      model: faker.commerce.productAdjective(),
      categoryId: randomCategory.id,
      wholesalePrice,
      retailPrice,
      marketPrice,
      currency: 'JPY',
      condition: faker.helpers.weightedArrayElement([
        { weight: 60, value: ProductCondition.NEW },
        { weight: 25, value: ProductCondition.LIKE_NEW },
        { weight: 10, value: ProductCondition.VERY_GOOD },
        { weight: 4, value: ProductCondition.GOOD },
        { weight: 1, value: ProductCondition.ACCEPTABLE },
      ]),
      status: faker.helpers.weightedArrayElement([
        { weight: 75, value: ProductStatus.ACTIVE },
        { weight: 20, value: ProductStatus.INACTIVE },
        { weight: 4, value: ProductStatus.OUT_OF_STOCK },
        { weight: 1, value: ProductStatus.DISCONTINUED },
      ]),
      supplier: faker.company.name(),
      supplierUrl: faker.internet.url(),
      stockQuantity: faker.number.int({ min: 0, max: 1000 }),
      minOrderQuantity: faker.number.int({ min: 1, max: 10 }),
      maxOrderQuantity: faker.number.int({ min: 20, max: 500 }),
      weight: faker.number.float({ min: 0.05, max: 50, fractionDigits: 2 }),
      weightUnit: 'kg',
      dimensions: `${faker.number.int({ min: 5, max: 100 })}x${faker.number.int({ min: 5, max: 80 })}x${faker.number.int({ min: 2, max: 50 })} cm`,
      images: Array.from({ length: faker.number.int({ min: 1, max: 6 }) }, () => 
        faker.image.url({ width: 800, height: 600 })
      ),
      primaryImageUrl: faker.image.url({ width: 800, height: 600 }),
      specifications: {
        color: faker.color.human(),
        material: faker.helpers.arrayElement(['Plastic', 'Metal', 'Glass', 'Wood', 'Fabric', 'Ceramic', 'Leather', 'Silicon']),
        warranty: `${faker.number.int({ min: 3, max: 60 })} months`,
        countryOfOrigin: faker.location.country(),
        weight: `${faker.number.float({ min: 0.1, max: 10 })} kg`,
      },
      tags: faker.helpers.arrayElements([
        'bestseller', 'new-arrival', 'limited-edition', 'eco-friendly', 'premium', 
        'budget-friendly', 'trending', 'recommended', 'featured', 'sale'
      ], { min: 0, max: 5 }),
      viewCount: faker.number.int({ min: 0, max: 50000 }),
      averageRating: faker.number.float({ min: 2.0, max: 5.0, fractionDigits: 1 }),
      reviewCount: faker.number.int({ min: 0, max: 1000 }),
      lastUpdatedAt: faker.date.recent({ days: 60 }),
      marketData: {
        amazonPrice: Math.round(marketPrice * faker.number.float({ min: 0.95, max: 1.1 })),
        rakutenPrice: Math.round(marketPrice * faker.number.float({ min: 0.9, max: 1.15 })),
        yahooPrice: Math.round(marketPrice * faker.number.float({ min: 0.92, max: 1.08 })),
        mercariPrice: Math.round(marketPrice * faker.number.float({ min: 0.6, max: 0.9 })),
        averageSellingPrice: marketPrice,
        competitorCount: faker.number.int({ min: 1, max: 100 }),
        demandScore: faker.number.float({ min: 0.5, max: 10, fractionDigits: 1 }),
        trendScore: faker.number.float({ min: -10, max: 10, fractionDigits: 1 }),
        lastScrapedAt: faker.date.recent({ days: 3 }),
      },
      profitabilityData: {
        estimatedProfit: Math.round(profit),
        profitMargin: Math.round(profitMargin * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        breakEvenDays: faker.number.int({ min: 3, max: 180 }),
        riskLevel: profitMargin > 25 ? 'low' : profitMargin > 10 ? 'medium' : 'high',
        calculatedAt: faker.date.recent({ days: 2 }),
      },
      metadata: {
        source: 'seed',
        importedAt: faker.date.recent({ days: 30 }),
        lastPriceUpdate: faker.date.recent({ days: 14 }),
        popularity: faker.helpers.arrayElement(['high', 'medium', 'low']),
      },
    });
  }

  // バッチで商品を作成（パフォーマンス向上のため）
  const batchSize = 50;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const productEntities = batch.map(productData => productRepository.create(productData));
    await productRepository.save(productEntities);
  }

  console.log(`✅ Products seeded successfully (${products.length} products created)`);
}