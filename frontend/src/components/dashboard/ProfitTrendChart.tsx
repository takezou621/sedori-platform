'use client';

import { useState } from 'react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, Button } from '@/components/ui';
import { SalesData } from '@/types/analytics';

interface ProfitTrendChartProps {
  data: SalesData[];
  loading?: boolean;
  className?: string;
}

export function ProfitTrendChart({ data, loading = false, className = '' }: ProfitTrendChartProps) {
  const [viewMode, setViewMode] = useState<'absolute' | 'margin'>('absolute');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd');
    } catch {
      return dateString;
    }
  };

  // Calculate profit margins for each data point
  const chartData = data.map(item => ({
    ...item,
    profitMargin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-secondary-200 rounded-lg shadow-lg">
          <p className="font-medium text-secondary-900 mb-2">{formatDate(label || '')}</p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-secondary-600">
                {entry.dataKey === 'profitMargin' ? 'Profit Margin' : 
                 entry.dataKey === 'profit' ? 'Profit' : 'Revenue'}:
              </span>
              <span className="text-sm font-medium text-secondary-900">
                {entry.dataKey === 'profitMargin' 
                  ? `${entry.value.toFixed(1)}%`
                  : formatCurrency(entry.value)
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-secondary-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-secondary-100 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <p className="text-secondary-500">No profit data available for the selected period.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4 sm:mb-0">
          Profit Trend Analysis
        </h3>
        
        <div className="flex bg-secondary-100 rounded-lg p-1">
          <Button
            size="sm"
            variant={viewMode === 'absolute' ? 'primary' : 'ghost'}
            onClick={() => setViewMode('absolute')}
            className="text-xs"
          >
            Absolute Values
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'margin' ? 'primary' : 'ghost'}
            onClick={() => setViewMode('margin')}
            className="text-xs"
          >
            Profit Margins
          </Button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'absolute' ? (
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip content={customTooltip} />
              <Legend />
              
              <Bar 
                dataKey="revenue" 
                fill="#2563eb" 
                name="Revenue"
                opacity={0.7}
              />
              <Bar 
                dataKey="profit" 
                fill="#059669" 
                name="Profit"
                opacity={0.8}
              />
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={formatCurrency}
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip content={customTooltip} />
              <Legend />
              
              <Bar 
                yAxisId="left"
                dataKey="profit" 
                fill="#059669" 
                name="Profit"
                opacity={0.7}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="profitMargin"
                stroke="#dc2626"
                strokeWidth={3}
                name="Profit Margin (%)"
                dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#dc2626', strokeWidth: 2 }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Profit Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-secondary-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {chartData.length > 0 ? 
              formatCurrency(chartData.reduce((sum, item) => sum + item.profit, 0) / chartData.length) 
              : '¥0'
            }
          </div>
          <div className="text-sm text-secondary-600">Average Daily Profit</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {chartData.length > 0 ? 
              `${(chartData.reduce((sum, item) => sum + item.profitMargin, 0) / chartData.length).toFixed(1)}%`
              : '0%'
            }
          </div>
          <div className="text-sm text-secondary-600">Average Margin</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {chartData.length > 0 ? 
              formatCurrency(Math.max(...chartData.map(item => item.profit))) 
              : '¥0'
            }
          </div>
          <div className="text-sm text-secondary-600">Best Day Profit</div>
        </div>
      </div>
    </Card>
  );
}