import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'sedori',
  password: process.env.DATABASE_PASSWORD || 'sedori123',
  database: process.env.DATABASE_NAME || 'sedori',
  entities: [User, Category, Product, Sale, Recommendation],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

export default AppDataSource;
