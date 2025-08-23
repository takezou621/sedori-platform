import { DataSource } from 'typeorm';
import AppDataSource from '../../config/data-source';
import { seedCategories } from './category.seed';
import { seedUsers } from './user.seed';
import { seedProducts } from './product.seed';
import { seedOrders } from './order.seed';
import { seedCarts } from './cart.seed';

async function runSeeds() {
  console.log('🌱 Starting database seeding...');
  console.log('=====================================');

  try {
    // データソースを初期化
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }

    // 外部キー制約を一時的に無効化してテーブルをクリア
    console.log('\n1️⃣ Clearing existing data...');
    const tableNames = [
      'cart_items', 'carts', 'order_items', 'orders', 
      'products', 'categories', 'users', 'sales', 'recommendations'
    ];
    
    // 外部キー制約を一時的に無効化
    await AppDataSource.query('SET session_replication_role = replica;');
    
    // テーブルをクリア
    for (const tableName of tableNames) {
      try {
        await AppDataSource.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
        console.log(`  ✅ Cleared ${tableName}`);
      } catch (error) {
        console.log(`  ⚠️ Could not clear ${tableName}: ${error.message}`);
      }
    }
    
    // 外部キー制約を再有効化
    await AppDataSource.query('SET session_replication_role = DEFAULT;');

    console.log('\n2️⃣ Seeding Categories...');
    await seedCategories(AppDataSource);

    console.log('\n3️⃣ Seeding Users...');
    await seedUsers(AppDataSource);

    console.log('\n4️⃣ Seeding Products...');
    await seedProducts(AppDataSource);

    console.log('\n5️⃣ Seeding Orders...');
    await seedOrders(AppDataSource);

    console.log('\n6️⃣ Seeding Carts...');
    await seedCarts(AppDataSource);

    console.log('\n=====================================');
    console.log('🎉 Database seeding completed successfully!');
    console.log('=====================================');

    // 最終統計情報を表示
    await showFinalStats(AppDataSource);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

async function showFinalStats(dataSource: DataSource) {
  try {
    console.log('\n📊 Final Database Statistics:');
    console.log('=====================================');

    const categoryCount = await dataSource.query('SELECT COUNT(*) as count FROM categories');
    console.log(`📁 Categories: ${categoryCount[0].count}`);

    const userCount = await dataSource.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Users: ${userCount[0].count}`);

    const productCount = await dataSource.query('SELECT COUNT(*) as count FROM products');
    console.log(`📦 Products: ${productCount[0].count}`);

    const orderCount = await dataSource.query('SELECT COUNT(*) as count FROM orders');
    console.log(`📋 Orders: ${orderCount[0].count}`);

    const cartCount = await dataSource.query('SELECT COUNT(*) as count FROM carts');
    console.log(`🛒 Active Carts: ${cartCount[0].count}`);

    // 売上統計
    const revenueStats = await dataSource.query(`
      SELECT 
        SUM(totalAmount) as totalRevenue,
        AVG(totalAmount) as avgOrderValue,
        COUNT(*) as paidOrderCount
      FROM orders 
      WHERE paymentStatus = 'paid'
    `);

    if (revenueStats[0].paidOrderCount > 0) {
      console.log(`💰 Total Revenue: ¥${Math.round(revenueStats[0].totalRevenue || 0).toLocaleString()}`);
      console.log(`📈 Average Order Value: ¥${Math.round(revenueStats[0].avgOrderValue || 0).toLocaleString()}`);
    }

    console.log('=====================================');
    console.log('🚀 Your Sedori Platform is ready with sample data!');
    
  } catch (error) {
    console.log('⚠️  Could not retrieve final statistics:', error.message);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  runSeeds();
}

export { runSeeds };