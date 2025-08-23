import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '../entities/order.entity';

export class AddressResponseDto {
  @ApiProperty()
  fullName: string;

  @ApiProperty({ required: false })
  company?: string;

  @ApiProperty()
  address1: string;

  @ApiProperty({ required: false })
  address2?: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  postalCode: string;

  @ApiProperty()
  country: string;

  @ApiProperty({ required: false })
  phone?: string;
}

export class OrderItemResponseDto {
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
  productSnapshot: {
    name: string;
    sku?: string;
    brand?: string;
    model?: string;
    imageUrl?: string;
    specifications?: Record<string, any>;
  };
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  shippingAmount: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  orderDate: Date;

  @ApiProperty({ required: false })
  estimatedDeliveryDate?: Date;

  @ApiProperty({ required: false })
  deliveredAt?: Date;

  @ApiProperty({ type: AddressResponseDto })
  shippingAddress: AddressResponseDto;

  @ApiProperty({ type: AddressResponseDto, required: false })
  billingAddress?: AddressResponseDto;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  trackingNumber?: string;

  @ApiProperty({ required: false })
  paymentMethod?: string;

  @ApiProperty({ required: false })
  paymentTransactionId?: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export interface PaginatedOrderResult {
  data: OrderResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
