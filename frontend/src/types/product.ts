export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  cost: number;
  imageUrl?: string;
  category: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string;
}

export interface ProductSort {
  field: 'title' | 'price' | 'cost' | 'createdAt';
  direction: 'asc' | 'desc';
}

export interface CreateProductRequest {
  title: string;
  description: string;
  price: number;
  cost: number;
  imageUrl?: string;
  category: string;
  stock: number;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}