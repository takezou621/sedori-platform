export interface Product {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description?: string;
  sku: string;
  brand?: string;
  model?: string;
  categoryId?: string;
  wholesalePrice: number;
  retailPrice: number;
  price: number;
  originalPrice?: number;
  marketPrice?: number;
  currency: 'JPY' | 'USD' | 'EUR';
  condition: 'new' | 'used' | 'refurbished';
  status: 'active' | 'inactive' | 'draft';
  supplier?: string;
  supplierUrl?: string;
  stockQuantity?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  weight?: number;
  weightUnit?: 'g' | 'kg' | 'lb' | 'oz';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  images?: string[];
  imageUrls?: string[];
  primaryImageUrl?: string;
  specifications?: Record<string, unknown>;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  isDigital?: boolean;
  trackInventory?: boolean;
  viewCount?: number;
  averageRating?: number;
  reviewCount?: number;
  lastUpdatedAt?: string;
  marketData?: Record<string, unknown>;
  profitabilityData?: {
    margin: number;
    roi: number;
    estimatedProfit: number;
  };
  metadata?: Record<string, unknown>;
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  parentId?: string;
  metadata?: Record<string, unknown>;
  parent?: Category;
  children?: Category[];
}

export interface ProductsResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  facets?: SearchFacet[];
}

export interface SearchFacet {
  key: string;
  label: string;
  values: FacetValue[];
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  brand?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
}

export interface ProductSort {
  sortBy?: 'relevance' | 'price' | 'name' | 'newest' | 'popular' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductQuery extends ProductFilters, ProductSort {
  page?: number;
  limit?: number;
}

export interface SearchSuggestion {
  query: string;
  type: 'product' | 'brand' | 'category';
  count?: number;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku: string;
  brand?: string;
  model?: string;
  categoryId?: string;
  price: number;
  originalPrice?: number;
  currency: 'JPY' | 'USD' | 'EUR';
  condition: 'new' | 'used' | 'refurbished';
  status: 'active' | 'inactive' | 'draft';
  supplier?: string;
  supplierUrl?: string;
  stockQuantity?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  weight?: number;
  weightUnit?: 'g' | 'kg' | 'lb' | 'oz';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  imageUrls?: string[];
  specifications?: Record<string, unknown>;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  isDigital?: boolean;
  trackInventory?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}