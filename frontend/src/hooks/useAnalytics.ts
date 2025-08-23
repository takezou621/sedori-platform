'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AnalyticsResponse, DateRange } from '@/types/analytics';
import { format } from 'date-fns';

export function useAnalytics(dateRange: DateRange) {
  return useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd'),
        period: dateRange.period,
      });

      const response = await api.get<AnalyticsResponse>(`/analytics/dashboard?${params.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
  });
}

export function useSalesAnalytics(dateRange: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'sales', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd'),
        type: 'sales',
      });

      const response = await api.get(`/analytics/sales?${params.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductAnalytics(dateRange: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'products', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd'),
        type: 'products',
      });

      const response = await api.get(`/analytics/products?${params.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventoryAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'inventory'],
    queryFn: async () => {
      const response = await api.get('/analytics/inventory');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}