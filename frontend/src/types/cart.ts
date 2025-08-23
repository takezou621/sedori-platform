export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  currency: 'JPY' | 'USD' | 'EUR';
  product: {
    id: string;
    name: string;
    sku: string;
    brand?: string;
    primaryImageUrl?: string;
    stockQuantity?: number;
    minOrderQuantity?: number;
    maxOrderQuantity?: number;
  };
  addedAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: 'JPY' | 'USD' | 'EUR';
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  itemId: string;
  quantity: number;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: 'JPY' | 'USD' | 'EUR';
}

export interface ShippingAddress {
  id?: string;
  name: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id?: string;
  type: 'card' | 'bank_transfer' | 'cod';
  cardLast4?: string;
  cardBrand?: string;
  cardExpiry?: string;
  bankName?: string;
  bankAccount?: string;
  isDefault?: boolean;
}

export interface CheckoutData {
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  paymentMethod: PaymentMethod;
  notes?: string;
}