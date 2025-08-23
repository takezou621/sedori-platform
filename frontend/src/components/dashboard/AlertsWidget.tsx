'use client';

import Link from 'next/link';
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { Card, Badge } from '@/components/ui';
import { AlertItem } from '@/types/analytics';
import { parseISO, formatDistanceToNow } from 'date-fns';

interface AlertsWidgetProps {
  alerts: AlertItem[];
  loading?: boolean;
  className?: string;
}

export function AlertsWidget({ alerts, loading = false, className = '' }: AlertsWidgetProps) {
  const getAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-600" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-secondary-600" />;
    }
  };

  const getAlertBorderColor = (type: AlertItem['type']) => {
    switch (type) {
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
      case 'success':
        return 'border-l-green-500';
      default:
        return 'border-l-secondary-300';
    }
  };

  const getAlertBgColor = (type: AlertItem['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 hover:bg-red-100';
      case 'warning':
        return 'bg-yellow-50 hover:bg-yellow-100';
      case 'info':
        return 'bg-blue-50 hover:bg-blue-100';
      case 'success':
        return 'bg-green-50 hover:bg-green-100';
      default:
        return 'bg-secondary-50 hover:bg-secondary-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = parseISO(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  const urgentAlerts = alerts.filter(alert => alert.actionRequired && (alert.type === 'error' || alert.type === 'warning'));
  const otherAlerts = alerts.filter(alert => !alert.actionRequired || (alert.type !== 'error' && alert.type !== 'warning'));

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-secondary-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-secondary-100 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Alerts & Notifications
        </h3>
        <div className="text-center py-8">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <p className="text-secondary-500">No alerts at this time</p>
          <p className="text-sm text-secondary-400">Your business is running smoothly!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-secondary-900">
          Alerts & Notifications
        </h3>
        {alerts.length > 0 && (
          <Badge 
            className={`${urgentAlerts.length > 0 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
          >
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Urgent Alerts First */}
        {urgentAlerts.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-secondary-700 mb-3 flex items-center">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1" />
              Action Required
            </h4>
            <div className="space-y-2">
              {urgentAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 transition-colors ${getAlertBorderColor(alert.type)} ${getAlertBgColor(alert.type)}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-secondary-900">
                          {alert.title}
                        </h5>
                        <div className="flex items-center text-xs text-secondary-500 ml-2">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatTimestamp(alert.timestamp)}
                        </div>
                      </div>
                      <p className="text-sm text-secondary-600 mt-1">
                        {alert.description}
                      </p>
                      {alert.link && (
                        <Link
                          href={alert.link}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-2 inline-block"
                        >
                          Take Action →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Alerts */}
        {otherAlerts.length > 0 && (
          <div>
            {urgentAlerts.length > 0 && (
              <h4 className="text-sm font-medium text-secondary-700 mb-3">
                Other Notifications
              </h4>
            )}
            <div className="space-y-2">
              {otherAlerts.slice(0, urgentAlerts.length > 0 ? 2 : 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 transition-colors ${getAlertBorderColor(alert.type)} ${getAlertBgColor(alert.type)}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-secondary-900">
                          {alert.title}
                        </h5>
                        <div className="flex items-center text-xs text-secondary-500 ml-2">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatTimestamp(alert.timestamp)}
                        </div>
                      </div>
                      <p className="text-xs text-secondary-600 mt-1">
                        {alert.description}
                      </p>
                      {alert.link && (
                        <Link
                          href={alert.link}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-1 inline-block"
                        >
                          View Details →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show More Link */}
        {alerts.length > 5 && (
          <div className="text-center pt-3 border-t border-secondary-200">
            <Link
              href="/alerts"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All {alerts.length} Alerts →
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}