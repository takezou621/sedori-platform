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

    // Get or create cart
    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists in cart
    let cartItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId },
    });

    const unitPrice = product.wholesalePrice;
    const totalPrice = unitPrice * quantity;

    if (cartItem) {
      // Use atomic update to avoid race conditions
      await this.cartItemRepository.manager.transaction(async transactionalEntityManager => {
        // Use raw SQL to atomically increment quantity and add to totalPrice
        // This preserves the price history - adds new items at current price
        await transactionalEntityManager.query(
          `UPDATE cart_items 
           SET quantity = quantity + $1, 
               "totalPrice" = "totalPrice" + ($2::decimal * $1),
               "updatedAt" = NOW()
           WHERE id = $3`,
          [quantity, unitPrice, cartItem?.id]
        );
        
        // If metadata is provided, update it separately
        if (metadata && cartItem && cartItem.id) {
          const updatedSnapshot = {
            name: cartItem.productSnapshot?.name || product.name,
            brand: cartItem.productSnapshot?.brand || product.brand,
            imageUrl: cartItem.productSnapshot?.imageUrl || product.primaryImageUrl,
            ...metadata,
          };
          await transactionalEntityManager.update(
            'CartItem',
            { id: cartItem.id },
            { productSnapshot: updatedSnapshot }
          );
        }
      });
    } else {
      // Create new item
      cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
        unitPrice,
        totalPrice,
        productSnapshot: {
          name: product.name,
          brand: product.brand,
          imageUrl: product.primaryImageUrl,
        },
      });
      
      try {
        // Save the new item
        await this.cartItemRepository.save(cartItem);
      } catch (error) {
        // Handle race condition - if item was created by another concurrent request
        if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('UNIQUE constraint')) {
          // Item was created by another request, update it instead
          const existingItem = await this.cartItemRepository.findOne({
            where: { cartId: cart.id, productId },
          });
          
          if (existingItem) {
            await this.cartItemRepository.manager.transaction(async transactionalEntityManager => {
              await transactionalEntityManager.query(
                `UPDATE cart_items 
                 SET quantity = quantity + $1, 
                     "totalPrice" = "totalPrice" + ($2::decimal * $1),
                     "updatedAt" = NOW()
                 WHERE id = $3`,
                [quantity, unitPrice, existingItem.id]
              );
            });
          } else {
            // Unexpected error, re-throw
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // Update cart totals
    await this.updateCartTotals(cart.id);

    return this.getCartById(cart.id);
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
      throw new BadRequestException('このカート項目にアクセスする権限がありません');
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
      throw new BadRequestException('このカート項目にアクセスする権限がありません');
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
            console.warn(`Product ${item.productId} not found for cart item ${item.id}`);
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

    const totalAmount = cartItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
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