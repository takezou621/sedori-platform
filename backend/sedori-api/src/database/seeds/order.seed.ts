import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { User, UserStatus } from '../../users/entities/user.entity';
import { Product, ProductStatus } from '../../products/entities/product.entity';
import { Order, OrderStatus, PaymentStatus } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

export async function seedOrders(dataSource: DataSource): Promise<void> {
  const orderRepository = dataSource.getRepository(Order);
  const orderItemRepository = dataSource.getRepository(OrderItem);
  const userRepository = dataSource.getRepository(User);
  const productRepository = dataSource.getRepository(Product);

  // アクティブなユーザーと商品を取得
  const users = await userRepository.find({ 
    where: { status: UserStatus.ACTIVE },
    take: 50 
  });
  const products = await productRepository.find({ 
    where: { status: ProductStatus.ACTIVE },
    take: 100 
  });

  if (users.length === 0 || products.length === 0) {
    console.log('⚠️  No active users or products found. Please run user and product seeds first.');
    return;
  }

  const orders: Order[] = [];
  let orderCounter = 1;

  // 過去6ヶ月分の注文を生成
  for (let i = 0; i < 200; i++) {
    const user = faker.helpers.arrayElement(users);
    const orderDate = faker.date.recent({ days: 180 });
    
    // 注文ステータスの決定（時間経過に基づく）
    const daysSinceOrder = Math.floor((new Date().getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    let status: OrderStatus;
    let paymentStatus: PaymentStatus;
    let deliveredAt: Date | undefined;
    let estimatedDeliveryDate: Date | undefined;
    
    if (daysSinceOrder > 14) {
      status = faker.helpers.weightedArrayElement([
        { weight: 85, value: OrderStatus.DELIVERED },
        { weight: 10, value: OrderStatus.CANCELLED },
        { weight: 3, value: OrderStatus.REFUNDED },
        { weight: 2, value: OrderStatus.SHIPPED },
      ]);
    } else if (daysSinceOrder > 7) {
      status = faker.helpers.weightedArrayElement([
        { weight: 60, value: OrderStatus.DELIVERED },
        { weight: 25, value: OrderStatus.SHIPPED },
        { weight: 10, value: OrderStatus.PROCESSING },
        { weight: 5, value: OrderStatus.CANCELLED },
      ]);
    } else if (daysSinceOrder > 3) {
      status = faker.helpers.weightedArrayElement([
        { weight: 40, value: OrderStatus.SHIPPED },
        { weight: 30, value: OrderStatus.PROCESSING },
        { weight: 20, value: OrderStatus.CONFIRMED },
        { weight: 7, value: OrderStatus.DELIVERED },
        { weight: 3, value: OrderStatus.CANCELLED },
      ]);
    } else {
      status = faker.helpers.weightedArrayElement([
        { weight: 50, value: OrderStatus.CONFIRMED },
        { weight: 30, value: OrderStatus.PROCESSING },
        { weight: 15, value: OrderStatus.PENDING },
        { weight: 5, value: OrderStatus.CANCELLED },
      ]);
    }

    // 支払いステータス
    if (status === OrderStatus.CANCELLED) {
      paymentStatus = faker.helpers.arrayElement([PaymentStatus.FAILED, PaymentStatus.REFUNDED]);
    } else if (status === OrderStatus.REFUNDED) {
      paymentStatus = PaymentStatus.REFUNDED;
    } else if (status === OrderStatus.PENDING) {
      paymentStatus = PaymentStatus.PENDING;
    } else {
      paymentStatus = PaymentStatus.PAID;
    }

    // 配送日の設定
    if (status === OrderStatus.DELIVERED) {
      deliveredAt = faker.date.between({ from: orderDate, to: new Date() });
    } else if (status === OrderStatus.SHIPPED || status === OrderStatus.PROCESSING) {
      estimatedDeliveryDate = faker.date.soon({ days: 7, refDate: orderDate });
    }

    // 配送先住所の生成
    const shippingAddress = {
      fullName: faker.person.fullName(),
      company: faker.helpers.maybe(() => faker.company.name(), { probability: 0.3 }),
      address1: faker.location.streetAddress(),
      address2: faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.4 }),
      city: faker.location.city(),
      state: faker.location.state(),
      postalCode: faker.location.zipCode(),
      country: 'Japan',
      phone: faker.helpers.maybe(() => faker.phone.number(), { probability: 0.8 }),
    };

    // 注文アイテムの生成（1-5アイテム）
    const itemCount = faker.number.int({ min: 1, max: 5 });
    const selectedProducts = faker.helpers.arrayElements(products, itemCount);
    
    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const product of selectedProducts) {
      const quantity = faker.number.int({ min: 1, max: 3 });
      const unitPrice = product.retailPrice || product.wholesalePrice * 1.5;
      const totalPrice = unitPrice * quantity;
      
      subtotal += totalPrice;

      orderItems.push({
        productId: product.id,
        quantity,
        unitPrice,
        totalPrice,
        productSnapshot: {
          name: product.name,
          sku: product.sku,
          brand: product.brand,
          model: product.model,
          imageUrl: product.primaryImageUrl,
          specifications: product.specifications,
        },
        metadata: {
          wholesalePrice: product.wholesalePrice,
          profit: (unitPrice - product.wholesalePrice) * quantity,
        },
      });
    }

    // 税金と送料の計算
    const taxRate = 0.10; // 10% tax
    const taxAmount = Math.round(subtotal * taxRate);
    const shippingAmount = subtotal > 5000 ? 0 : 500; // Free shipping over 5000 yen
    const discountAmount = faker.helpers.maybe(() => 
      faker.number.int({ min: 100, max: Math.min(1000, subtotal * 0.1) }), 
      { probability: 0.2 }
    ) || 0;
    
    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

    const order = orderRepository.create({
      orderNumber: `ORD-${String(orderCounter).padStart(6, '0')}`,
      userId: user.id,
      status,
      paymentStatus,
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount,
      totalAmount,
      orderDate,
      estimatedDeliveryDate,
      deliveredAt,
      shippingAddress,
      billingAddress: shippingAddress, // Same as shipping for simplicity
      notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
      trackingNumber: status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED ? 
        `TN${faker.string.numeric(12)}` : undefined,
      paymentMethod: faker.helpers.arrayElement(['credit_card', 'bank_transfer', 'cash_on_delivery', 'digital_wallet']),
      paymentTransactionId: paymentStatus === PaymentStatus.PAID ? 
        `TXN_${faker.string.alphanumeric(16).toUpperCase()}` : undefined,
      metadata: {
        source: 'seed',
        deviceType: faker.helpers.arrayElement(['desktop', 'mobile', 'tablet']),
        couponUsed: discountAmount > 0,
        isGift: faker.datatype.boolean({ probability: 0.1 }),
      },
    });

    const savedOrder = await orderRepository.save(order);
    orders.push(savedOrder);

    // 注文アイテムを作成
    for (const itemData of orderItems) {
      const orderItem = orderItemRepository.create({
        ...itemData,
        orderId: savedOrder.id,
      });
      await orderItemRepository.save(orderItem);
    }

    orderCounter++;
  }

  console.log(`✅ Orders seeded successfully (${orders.length} orders with items created)`);
  
  // 統計情報を表示
  const statusCounts = await orderRepository
    .createQueryBuilder('order')
    .select('order.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('order.status')
    .getRawMany();

  console.log('📊 Order Statistics:');
  statusCounts.forEach(stat => {
    console.log(`  ${stat.status}: ${stat.count}`);
  });

  const totalRevenue = await orderRepository
    .createQueryBuilder('order')
    .select('SUM(order.totalAmount)', 'totalRevenue')
    .where('order.paymentStatus = :status', { status: PaymentStatus.PAID })
    .getRawOne();

  console.log(`💰 Total Revenue: ¥${Math.round(totalRevenue?.totalRevenue || 0).toLocaleString()}`);
}