'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { loginSchema, type LoginFormData } from '@/schemas/auth';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setFormError('email', { message: 'Invalid email or password' });
          setFormError('password', { message: 'Invalid email or password' });
        } else if (response.status === 429) {
          setFormError('root', { message: 'Too many login attempts. Please try again later.' });
        } else {
          setFormError('root', { message: result.message || 'Login failed. Please try again.' });
        }
        return;
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      setFormError('root', { message: apiError?.message || 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)} 
      className="space-y-6"
      noValidate
      aria-label="Login form"
    >
      {/* Global error message */}
      {(error || errors.root) && (
        <div 
          className="rounded-md bg-red-50 p-4 error-indicator" 
          role="alert"
          aria-live="polite"
          data-type="error"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Login Failed
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || errors.root?.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-secondary-700">
          Email address <span className="text-red-500" aria-label="required">*</span>
        </label>
        <div className="mt-1">
          <Input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            required
            aria-required="true"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          />
          {errors.email && (
            <p 
              id="email-error" 
              className="mt-1 text-sm text-red-600 error-indicator"
              role="alert"
              aria-live="polite"
            >
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-secondary-700">
          Password <span className="text-red-500" aria-label="required">*</span>
        </label>
        <div className="mt-1 relative">
          <Input
            {...register('password')}
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            aria-required="true"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error password-toggle-help' : 'password-toggle-help'}
            className={errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-describedby="password-toggle-help"
          >
            {showPassword ? (
              <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
          <div id="password-toggle-help" className="sr-only">
            Button to toggle password visibility
          </div>
        </div>
        {errors.password && (
          <p 
            id="password-error" 
            className="mt-1 text-sm text-red-600 error-indicator"
            role="alert"
            aria-live="polite"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            {...register('rememberMe')}
            id="remember-me"
            type="checkbox"
            className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary-900">
            Remember me
          </label>
        </div>

        <div className="text-sm">
          <Link href="/auth/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
            Forgot your password?
          </Link>
        </div>
      </div>

      <div>
        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          isLoading={isLoading || isSubmitting}
          disabled={isLoading || isSubmitting}
          aria-describedby={isLoading || isSubmitting ? 'login-loading' : undefined}
        >
          {isLoading || isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
        {(isLoading || isSubmitting) && (
          <div id="login-loading" className="sr-only" aria-live="polite">
            Please wait, signing you in...
          </div>
        )}
      </div>

      <div className="text-center">
        <span className="text-sm text-secondary-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="font-medium text-primary-600 hover:text-primary-500">
            Sign up
          </Link>
        </span>
      </div>
    </form>
  );
}