import Link from 'next/link';
import { Suspense } from 'react';
import { Card, LoadingSpinner } from '@/components/ui';
import { LoginForm } from './components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-secondary-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600">
            Or{' '}
            <Link href="/auth/register" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </Link>
          </p>
        </div>

        <Card className="p-8">
          <Suspense fallback={<LoadingSpinner />}>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}