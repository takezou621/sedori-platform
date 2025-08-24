'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { validateEmail, validatePassword } from '@/lib/utils';
import type { RegisterRequest } from '@/types';

interface RegisterFormData extends RegisterRequest {
  confirmPassword: string;
}

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError: setFormError,
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...registerData } = data;
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });

      const result = await response.json();

      if (!response.ok) {
        setFormError('root', {
          message: result.error || 'Registration failed. Please try again.',
        });
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error: unknown) {
      console.error('Registration failed:', error);
      const errorMessage = (error as Error)?.message || 'Network error. Please try again.';
      setFormError('root', {
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Join Sedori Platform and start tracking your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <Input
                label="Full name"
                type="text"
                required
                autoComplete="name"
                {...register('name', {
                  required: 'Full name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
                error={errors.name?.message}
              />

              {/* Email */}
              <Input
                label="Email address"
                type="email"
                required
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  validate: (value) =>
                    validateEmail(value) || 'Please enter a valid email address',
                })}
                error={errors.email?.message}
              />

              {/* Password */}
              <Input
                label="Password"
                type="password"
                required
                autoComplete="new-password"
                {...register('password', {
                  required: 'Password is required',
                  validate: (value) => {
                    const validation = validatePassword(value);
                    if (!validation.isValid) {
                      return validation.errors[0];
                    }
                    return true;
                  },
                })}
                error={errors.password?.message}
              />

              {/* Confirm Password */}
              <Input
                label="Confirm password"
                type="password"
                required
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === password || 'Passwords do not match',
                })}
                error={errors.confirmPassword?.message}
              />

              {/* Error display */}
              {(error || errors.root?.message) && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">
                    {error || errors.root?.message}
                  </p>
                </div>
              )}

              {/* Password requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Password requirements:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                </ul>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-secondary-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-secondary-500">
                    Already have an account?
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Sign in to your account
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}