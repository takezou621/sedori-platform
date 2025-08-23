'use client';

import { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, Button } from '@/components/ui';
import { SalesData } from '@/types/analytics';

interface SalesChartProps {
  data: SalesData[];
  loading?: boolean;
  className?: string;
}

export function SalesChart({ data, loading = false, className = '' }: SalesChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'profit' | 'orders'>('revenue');

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-secondary-200 rounded-lg shadow-lg">
          <p className="font-medium text-secondary-900 mb-2">{formatDate(label || '')}</p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-secondary-600 capitalize">
                {entry.dataKey}:
              </span>
              <span className="text-sm font-medium text-secondary-900">
                {entry.dataKey === 'orders' 
                  ? entry.value.toLocaleString()
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
          <div className="h-6 bg-secondary-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-secondary-100 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <p className="text-secondary-500">No sales data available for the selected period.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4 sm:mb-0">
          Sales Analytics
        </h3>
        
        <div className="flex flex-wrap gap-2">
          {/* Chart Type Toggle */}
          <div className="flex bg-secondary-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={chartType === 'area' ? 'primary' : 'ghost'}
              onClick={() => setChartType('area')}
              className="text-xs"
            >
              Area
            </Button>
            <Button
              size="sm"
              variant={chartType === 'line' ? 'primary' : 'ghost'}
              onClick={() => setChartType('line')}
              className="text-xs"
            >
              Line
            </Button>
          </div>

          {/* Metric Filter */}
          <div className="flex bg-secondary-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={activeMetric === 'revenue' ? 'primary' : 'ghost'}
              onClick={() => setActiveMetric('revenue')}
              className="text-xs"
            >
              Revenue
            </Button>
            <Button
              size="sm"
              variant={activeMetric === 'profit' ? 'primary' : 'ghost'}
              onClick={() => setActiveMetric('profit')}
              className="text-xs"
            >
              Profit
            </Button>
            <Button
              size="sm"
              variant={activeMetric === 'orders' ? 'primary' : 'ghost'}
              onClick={() => setActiveMetric('orders')}
              className="text-xs"
            >
              Orders
            </Button>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => 
                  activeMetric === 'orders' ? value.toLocaleString() : formatCurrency(value)
                }
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip content={customTooltip} />
              
              {activeMetric === 'revenue' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={0.6}
                    fill="url(#colorProfit)"
                  />
                </>
              )}
              
              {activeMetric === 'profit' && (
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              )}
              
              {activeMetric === 'orders' && (
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#dc2626"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                />
              )}
              
              <Legend />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => 
                  activeMetric === 'orders' ? value.toLocaleString() : formatCurrency(value)
                }
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip content={customTooltip} />
              
              {activeMetric === 'revenue' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2 }}
                  />
                </>
              )}
              
              {activeMetric === 'profit' && (
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2 }}
                />
              )}
              
              {activeMetric === 'orders' && (
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#dc2626', strokeWidth: 2 }}
                />
              )}
              
              <Legend />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}