'use client';

import { useMemo } from 'react';
import { ArrowTrendingUpIcon, CalculatorIcon, CurrencyYenIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types/product';
import { Card } from '@/components/ui';

interface ProfitAnalysisProps {
  product: Product;
  customCosts?: {
    shipping?: number;
    fees?: number;
    taxes?: number;
    other?: number;
  };
}

export function ProfitAnalysis({ product, customCosts = {} }: ProfitAnalysisProps) {
  const formatPrice = (price: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const analysis = useMemo(() => {
    const wholesalePrice = product.wholesalePrice;
    const retailPrice = product.retailPrice;
    const marketPrice = product.marketPrice || retailPrice;

    // Additional costs
    const additionalCosts = Object.values(customCosts).reduce((sum, cost) => sum + (cost || 0), 0);
    const totalCost = wholesalePrice + additionalCosts;

    // Basic calculations
    const grossProfit = retailPrice - totalCost;
    const grossMargin = totalCost > 0 ? (grossProfit / retailPrice) * 100 : 0;
    const markup = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;
    const roi = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

    // Market comparison
    const marketAdvantage = marketPrice > 0 ? ((retailPrice - marketPrice) / marketPrice) * 100 : 0;
    const competitiveness = marketPrice > 0 ? (marketPrice / retailPrice) * 100 : 100;

    // Profit grades
    const getGrade = (percentage: number) => {
      if (percentage >= 50) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-100' };
      if (percentage >= 30) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
      if (percentage >= 20) return { grade: 'B+', color: 'text-blue-600', bg: 'bg-blue-100' };
      if (percentage >= 15) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
      if (percentage >= 10) return { grade: 'C+', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      if (percentage >= 5) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      return { grade: 'D', color: 'text-red-600', bg: 'bg-red-100' };
    };

    const marginGrade = getGrade(grossMargin);
    const roiGrade = getGrade(roi);

    return {
      wholesalePrice,
      retailPrice,
      marketPrice,
      totalCost,
      additionalCosts,
      grossProfit,
      grossMargin,
      markup,
      roi,
      marketAdvantage,
      competitiveness,
      marginGrade,
      roiGrade,
    };
  }, [product, customCosts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalculatorIcon className="h-6 w-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-secondary-900">Profit Analysis</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Revenue</p>
              <p className="text-2xl font-bold text-secondary-900">
                {formatPrice(analysis.retailPrice, product.currency)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CurrencyYenIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Total Cost */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Total Cost</p>
              <p className="text-2xl font-bold text-secondary-900">
                {formatPrice(analysis.totalCost, product.currency)}
              </p>
              {analysis.additionalCosts > 0 && (
                <p className="text-xs text-secondary-500">
                  +{formatPrice(analysis.additionalCosts, product.currency)} fees
                </p>
              )}
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <ArrowTrendingUpIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        {/* Gross Profit */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Gross Profit</p>
              <p className="text-2xl font-bold text-secondary-900">
                {formatPrice(analysis.grossProfit, product.currency)}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <ChartBarIcon className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </Card>

        {/* ROI */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">ROI</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-secondary-900">
                  {analysis.roi.toFixed(1)}%
                </p>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${analysis.roiGrade.bg} ${analysis.roiGrade.color}`}>
                  {analysis.roiGrade.grade}
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Detailed Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary-600">Gross Margin</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded ${analysis.marginGrade.bg} ${analysis.marginGrade.color}`}>
                {analysis.marginGrade.grade}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-secondary-900">
                {analysis.grossMargin.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2 mt-2">
              <div 
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${Math.min(analysis.grossMargin, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary-600">Markup</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-secondary-900">
                {analysis.markup.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${Math.min(analysis.markup / 2, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary-600">Market Position</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-secondary-900">
                {analysis.competitiveness.toFixed(0)}%
              </span>
              <span className="text-sm text-secondary-600">competitive</span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${analysis.competitiveness >= 90 ? 'bg-green-600' : analysis.competitiveness >= 80 ? 'bg-yellow-600' : 'bg-red-600'}`}
                style={{ width: `${analysis.competitiveness}%` }}
              />
            </div>
          </div>
        </div>

        {/* Market Comparison */}
        {product.marketPrice && product.marketPrice !== product.retailPrice && (
          <div className="mt-6 pt-6 border-t border-secondary-200">
            <h4 className="text-sm font-semibold text-secondary-900 mb-3">Market Comparison</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-secondary-600">Your Price</p>
                <p className="text-lg font-bold text-secondary-900">
                  {formatPrice(analysis.retailPrice, product.currency)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-secondary-600">Market Price</p>
                <p className="text-lg font-bold text-secondary-900">
                  {formatPrice(analysis.marketPrice, product.currency)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-secondary-600">
                  {analysis.marketAdvantage >= 0 ? 'Premium' : 'Discount'}
                </p>
                <p className={`text-lg font-bold ${analysis.marketAdvantage >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {Math.abs(analysis.marketAdvantage).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="mt-6 pt-6 border-t border-secondary-200">
          <h4 className="text-sm font-semibold text-secondary-900 mb-3">Recommendations</h4>
          <div className="space-y-2 text-sm text-secondary-600">
            {analysis.grossMargin < 10 && (
              <p className="p-3 bg-red-50 text-red-700 rounded-md">
                ⚠️ Low profit margin. Consider reducing costs or increasing price.
              </p>
            )}
            {analysis.grossMargin >= 30 && (
              <p className="p-3 bg-green-50 text-green-700 rounded-md">
                ✅ Excellent profit margin! This is a highly profitable product.
              </p>
            )}
            {analysis.competitiveness < 80 && (
              <p className="p-3 bg-yellow-50 text-yellow-700 rounded-md">
                💡 Price may be too high compared to market. Consider competitive pricing.
              </p>
            )}
            {analysis.roi >= 50 && (
              <p className="p-3 bg-blue-50 text-blue-700 rounded-md">
                🚀 Outstanding ROI! Focus on scaling this product.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}