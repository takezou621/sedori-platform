'use client';

import { Card } from '@/components/ui';

interface ProductSpecsProps {
  specifications: Record<string, unknown>;
  className?: string;
}

export function ProductSpecs({ specifications, className = "" }: ProductSpecsProps) {
  const formatSpecValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatSpecKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const specEntries = Object.entries(specifications);

  if (specEntries.length === 0) {
    return null;
  }

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-secondary-900 mb-4">
        Product Specifications
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {specEntries.map(([key, value]) => (
          <div key={key} className="flex justify-between items-start py-2 border-b border-secondary-100 last:border-b-0">
            <dt className="text-sm font-medium text-secondary-600 flex-shrink-0 mr-4">
              {formatSpecKey(key)}:
            </dt>
            <dd className="text-sm text-secondary-900 text-right break-words">
              {formatSpecValue(value)}
            </dd>
          </div>
        ))}
      </div>
    </Card>
  );
}