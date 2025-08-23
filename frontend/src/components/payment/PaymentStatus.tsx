'use client';

import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { Order } from '@/types/order';

interface PaymentStatusProps {
  status: Order['paymentStatus'];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PaymentStatus({ 
  status, 
  className = '', 
  size = 'md',
  showLabel = true 
}: PaymentStatusProps) {
  const getStatusConfig = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return {
          icon: CheckCircleIcon,
          label: 'Paid',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          description: 'Payment has been successfully processed',
        };
      case 'pending':
        return {
          icon: ClockIcon,
          label: 'Pending',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          description: 'Payment is being processed',
        };
      case 'failed':
        return {
          icon: XCircleIcon,
          label: 'Failed',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          description: 'Payment could not be processed',
        };
      case 'refunded':
        return {
          icon: ExclamationTriangleIcon,
          label: 'Refunded',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          description: 'Payment has been refunded',
        };
      default:
        return {
          icon: ClockIcon,
          label: 'Unknown',
          color: 'text-secondary-600',
          bgColor: 'bg-secondary-100',
          description: 'Payment status is unknown',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (!showLabel) {
    return (
      <div className={`p-1 rounded-full ${config.bgColor} ${className}`} title={config.description}>
        <Icon className={`${iconSizes[size]} ${config.color}`} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`p-1 rounded-full ${config.bgColor}`}>
        <Icon className={`${iconSizes[size]} ${config.color}`} />
      </div>
      <span className={`font-medium ${config.color} ${textSizes[size]}`}>
        {config.label}
      </span>
    </div>
  );
}

interface PaymentStatusCardProps {
  status: Order['paymentStatus'];
  paymentMethod?: string;
  amount: number;
  currency: string;
  paymentDate?: string;
  transactionId?: string;
  className?: string;
}

export function PaymentStatusCard({
  status,
  paymentMethod,
  amount,
  currency,
  paymentDate,
  transactionId,
  className = '',
}: PaymentStatusCardProps) {
  const config = {
    paid: {
      title: 'Payment Successful',
      message: 'Your payment has been processed successfully.',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    pending: {
      title: 'Payment Pending',
      message: 'Your payment is being processed. This may take a few moments.',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    failed: {
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please try again or use a different payment method.',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    refunded: {
      title: 'Payment Refunded',
      message: 'Your payment has been refunded and should appear in your account within 3-5 business days.',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  };

  const statusConfig = config[status] || config.pending;

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <div className={`p-6 border rounded-lg ${statusConfig.bgColor} ${statusConfig.borderColor} ${className}`}>
      <div className="flex items-start gap-4">
        <PaymentStatus status={status} size="lg" showLabel={false} />
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">
            {statusConfig.title}
          </h3>
          
          <p className="text-secondary-600 mb-4">
            {statusConfig.message}
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-600">Amount:</span>
              <span className="font-medium text-secondary-900">
                {formatPrice(amount, currency)}
              </span>
            </div>

            {paymentMethod && (
              <div className="flex justify-between">
                <span className="text-secondary-600">Payment Method:</span>
                <span className="font-medium text-secondary-900">
                  {paymentMethod}
                </span>
              </div>
            )}

            {paymentDate && (
              <div className="flex justify-between">
                <span className="text-secondary-600">
                  {status === 'refunded' ? 'Refund Date:' : 'Payment Date:'}
                </span>
                <span className="font-medium text-secondary-900">
                  {new Date(paymentDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {transactionId && (
              <div className="flex justify-between">
                <span className="text-secondary-600">Transaction ID:</span>
                <span className="font-mono text-xs text-secondary-900">
                  {transactionId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}