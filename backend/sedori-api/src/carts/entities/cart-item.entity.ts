import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Cart } from './cart.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('cart_items')
@Index('idx_cart_items_cart', ['cartId'])
@Index('idx_cart_items_product', ['productId'])
@Unique('uk_cart_product', ['cartId', 'productId'])
export class CartItem extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  cartId: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @Column({ type: 'uuid', nullable: false })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int', nullable: false, default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  totalPrice: number;

  @Column({
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  addedAt: Date;

  @Column({ type: 'json', nullable: true })
  productSnapshot?: {
    name: string;
    brand?: string;
    imageUrl?: string;
  };
}
