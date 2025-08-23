export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  price: number;
  currency: 'JPY' | 'USD' | 'EUR';
  product: {
    id: string;
    name: string;
    sku: string;
    brand?: string;
    primaryImageUrl?: string;
  };
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: 'JPY' | 'USD' | 'EUR';
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  paymentMethod: {
    type: string;
    last4?: string;
    brand?: string;
  };
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  paymentDate?: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  name: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CreateOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  paymentMethod: {
    type: string;
    token?: string;
  };
  notes?: string;
}

export interface OrdersResponse {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface OrderQuery {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'date' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderStatusUpdate {
  status: Order['status'];
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
}

export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer' | 'cash_on_delivery';

export interface OrderResponse {
  order: Order;
  status: string;
  message?: string;
}
export interface OrdersResponse {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}