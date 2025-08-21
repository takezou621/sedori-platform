import Link from 'next/link';
import { Button } from '@/components/ui';

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-white to-secondary-50">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-secondary-900 sm:text-5xl md:text-6xl">
            <span className="block">Welcome to</span>
            <span className="block text-primary-600">Sedori Platform</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-secondary-600">
            Your comprehensive platform for product sourcing, sales tracking, and business intelligence. 
            Start building your business today with our powerful tools and analytics.
          </p>
          <div className="mx-auto mt-8 max-w-md sm:flex sm:max-w-lg sm:justify-center">
            <div className="rounded-md shadow sm:ml-3">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Get started for free
                </Button>
              </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:ml-3 sm:mt-0">
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl">
              Everything you need to succeed
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary-600">
              Powerful features to help you manage your business efficiently
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary-100">
                  <svg
                    className="h-6 w-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-secondary-900">
                  Product Management
                </h3>
                <p className="mt-2 text-base text-secondary-600">
                  Manage your inventory, track product performance, and optimize your catalog.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary-100">
                  <svg
                    className="h-6 w-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-secondary-900">
                  Sales Analytics
                </h3>
                <p className="mt-2 text-base text-secondary-600">
                  Track your sales performance with detailed analytics and insights.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary-100">
                  <svg
                    className="h-6 w-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-secondary-900">
                  Smart Recommendations
                </h3>
                <p className="mt-2 text-base text-secondary-600">
                  Get AI-powered recommendations to optimize your business decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
