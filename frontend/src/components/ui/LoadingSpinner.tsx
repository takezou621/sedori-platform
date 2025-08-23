import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  className?: string;
  color?: 'primary' | 'secondary' | 'white';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const colorClasses = {
  primary: 'border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400',
  secondary: 'border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white',
  white: 'border-gray-300 border-t-white',
};

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'spinner',
  className,
  color = 'primary'
}: LoadingSpinnerProps) {
  if (variant === 'dots') {
    return (
      <div className={cn('flex space-x-1', className)}>
        <div className={cn(
          'animate-pulse rounded-full bg-current',
          size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-6 w-6'
        )} style={{ animationDelay: '0ms' }} />
        <div className={cn(
          'animate-pulse rounded-full bg-current',
          size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-6 w-6'
        )} style={{ animationDelay: '150ms' }} />
        <div className={cn(
          'animate-pulse rounded-full bg-current',
          size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-6 w-6'
        )} style={{ animationDelay: '300ms' }} />
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div
        className={cn(
          'animate-pulse rounded-full bg-current opacity-75',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'animate-bounce bg-current',
              size === 'sm' ? 'h-4 w-1' : size === 'md' ? 'h-6 w-1.5' : size === 'lg' ? 'h-8 w-2' : 'h-12 w-3'
            )}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2',
        colorClasses[color],
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="読み込み中"
    />
  );
}

export function LoadingPage({ message = "読み込み中..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="xl" variant="spinner" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

// Skeleton loading components
export function LoadingSkeleton({ 
  className,
  width = 'w-full',
  height = 'h-4'
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div className={cn('animate-pulse bg-gray-200 dark:bg-gray-700 rounded', width, height, className)} />
  );
}

export function LoadingCard() {
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 animate-pulse">
      <LoadingSkeleton height="h-6" width="w-3/4" className="mb-2" />
      <LoadingSkeleton height="h-4" width="w-full" className="mb-2" />
      <LoadingSkeleton height="h-4" width="w-2/3" />
    </div>
  );
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading: boolean;
}

export function LoadingButton({ children, isLoading, ...props }: LoadingButtonProps) {
  return (
    <button disabled={isLoading} {...props}>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
}