'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, CreateOrderRequest, OrderQuery, OrderResponse, OrdersResponse } from '@/types/order';

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await api.get<Order>(`/orders/${orderId}`);
      return response.data;
    },
    enabled: !!orderId,
  });
}

export function useOrders(query?: OrderQuery) {
  return useQuery({
    queryKey: ['orders', query],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (query?.status) params.append('status', query.status);
      if (query?.paymentStatus) params.append('paymentStatus', query.paymentStatus);
      if (query?.page) params.append('page', query.page.toString());
      if (query?.limit) params.append('limit', query.limit.toString());
      if (query?.sortBy) params.append('sortBy', query.sortBy);
      if (query?.sortOrder) params.append('sortOrder', query.sortOrder);
      if (query?.search) params.append('search', query.search);
      if (query?.dateFrom) params.append('dateFrom', query.dateFrom);
      if (query?.dateTo) params.append('dateTo', query.dateTo);

      const response = await api.get<OrdersResponse>(`/orders?${params.toString()}`);
      return response.data;
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateOrderRequest) => {
      const response = await api.post<Order>('/orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post<Order>(`/orders/${orderId}/cancel`);
      return response.data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.setQueryData(['order', updatedOrder.id], updatedOrder);
    },
  });
}

export function useTrackOrder() {
  return useMutation({
    mutationFn: async (trackingNumber: string) => {
      const response = await api.get(`/orders/track/${trackingNumber}`);
      return response.data;
    },
  });
}