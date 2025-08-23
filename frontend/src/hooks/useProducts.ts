'use client';

import { useQuery } from '@tanstack/react-query';
import { Product, ProductFilters, ProductSort } from '@/types/product';

interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  facets: {
    categories: Array<{ id: string; name: string; count: number }>;
    brands: Array<{ name: string; count: number }>;
    priceRange: { min: number; max: number };
  };
}

interface UseProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  filters?: ProductFilters;
  sort?: ProductSort;
}

export function useProducts(params: UseProductsParams = {}) {
  const { page = 1, limit = 12, search, filters, sort } = params;

  return useQuery({
    queryKey: ['products', { page, limit, search, filters, sort }],
    queryFn: async (): Promise<ProductsResponse> => {
      // For now, return mock data until backend is ready
      const mockProducts: Product[] = Array.from({ length: limit }, (_, i) => ({
        id: `${(page - 1) * limit + i + 1}`,
        title: `Sample Product ${(page - 1) * limit + i + 1}`,
        description: 'High quality product with excellent profit margins',
        price: 99.99,
        cost: 49.99,
        stock: Math.floor(Math.random() * 100) + 1,
        category: ['Electronics', 'Books', 'Clothing', 'Home'][Math.floor(Math.random() * 4)],
        brand: ['Sony', 'Apple', 'Samsung', 'Generic'][Math.floor(Math.random() * 4)],
        condition: ['new', 'used', 'refurbished'][Math.floor(Math.random() * 3)],
        imageUrl: '/placeholder-product.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Apply search filter
      const filteredProducts = search 
        ? mockProducts.filter(p => 
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase())
          )
        : mockProducts;

      // Apply category filter
      const categoryFiltered = filters?.category && filters.category !== 'all'
        ? filteredProducts.filter(p => p.category === filters.category)
        : filteredProducts;

      // Apply price range filter
      const priceFiltered = categoryFiltered.filter(p => {
        const minPrice = filters?.minPrice ?? 0;
        const maxPrice = filters?.maxPrice ?? Infinity;
        return p.price >= minPrice && p.price <= maxPrice;
      });

      // Apply sorting
      const sortedProducts = [...priceFiltered];
      if (sort?.field) {
        sortedProducts.sort((a, b) => {
          const aVal = sort.field === 'title' ? a.title :
                      sort.field === 'price' ? a.price :
                      sort.field === 'createdAt' ? new Date(a.createdAt).getTime() :
                      0;
          const bVal = sort.field === 'title' ? b.title :
                      sort.field === 'price' ? b.price :
                      sort.field === 'createdAt' ? new Date(b.createdAt).getTime() :
                      0;

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sort.direction === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
          } else if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sort.direction === 'desc' ? bVal - aVal : aVal - bVal;
          }
          return 0;
        });
      }

      return {
        products: sortedProducts,
        pagination: {
          page,
          limit,
          total: 100, // Mock total
          totalPages: Math.ceil(100 / limit),
        },
        facets: {
          categories: [
            { id: 'electronics', name: 'Electronics', count: 25 },
            { id: 'books', name: 'Books', count: 15 },
            { id: 'clothing', name: 'Clothing', count: 30 },
            { id: 'home', name: 'Home', count: 30 },
          ],
          brands: [
            { name: 'Sony', count: 10 },
            { name: 'Apple', count: 15 },
            { name: 'Samsung', count: 20 },
            { name: 'Generic', count: 55 },
          ],
          priceRange: { min: 10, max: 500 },
        },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProductSearch(query: string) {
  return useQuery({
    queryKey: ['product-search', query],
    queryFn: async (): Promise<string[]> => {
      if (!query || query.length < 2) return [];
      
      // Mock search suggestions
      const suggestions = [
        'iPhone 15',
        'Samsung Galaxy',
        'Sony WH-1000XM5',
        'MacBook Pro',
        'iPad Air',
        'Nintendo Switch',
        'AirPods Pro',
        'Dell Monitor',
      ].filter(suggestion => 
        suggestion.toLowerCase().includes(query.toLowerCase())
      );

      return suggestions.slice(0, 5);
    },
    enabled: query.length >= 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}