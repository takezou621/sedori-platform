import { cn } from '@/lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Loading({ size = 'md', className, text }: LoadingProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex items-center space-x-2">
        <svg
          className={cn('animate-spin', sizeClasses[size])}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        {text && (
          <span className="text-sm text-secondary-600 animate-pulse">{text}</span>
        )}
      </div>
    </div>
  );
}

export function LoadingOverlay({
  isLoading,
  children,
  text = 'Loading...',
}: {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
}) {
  if (isLoading) {
    return (
      <div className="relative">
        <div className="opacity-50">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <Loading size="lg" text={text} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function LoadingPage({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <Loading size="lg" text={text} />
    </div>
  );
}