'use client';

import { useState, createContext, useContext } from 'react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

interface SelectContextValue {
  selectedValue: string;
  onSelect: (value: string) => void;
}

const SelectContext = createContext<SelectContextValue | undefined>(undefined);

export function Select({ value, onValueChange, placeholder, children, className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || '');

  const handleSelect = (itemValue: string) => {
    setSelectedValue(itemValue);
    onValueChange?.(itemValue);
    setIsOpen(false);
  };

  const contextValue: SelectContextValue = {
    selectedValue,
    onSelect: handleSelect,
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{selectedValue || placeholder}</span>
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {children}
          </div>
        )}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectItem({ value, children }: SelectItemProps) {
  const context = useContext(SelectContext);
  
  if (!context) {
    throw new Error('SelectItem must be used within a Select component');
  }

  const { onSelect } = context;

  return (
    <div
      onClick={() => onSelect(value)}
      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
      data-value={value}
    >
      {children}
    </div>
  );
}