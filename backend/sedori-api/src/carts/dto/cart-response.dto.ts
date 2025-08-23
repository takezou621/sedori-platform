import { ApiProperty } from '@nestjs/swagger';
import { CartStatus } from '../entities/cart.entity';

export class CartItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  addedAt: Date;

  @ApiProperty({ required: false })
  productSnapshot?: {
    name: string;
    brand?: string;
    imageUrl?: string;
  };

  @ApiProperty({ required: false })
  product?: {
    id: string;
    name: string;
    brand?: string;
    primaryImageUrl?: string;
    status: string;
  };
}

export class CartResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: CartStatus })
  status: CartStatus;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  lastActivityAt?: Date;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
