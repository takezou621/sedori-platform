'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store';
import { registerSchema, type RegisterFormData } from '@/schemas/auth';

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Watch password field for strength indicator
  const password = watch('password', '');

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', textClass: '', bgClass: '' };
    
    let strength = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^a-zA-Z0-9]/.test(password),
    ];
    
    strength = checks.filter(Boolean).length;
    
    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colorClasses = [
      { textClass: '', bgClass: '' },
      { textClass: 'text-red-600', bgClass: 'bg-red-500' },
      { textClass: 'text-red-600', bgClass: 'bg-red-500' },
      { textClass: 'text-yellow-600', bgClass: 'bg-yellow-500' },
      { textClass: 'text-blue-600', bgClass: 'bg-blue-500' },
      { textClass: 'text-green-600', bgClass: 'bg-green-500' }
    ];
    
    return { 
      strength, 
      label: labels[strength], 
      textClass: colorClasses[strength].textClass,
      bgClass: colorClasses[strength].bgClass,
      percentage: (strength / 5) * 100 
    };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      router.push('/dashboard');
    } catch (error: any) {
      // Handle specific error types
      if (error?.statusCode === 409) {
        setError('email', { message: 'An account with this email already exists' });
      } else if (error?.statusCode === 422) {
        setError('root', { message: 'Please check your input and try again' });
      } else if (error?.statusCode === 429) {
        setError('root', { message: 'Too many registration attempts. Please try again later.' });
      } else {
        setError('root', { message: error?.message || 'Registration failed. Please try again.' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Global error message */}
      {(error || errors.root) && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
                Registration Failed
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || errors.root?.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-secondary-700">
          Full name
        </label>
        <div className="mt-1">
          <Input
            {...register('name')}
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            className={errors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-secondary-700">
          Email address
        </label>
        <div className="mt-1">
          <Input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            className={errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-secondary-700">
          Password
        </label>
        <div className="mt-1 relative">
          <Input
            {...register('password')}
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Create a password"
            className={errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
        
        {/* Password Strength Indicator */}
        {password && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-secondary-600 mb-1">
              <span>Password Strength</span>
              <span className={`font-medium ${passwordStrength.textClass}`}>
                {passwordStrength.label}
              </span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2">
              <div
                className={`${passwordStrength.bgClass} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${passwordStrength.percentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700">
          Confirm password
        </label>
        <div className="mt-1 relative">
          <Input
            {...register('confirmPassword')}
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Confirm your password"
            className={errors.confirmPassword ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-start">
          <input
            {...register('agreeToTerms')}
            id="agree-terms"
            type="checkbox"
            className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 mt-0.5"
          />
          <label htmlFor="agree-terms" className="ml-2 block text-sm text-secondary-900">
            I agree to the{' '}
            <Link href="/terms" className="text-primary-600 hover:text-primary-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
              Privacy Policy
            </Link>
          </label>
        </div>
        {errors.agreeToTerms && (
          <p className="mt-1 text-sm text-red-600">{errors.agreeToTerms.message}</p>
        )}
      </div>

      <div>
        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          isLoading={isLoading || isSubmitting}
          disabled={isLoading || isSubmitting}
        >
          {isLoading || isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </div>

      <div className="text-center">
        <span className="text-sm text-secondary-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </span>
      </div>
    </form>
  );
}