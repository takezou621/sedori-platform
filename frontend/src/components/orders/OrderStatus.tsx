'use client';

import { 
  ClockIcon, 
  CheckCircleIcon, 
  TruckIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';
import { Order } from '@/types/order';

interface OrderStatusProps {
  status: Order['status'];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function OrderStatus({ status, className = '', size = 'md' }: OrderStatusProps) {
  const getStatusConfig = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: ClockIcon,
          label: 'Pending',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          description: 'Order is awaiting confirmation',
        };
      case 'confirmed':
        return {
          icon: CheckCircleIcon,
          label: 'Confirmed',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          description: 'Order has been confirmed and is being prepared',
        };
      case 'processing':
        return {
          icon: TruckIcon,
          label: 'Processing',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          description: 'Order is being processed and packaged',
        };
      case 'shipped':
        return {
          icon: TruckIcon,
          label: 'Shipped',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          description: 'Order has been shipped and is on the way',
        };
      case 'delivered':
        return {
          icon: CheckCircleIcon,
          label: 'Delivered',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          description: 'Order has been successfully delivered',
        };
      case 'cancelled':
        return {
          icon: XCircleIcon,
          label: 'Cancelled',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          description: 'Order has been cancelled',
        };
      default:
        return {
          icon: ClockIcon,
          label: 'Unknown',
          color: 'text-secondary-600',
          bgColor: 'bg-secondary-100',
          description: 'Order status is unknown',
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

interface OrderStatusTimelineProps {
  currentStatus: Order['status'];
  createdAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  className?: string;
}

export function OrderStatusTimeline({
  currentStatus,
  createdAt,
  confirmedAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
  className = '',
}: OrderStatusTimelineProps) {
  const statuses = [
    {
      key: 'pending',
      label: 'Order Placed',
      description: 'Your order has been received',
      timestamp: createdAt,
      icon: ClockIcon,
    },
    {
      key: 'confirmed',
      label: 'Order Confirmed',
      description: 'Order has been confirmed and is being prepared',
      timestamp: confirmedAt,
      icon: CheckCircleIcon,
    },
    {
      key: 'processing',
      label: 'Processing',
      description: 'Your order is being processed and packaged',
      timestamp: confirmedAt, // Usually same as confirmed
      icon: TruckIcon,
    },
    {
      key: 'shipped',
      label: 'Shipped',
      description: 'Your order is on its way',
      timestamp: shippedAt,
      icon: TruckIcon,
    },
    {
      key: 'delivered',
      label: 'Delivered',
      description: 'Your order has been delivered',
      timestamp: deliveredAt,
      icon: CheckCircleIcon,
    },
  ];

  // Handle cancelled status
  if (currentStatus === 'cancelled') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <XCircleIcon className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <div>
            <h4 className="font-medium text-secondary-900">Order Cancelled</h4>
            <p className="text-sm text-secondary-600 mt-1">
              Your order was cancelled
            </p>
            {cancelledAt && (
              <p className="text-xs text-secondary-500 mt-1">
                {new Date(cancelledAt).toLocaleDateString()} at{' '}
                {new Date(cancelledAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const getStatusIndex = (status: string) => {
    return statuses.findIndex(s => s.key === status);
  };

  const currentIndex = getStatusIndex(currentStatus);

  return (
    <div className={`space-y-4 ${className}`}>
      {statuses.map((status, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === statuses.length - 1;
        const Icon = status.icon;

        return (
          <div key={status.key} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? isCurrent
                      ? 'bg-primary-100 border-2 border-primary-500'
                      : 'bg-green-100'
                    : 'bg-secondary-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isCompleted
                      ? isCurrent
                        ? 'text-primary-600'
                        : 'text-green-600'
                      : 'text-secondary-400'
                  }`}
                />
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 h-8 mt-2 ${
                    isCompleted ? 'bg-green-300' : 'bg-secondary-200'
                  }`}
                />
              )}
            </div>
            
            <div className="flex-1 pb-8">
              <h4
                className={`font-medium ${
                  isCompleted ? 'text-secondary-900' : 'text-secondary-500'
                }`}
              >
                {status.label}
              </h4>
              <p
                className={`text-sm mt-1 ${
                  isCompleted ? 'text-secondary-600' : 'text-secondary-400'
                }`}
              >
                {status.description}
              </p>
              {status.timestamp && isCompleted && (
                <p className="text-xs text-secondary-500 mt-1">
                  {new Date(status.timestamp).toLocaleDateString()} at{' '}
                  {new Date(status.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}