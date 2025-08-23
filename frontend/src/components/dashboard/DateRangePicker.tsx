'use client';

import { useState } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';
import { DateRange } from '@/types/analytics';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (dateRange: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presetRanges = [
    {
      label: 'Last 7 days',
      period: '7d' as const,
      from: subDays(new Date(), 7),
      to: new Date(),
    },
    {
      label: 'Last 30 days',
      period: '30d' as const,
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    {
      label: 'Last 90 days',
      period: '90d' as const,
      from: subDays(new Date(), 90),
      to: new Date(),
    },
    {
      label: 'Last year',
      period: '1y' as const,
      from: subDays(new Date(), 365),
      to: new Date(),
    },
  ];

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    onChange({
      from: startOfDay(preset.from),
      to: endOfDay(preset.to),
      period: preset.period,
    });
    setIsOpen(false);
  };

  const formatDateRange = (dateRange: DateRange) => {
    if (dateRange.period === 'custom') {
      return `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
    }
    
    const preset = presetRanges.find(p => p.period === dateRange.period);
    return preset?.label || 'Custom range';
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <CalendarIcon className="h-4 w-4" />
        {formatDateRange(value)}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <Card className="absolute right-0 top-full mt-2 z-20 p-4 w-64">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-secondary-900 mb-3">
                Select Date Range
              </h4>
              
              {presetRanges.map((preset) => (
                <button
                  key={preset.period}
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    value.period === preset.period
                      ? 'bg-primary-100 text-primary-900'
                      : 'hover:bg-secondary-50 text-secondary-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              
              <div className="border-t border-secondary-200 pt-3 mt-3">
                <button
                  onClick={() => {
                    onChange({
                      ...value,
                      period: 'custom',
                    });
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-secondary-700 hover:bg-secondary-50"
                >
                  Custom Range
                </button>
                <p className="text-xs text-secondary-500 mt-2 px-3">
                  Custom date picker coming soon
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}