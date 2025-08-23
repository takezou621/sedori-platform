import { Button, Card } from '@/components/ui';

export default function AnalyticsPage() {
  return (
    <div className="bg-secondary-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-secondary-900">
            Analytics Dashboard
          </h1>
          <p className="mt-2 text-sm text-secondary-600">
            Track your business performance and insights
          </p>
        </div>

        {/* Key Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100">
                  <svg
                    className="h-5 w-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-secondary-500 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-semibold text-secondary-900">
                    $45,231
                  </dd>
                </dl>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M8 11v6a4 4 0 008 0v-6M8 11h8"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-secondary-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-semibold text-secondary-900">
                    1,234
                  </dd>
                </dl>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-100">
                  <svg
                    className="h-5 w-5 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-secondary-500 truncate">
                    Avg. Margin
                  </dt>
                  <dd className="text-lg font-semibold text-secondary-900">
                    45.2%
                  </dd>
                </dl>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100">
                  <svg
                    className="h-5 w-5 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-secondary-500 truncate">
                    Active Products
                  </dt>
                  <dd className="text-lg font-semibold text-secondary-900">
                    89
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Revenue Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-secondary-900">
                Revenue Trend
              </h2>
              <Button variant="outline" size="sm">
                Last 30 days
              </Button>
            </div>
            <div className="h-64 flex items-center justify-center bg-secondary-50 rounded-lg">
              <span className="text-secondary-500">Revenue Chart Placeholder</span>
            </div>
          </Card>

          {/* Top Products */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-secondary-900">
                Top Performing Products
              </h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Premium Headphones', revenue: '$2,340', margin: '52%' },
                { name: 'Wireless Speaker', revenue: '$1,890', margin: '48%' },
                { name: 'Smart Watch', revenue: '$1,650', margin: '45%' },
                { name: 'Bluetooth Earbuds', revenue: '$1,420', margin: '41%' },
                { name: 'Phone Case', revenue: '$980', margin: '38%' },
              ].map((product, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-secondary-200">
                  <div>
                    <p className="font-medium text-secondary-900">{product.name}</p>
                    <p className="text-sm text-secondary-600">Revenue: {product.revenue}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{product.margin}</p>
                    <p className="text-xs text-secondary-600">Margin</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Additional Analytics */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Sales by Category */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Sales by Category
            </h2>
            <div className="h-48 flex items-center justify-center bg-secondary-50 rounded-lg">
              <span className="text-secondary-500">Pie Chart Placeholder</span>
            </div>
          </Card>

          {/* Customer Insights */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Customer Insights
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-secondary-600">New Customers</p>
                <p className="text-xl font-semibold text-secondary-900">124</p>
              </div>
              <div>
                <p className="text-sm text-secondary-600">Returning Customers</p>
                <p className="text-xl font-semibold text-secondary-900">456</p>
              </div>
              <div>
                <p className="text-sm text-secondary-600">Customer Lifetime Value</p>
                <p className="text-xl font-semibold text-secondary-900">$892</p>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3">
              {[
                'New order #1234 received',
                'Product "Smart Watch" low stock',
                'Customer review submitted',
                'Payment processed for order #1235',
                'Inventory updated for 5 products',
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                  <p className="text-sm text-secondary-600">{activity}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}