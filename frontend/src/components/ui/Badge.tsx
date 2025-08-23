import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  onClick?: () => void;
}

export function Badge({ children, variant = 'default', className, onClick }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  
  const variants = {
    default: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-800',
    destructive: 'bg-red-100 text-red-800',
    outline: 'text-secondary-900 border border-secondary-200',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component 
      className={cn(baseClasses, variants[variant], onClick && 'cursor-pointer hover:opacity-80', className)}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}