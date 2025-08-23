'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => 
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
          refetchOnWindowFocus: false,
          retry: (failureCount, error) => {
            // Don't retry on 4xx errors
            if (error && typeof error === 'object' && 'response' in error) {
              const status = (error as { response?: { status?: number } }).response?.status;
              if (status !== undefined && status >= 400 && status < 500) {
                return false;
              }
            }
            return failureCount < 3;
          },
        },
        mutations: {
          retry: 1,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}