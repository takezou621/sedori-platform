import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CartsService } from './carts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddToCartDto, UpdateCartItemDto, CartResponseDto } from './dto';

@ApiTags('Carts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  @ApiOperation({ summary: 'カート取得' })
  @ApiResponse({
    status: 200,
    description: 'カート情報を返します',
    type: CartResponseDto,
  })
  async getCart(@Request() req: any): Promise<CartResponseDto> {
    const userId = req.user.id;
    const cart = await this.cartsService.getCart(userId);
    return this.mapCartToResponse(cart);
  }

  @Post('items')
  @ApiOperation({ summary: 'カートに商品追加' })
  @ApiResponse({
    status: 201,
    description: '商品がカートに追加されました',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: '商品が見つかりません' })
  @ApiResponse({ status: 400, description: '商品が購入できません' })
  async addToCart(
    @Request() req: any,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartResponseDto> {
    const userId = req.user.id;
    const cart = await this.cartsService.addToCart(userId, addToCartDto);
    return this.mapCartToResponse(cart);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'カート項目更新' })
  @ApiParam({ name: 'itemId', description: 'カート項目ID' })
  @ApiResponse({
    status: 200,
    description: 'カート項目が更新されました',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'カート項目が見つかりません' })
  async updateCartItem(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const userId = req.user.id;
    const cart = await this.cartsService.updateCartItem(
      userId,
      itemId,
      updateCartItemDto,
    );
    return this.mapCartToResponse(cart);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'カート項目削除' })
  @ApiParam({ name: 'itemId', description: 'カート項目ID' })
  @ApiResponse({
    status: 200,
    description: 'カート項目が削除されました',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'カート項目が見つかりません' })
  async removeFromCart(
    @Request() req: any,
    @Param('itemId') itemId: string,
  ): Promise<CartResponseDto> {
    const userId = req.user.id;
    const cart = await this.cartsService.removeFromCart(userId, itemId);
    return this.mapCartToResponse(cart);
  }

  @Delete()
  @ApiOperation({ summary: 'カートクリア' })
  @ApiResponse({
    status: 200,
    description: 'カートがクリアされました',
    type: CartResponseDto,
  })
  async clearCart(@Request() req: any): Promise<CartResponseDto> {
    const userId = req.user.id;
    const cart = await this.cartsService.clearCart(userId);
    return this.mapCartToResponse(cart);
  }

  private mapCartToResponse(cart: any): CartResponseDto {
    return {
      id: cart.id,
      userId: cart.userId,
      status: cart.status,
      totalAmount: Number(cart.totalAmount),
      totalItems: cart.totalItems,
      lastActivityAt: cart.lastActivityAt,
      items:
        cart.items?.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          addedAt: item.addedAt,
          productSnapshot: item.productSnapshot,
          product: item.product
            ? {
                id: item.product.id,
                name: item.product.name,
                brand: item.product.brand,
                primaryImageUrl: item.product.primaryImageUrl,
                status: item.product.status,
              }
            : undefined,
        })) || [],
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
