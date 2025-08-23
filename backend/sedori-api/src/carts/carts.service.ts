import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartStatus } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { AddToCartDto, UpdateCartItemDto } from './dto';

@Injectable()
export class CartsService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId, status: CartStatus.ACTIVE },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartRepository.create({
        userId,
        status: CartStatus.ACTIVE,
        totalAmount: 0,
        totalItems: 0,
        lastActivityAt: new Date(),
      });
      cart = await this.cartRepository.save(cart);
    }

    // Manually load products for cart items that don't have product loaded (including soft-deleted ones)
    if (cart.items && cart.items.length > 0) {
      for (const item of cart.items) {
        if (!item.product) {
          // Try to load product even if soft-deleted
          const product = await this.productRepository.findOne({
            where: { id: item.productId },
            withDeleted: true,
          });
          if (product) {
            item.product = product;
          }
        }
      }
    }

    return cart;
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    const { productId, quantity, metadata } = addToCartDto;

    // Verify product exists and is available
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('商品が見つかりません');
    }

    if (product.status !== 'active') {
      throw new BadRequestException('この商品は現在購入できません');
    }

    // Use retry with exponential backoff for concurrent requests
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.cartRepository.manager.transaction(
          async (transactionalEntityManager) => {
            // Get or create cart within transaction
            let cart = await transactionalEntityManager.findOne(Cart, {
              where: { userId, status: CartStatus.ACTIVE }
            });

            if (cart) {
              // Load relations separately to avoid lock issues
              cart = await transactionalEntityManager.findOne(Cart, {
                where: { id: cart.id },
                relations: ['items', 'items.product']
              });
            }

            if (!cart) {
              cart = transactionalEntityManager.create(Cart, {
                userId,
                status: CartStatus.ACTIVE,
                totalAmount: 0,
                totalItems: 0,
                lastActivityAt: new Date(),
              });
              cart = await transactionalEntityManager.save(cart);
            }

            // Use upsert pattern for cart item
            const unitPrice = product.wholesalePrice;
            
            // Try to find existing item first
            let cartItem = await transactionalEntityManager.findOne(CartItem, {
              where: { cartId: cart.id, productId }
            });

            if (cartItem) {
              // Update existing item atomically
              const result = await transactionalEntityManager.query(
                `UPDATE cart_items 
                 SET quantity = quantity + $1, 
                     "totalPrice" = "totalPrice" + ($2::decimal * $1),
                     "updatedAt" = NOW()
                 WHERE id = $3 AND "cartId" = $4 AND "productId" = $5
                 RETURNING id, quantity, "totalPrice"`,
                [quantity, unitPrice, cartItem.id, cart.id, productId],
              );
              
              if (result.length === 0) {
                // Item was deleted concurrently, create new one
                throw new Error('RETRY_NEEDED');
              }
            } else {
              // Try to insert new item with ON CONFLICT handling
              try {
                await transactionalEntityManager.query(
                  `INSERT INTO cart_items ("cartId", "productId", quantity, "unitPrice", "totalPrice", "productSnapshot", "addedAt", "createdAt", "updatedAt")
                   VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
                   ON CONFLICT ("cartId", "productId") DO UPDATE SET
                   quantity = cart_items.quantity + EXCLUDED.quantity,
                   "totalPrice" = cart_items."totalPrice" + EXCLUDED."totalPrice",
                   "updatedAt" = NOW()`,
                  [
                    cart.id,
                    productId,
                    quantity,
                    unitPrice,
                    unitPrice * quantity,
                    JSON.stringify({
                      name: product.name,
                      brand: product.brand,
                      imageUrl: product.primaryImageUrl,
                    })
                  ]
                );
              } catch (error) {
                // If still failing, might be a different constraint issue
                if (attempt === maxRetries - 1) {
                  throw error;
                }
                throw new Error('RETRY_NEEDED');
              }
            }

            // Update cart totals
            await this.updateCartTotals(cart.id, transactionalEntityManager);
            
            // Return updated cart
            return await transactionalEntityManager.findOne(Cart, {
              where: { id: cart.id },
              relations: ['items', 'items.product'],
            });
          },
        );
      } catch (error) {
        if (error.message === 'RETRY_NEEDED' && attempt < maxRetries - 1) {
          // Wait with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 10));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Failed to add item to cart after retries');
  }

  private async updateCartTotals(
    cartId: string, 
    transactionalEntityManager?: any
  ): Promise<void> {
    const manager = transactionalEntityManager || this.cartRepository.manager;
    
    // Calculate totals from cart items
    const result = await manager.query(
      `UPDATE carts 
       SET "totalAmount" = (
         SELECT COALESCE(SUM("totalPrice"), 0) 
         FROM cart_items 
         WHERE "cartId" = $1 AND "deletedAt" IS NULL
       ),
       "totalItems" = (
         SELECT COALESCE(SUM(quantity), 0) 
         FROM cart_items 
         WHERE "cartId" = $1 AND "deletedAt" IS NULL
       ),
       "lastActivityAt" = NOW(),
       "updatedAt" = NOW()
       WHERE id = $1`,
      [cartId]
    );
  }

  async getCart(userId: string): Promise<Cart> {
    return await this.getOrCreateCart(userId);
  }

  // Keep the old methods for backwards compatibility
  private async handleRaceCondition(cart: Cart, productId: string, quantity: number, unitPrice: number): Promise<void> {
    // This method is now deprecated as we use transactions
    const existingItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      await this.cartItemRepository.manager.transaction(
        async (transactionalEntityManager) => {
          await transactionalEntityManager.query(
            `UPDATE cart_items 
             SET quantity = quantity + $1, 
                 "totalPrice" = "totalPrice" + ($2::decimal * $1),
                 "updatedAt" = NOW()
             WHERE id = $3`,
            [quantity, unitPrice, existingItem.id],
          );
        },
      );
      // Unexpected error, re-throw
      throw new Error('Failed to update cart item');
    }
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    const { quantity } = updateCartItemDto;

    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId },
      relations: ['cart'],
    });

    if (!cartItem) {
      throw new NotFoundException('カート項目が見つかりません');
    }

    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException(
        'このカート項目にアクセスする権限がありません',
      );
    }

    cartItem.quantity = quantity;
    cartItem.totalPrice = cartItem.unitPrice * quantity;

    await this.cartItemRepository.save(cartItem);

    // Update cart totals
    await this.updateCartTotals(cartItem.cartId);

    return this.getCartById(cartItem.cartId);
  }

  async removeFromCart(userId: string, cartItemId: string): Promise<Cart> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId },
      relations: ['cart'],
    });

    if (!cartItem) {
      throw new NotFoundException('カート項目が見つかりません');
    }

    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException(
        'このカート項目にアクセスする権限がありません',
      );
    }

    const cartId = cartItem.cartId;
    await this.cartItemRepository.remove(cartItem);

    // Update cart totals
    await this.updateCartTotals(cartId);

    return this.getCartById(cartId);
  }

  async clearCart(userId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    await this.cartItemRepository.delete({ cartId: cart.id });

    // Update cart totals
    await this.updateCartTotals(cart.id);

    return this.getCartById(cart.id);
  }

  async getCart(userId: string): Promise<Cart> {
    // Always get cart with products loaded to ensure order creation works
    let cart = await this.cartRepository.findOne({
      where: { userId, status: CartStatus.ACTIVE },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartRepository.create({
        userId,
        status: CartStatus.ACTIVE,
        totalAmount: 0,
        totalItems: 0,
        lastActivityAt: new Date(),
      });
      cart = await this.cartRepository.save(cart);
    }

    // Ensure all cart items have their product loaded (including soft-deleted ones)
    if (cart.items && cart.items.length > 0) {
      for (const item of cart.items) {
        if (!item.product) {
          // Try to load product even if soft-deleted
          const product = await this.productRepository.findOne({
            where: { id: item.productId },
            withDeleted: true,
          });
          if (product) {
            item.product = product;
          } else {
            // If product is completely gone, we should handle this gracefully
            console.warn(
              `Product ${item.productId} not found for cart item ${item.id}`,
            );
          }
        }
      }
    }

    return cart;
  }

  private async getCartById(cartId: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      throw new NotFoundException('カートが見つかりません');
    }

    return cart;
  }

  private async updateCartTotals(cartId: string): Promise<void> {
    const cartItems = await this.cartItemRepository.find({
      where: { cartId },
    });

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0,
    );
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    await this.cartRepository.update(cartId, {
      totalAmount,
      totalItems,
      lastActivityAt: new Date(),
    });
  }

  async convertCartToOrder(cartId: string): Promise<void> {
    // Mark the current cart as converted
    await this.cartRepository.update(cartId, {
      status: CartStatus.CONVERTED,
    });
  }

  async markCartAsAbandoned(cartId: string): Promise<void> {
    await this.cartRepository.update(cartId, {
      status: CartStatus.ABANDONED,
    });
  }
}
