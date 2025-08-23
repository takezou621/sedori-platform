'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { MagnifyingGlassIcon as SearchIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button, Input } from '@/components/ui';

interface ProductSearchProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
}

export function ProductSearch({ 
  placeholder = "Search products, brands, categories...", 
  className = "",
  onSearch 
}: ProductSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('search') || '');

  const debouncedSearch = useDebouncedCallback(
    useCallback((searchQuery: string) => {
      if (onSearch) {
        onSearch(searchQuery);
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      if (searchQuery.trim()) {
        params.set('search', searchQuery);
        params.delete('page');
      } else {
        params.delete('search');
      }
      
      const newUrl = params.toString() ? `?${params.toString()}` : '';
      router.push(`/products${newUrl}`, { scroll: false });
    }, [onSearch, searchParams, router]),
    500
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    debouncedSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    debouncedSearch.flush();
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-secondary-400" />
        </div>
        
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="p-1 hover:bg-secondary-100 rounded-full"
            >
              <XMarkIcon className="h-4 w-4 text-secondary-400" />
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}