'use client';

import { useState } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/ui';

interface Column {
  key: string;
  title: string;
  label?: string; // For backward compatibility
  sortable?: boolean;
  render?: (item: Record<string, unknown>, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface AdminTableProps {
  data: Record<string, unknown>[];
  columns: Column[];
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onSort?: (field: string) => void;
  currentSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  loading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function AdminTable({
  data,
  columns,
  selectedItems = [],
  onSelectionChange,
  onSort,
  currentSort,
  loading = false,
  emptyState,
  className = '',
}: AdminTableProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedItems.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(item => String(item.id)));
    }
  };

  const handleSelectItem = (itemId: string) => {
    if (!onSelectionChange) return;
    
    if (selectedItems.includes(itemId)) {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    } else {
      onSelectionChange([...selectedItems, itemId]);
    }
  };

  const handleSort = (field: string) => {
    if (onSort) {
      onSort(field);
    }
  };

  const getSortIcon = (field: string) => {
    if (!currentSort || currentSort.field !== field) {
      return null;
    }
    
    return currentSort.direction === 'asc' ? (
      <ArrowUpIcon className="h-4 w-4" />
    ) : (
      <ArrowDownIcon className="h-4 w-4" />
    );
  };

  const isAllSelected = selectedItems.length > 0 && selectedItems.length === data.length;
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < data.length;

  if (loading) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <div className="animate-pulse">
          <div className="h-12 bg-secondary-100 border-b"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-secondary-50 border-b border-secondary-100"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        {emptyState || (
          <div>
            <div className="text-secondary-300 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No data found</h3>
            <p className="text-secondary-500">There are no items to display.</p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-secondary-200">
          {/* Header */}
          <thead className="bg-secondary-50">
            <tr>
              {/* Selection column */}
              {onSelectionChange && (
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isPartiallySelected;
                    }}
                    onChange={handleSelectAll}
                    className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              
              {/* Data columns */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider ${
                    column.width ? column.width : ''
                  } ${column.sortable ? 'cursor-pointer hover:bg-secondary-100' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={column.align ? { textAlign: column.align } : {}}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.title}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-secondary-200">
            {data.map((item, index) => (
              <tr
                key={String(item.id) || index}
                className={`hover:bg-secondary-50 transition-colors ${
                  selectedItems.includes(String(item.id)) ? 'bg-primary-50' : ''
                }`}
                onMouseEnter={() => setHoveredRow(index)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Selection column */}
                {onSelectionChange && (
                  <td className="w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(String(item.id))}
                      onChange={() => handleSelectItem(String(item.id))}
                      className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                )}
                
                {/* Data columns */}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap ${
                      column.width ? column.width : ''
                    }`}
                    style={column.align ? { textAlign: column.align } : {}}
                  >
                    {column.render ? (
                      column.render(item, index)
                    ) : (
                      <div className="text-sm text-secondary-900">
                        {String(item[column.key] ?? '')}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}