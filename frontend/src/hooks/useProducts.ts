'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Product, ProductsResponse, ProductQuery } from '@/types/product';

export function useProducts(query: ProductQuery = {}) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (query.search) params.append('search', query.search);
      if (query.categoryId) params.append('categoryId', query.categoryId);
      if (query.brand) params.append('brand', query.brand);
      if (query.condition) params.append('condition', query.condition);
      if (query.minPrice !== undefined) params.append('minPrice', query.minPrice.toString());
      if (query.maxPrice !== undefined) params.append('maxPrice', query.maxPrice.toString());
      if (query.inStock !== undefined) params.append('inStock', query.inStock.toString());
      if (query.tags) query.tags.forEach(tag => params.append('tags', tag));
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());

      const response = await api.get<ProductsResponse>(`/products?${params.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useInfiniteProducts(query: Omit<ProductQuery, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', query],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      
      if (query.search) params.append('search', query.search);
      if (query.categoryId) params.append('categoryId', query.categoryId);
      if (query.brand) params.append('brand', query.brand);
      if (query.condition) params.append('condition', query.condition);
      if (query.minPrice !== undefined) params.append('minPrice', query.minPrice.toString());
      if (query.maxPrice !== undefined) params.append('maxPrice', query.maxPrice.toString());
      if (query.inStock !== undefined) params.append('inStock', query.inStock.toString());
      if (query.tags) query.tags.forEach(tag => params.append('tags', tag));
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);
      if (query.limit) params.append('limit', query.limit.toString());
      
      params.append('page', pageParam.toString());

      const response = await api.get<ProductsResponse>(`/products?${params.toString()}`);
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNext 
        ? lastPage.pagination.page + 1 
        : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await api.get<Product>(`/products/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Partial<Product>) => {
      const response = await api.post<Product>('/products', product);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
      const response = await api.patch<Product>(`/products/${id}`, product);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', data.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post<{ imageUrl: string }>(`/products/${productId}/images`, formData);
      return response.data;
    },
  });
}

export function useBulkUpdateProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ id: string; data: Partial<Product> }>) => {
      const promises = updates.map(({ id, data }) => 
        api.patch<Product>(`/products/${id}`, data)
      );
      const responses = await Promise.all(promises);
      return responses.map(r => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}