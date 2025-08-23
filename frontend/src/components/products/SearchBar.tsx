'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useProductSearch } from '@/hooks';
import { Input } from '@/components/ui';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search products...", className }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery] = useDebounce(value, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [], isLoading } = useProductSearch(debouncedQuery);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(newValue.length >= 2);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label htmlFor="product-search" className="sr-only">
        Search products
      </label>
      <Input
        ref={inputRef}
        id="product-search"
        type="search"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 2 && setIsOpen(true)}
        placeholder={placeholder}
        aria-describedby="search-help"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        role="combobox"
        autoComplete="off"
      />
      
      <div id="search-help" className="sr-only">
        Search for products by name, category, or description. Suggestions will appear as you type.
      </div>

      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
          aria-label="Search suggestions"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500" role="option" aria-selected="false">
              Loading suggestions...
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                onClick={() => handleSuggestionClick(suggestion)}
                role="option"
                aria-selected="false"
                tabIndex={-1}
              >
                <span className="block truncate">{suggestion}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}