import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { User, UserStatus } from '../../users/entities/user.entity';
import { Product, ProductStatus } from '../../products/entities/product.entity';
import { Cart, CartStatus } from '../../carts/entities/cart.entity';
import { CartItem } from '../../carts/entities/cart-item.entity';

export async function seedCarts(dataSource: DataSource): Promise<void> {
  const cartRepository = dataSource.getRepository(Cart);
  const cartItemRepository = dataSource.getRepository(CartItem);
  const userRepository = dataSource.getRepository(User);
  const productRepository = dataSource.getRepository(Product);

  // アクティブなユーザーと商品を取得
  const users = await userRepository.find({ 
    where: { status: UserStatus.ACTIVE },
    take: 30 
  });
  const products = await productRepository.find({ 
    where: { status: ProductStatus.ACTIVE },
    take: 50 
  });

  if (users.length === 0 || products.length === 0) {
    console.log('⚠️  No active users or products found. Please run user and product seeds first.');
    return;
  }

  const carts: Cart[] = [];

  // 各ユーザーの約60%にカートを作成（現実的な使用パターン）
  const usersWithCarts = faker.helpers.arrayElements(users, Math.floor(users.length * 0.6));

  for (const user of usersWithCarts) {
    // カートアイテム数（1-6アイテム、平均2-3アイテム）
    const itemCount = faker.helpers.weightedArrayElement([
      { weight: 30, value: 1 },
      { weight: 35, value: 2 },
      { weight: 20, value: 3 },
      { weight: 10, value: 4 },
      { weight: 3, value: 5 },
      { weight: 2, value: 6 },
    ]);

    const selectedProducts = faker.helpers.arrayElements(products, itemCount);
    
    // カート作成日時（過去7日以内）
    const createdAt = faker.date.recent({ days: 7 });
    const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

    let totalAmount = 0;
    const cartItems: Partial<CartItem>[] = [];

    // カートアイテムを作成
    for (const product of selectedProducts) {
      const quantity = faker.helpers.weightedArrayElement([
        { weight: 70, value: 1 },
        { weight: 20, value: 2 },
        { weight: 7, value: 3 },
        { weight: 2, value: 4 },
        { weight: 1, value: 5 },
      ]);

      const unitPrice = product.retailPrice || product.wholesalePrice * 1.5;
      const totalPrice = unitPrice * quantity;
      totalAmount += totalPrice;

      cartItems.push({
        productId: product.id,
        quantity,
        unitPrice,
        totalPrice,
        addedAt: faker.date.between({ from: createdAt, to: updatedAt }),
        productSnapshot: {
          name: product.name,
          brand: product.brand,
          imageUrl: product.primaryImageUrl,
        },
      });
    }

    // カート作成
    const cart = cartRepository.create({
      userId: user.id,
      totalAmount,
      totalItems: itemCount,
      status: faker.helpers.weightedArrayElement([
        { weight: 80, value: CartStatus.ACTIVE },
        { weight: 15, value: CartStatus.ABANDONED },
        { weight: 5, value: CartStatus.CONVERTED },
      ]),
      lastActivityAt: updatedAt,
      metadata: {
        source: 'seed',
        sessionId: faker.string.uuid(),
        browserInfo: {
          userAgent: faker.internet.userAgent(),
          language: faker.helpers.arrayElement(['ja-JP', 'en-US']),
        },
      },
      createdAt,
      updatedAt,
    });

    const savedCart = await cartRepository.save(cart);
    carts.push(savedCart);

    // カートアイテムを作成
    for (const itemData of cartItems) {
      const cartItem = cartItemRepository.create({
        ...itemData,
        cartId: savedCart.id,
      });
      await cartItemRepository.save(cartItem);
    }
  }

  console.log(`✅ Carts seeded successfully (${carts.length} carts with items created)`);
  
  // 統計情報を表示
  const statusCounts = await cartRepository
    .createQueryBuilder('cart')
    .select('cart.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('cart.status')
    .getRawMany();

  console.log('🛒 Cart Statistics:');
  statusCounts.forEach(stat => {
    console.log(`  ${stat.status}: ${stat.count}`);
  });

  const avgCartValue = await cartRepository
    .createQueryBuilder('cart')
    .select('AVG(cart.totalAmount)', 'avgValue')
    .where('cart.status = :status', { status: CartStatus.ACTIVE })
    .getRawOne();

  console.log(`💰 Average Active Cart Value: ¥${Math.round(avgCartValue?.avgValue || 0).toLocaleString()}`);
}