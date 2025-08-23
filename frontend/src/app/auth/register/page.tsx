import Link from 'next/link';
import { Card } from '@/components/ui';
import { RegisterForm } from './components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-secondary-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600">
            Or{' '}
            <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <Card className="p-8">
          <RegisterForm />
        </Card>
      </div>
    </div>
  );
}