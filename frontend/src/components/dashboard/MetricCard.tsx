'use client';

import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/ui';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'percentage' | 'absolute';
  icon?: React.ReactNode;
  className?: string;
  format?: 'currency' | 'number' | 'percentage';
  currency?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = 'percentage',
  icon,
  className = '',
  format = 'number',
  currency = 'JPY',
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('ja-JP', {
          style: 'currency',
          currency: currency,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  const formatChange = (changeVal: number) => {
    if (changeType === 'percentage') {
      return `${Math.abs(changeVal).toFixed(1)}%`;
    }
    return Math.abs(changeVal).toLocaleString();
  };

  const getChangeColor = (changeVal: number) => {
    if (changeVal > 0) return 'text-green-600';
    if (changeVal < 0) return 'text-red-600';
    return 'text-secondary-600';
  };

  const getChangeBgColor = (changeVal: number) => {
    if (changeVal > 0) return 'bg-green-50';
    if (changeVal < 0) return 'bg-red-50';
    return 'bg-secondary-50';
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-secondary-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-secondary-900">
            {formatValue(value)}
          </p>
          
          {change !== undefined && (
            <div className="flex items-center mt-2">
              <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getChangeBgColor(change)} ${getChangeColor(change)}`}>
                {change > 0 ? (
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                ) : change < 0 ? (
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                ) : null}
                {formatChange(change)}
              </div>
              <span className="text-xs text-secondary-500 ml-2">
                vs last period
              </span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className="ml-4 p-3 bg-primary-50 rounded-full">
            <div className="text-primary-600">
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}