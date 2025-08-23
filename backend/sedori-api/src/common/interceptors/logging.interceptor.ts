import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import * as winston from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly winstonLogger: winston.Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const userId = request.user?.id || 'anonymous';

    const startTime = Date.now();

    // Log request
    this.winstonLogger.info('Incoming request', {
      context: 'HTTP',
      method,
      url,
      ip,
      userAgent,
      userId,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          const { statusCode } = response;

          // Log successful response
          this.winstonLogger.info('Request completed', {
            context: 'HTTP',
            method,
            url,
            statusCode,
            responseTime: `${responseTime}ms`,
            userId,
            timestamp: new Date().toISOString(),
          });

          // Log performance warning for slow requests
          if (responseTime > 1000) {
            this.winstonLogger.warn('Slow request detected', {
              context: 'Performance',
              method,
              url,
              responseTime: `${responseTime}ms`,
              userId,
              timestamp: new Date().toISOString(),
            });
          }
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Log error response
          this.winstonLogger.error('Request failed', {
            context: 'HTTP',
            method,
            url,
            statusCode,
            responseTime: `${responseTime}ms`,
            userId,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }
}

@Injectable()
export class SecurityLoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: winston.Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;

    // Log potential security events
    const suspiciousPatterns = [
      '/admin',
      '/.env',
      '/config',
      'SELECT',
      'DROP',
      'DELETE',
      '<script',
      'javascript:',
      'eval(',
    ];

    const isSuspicious = suspiciousPatterns.some(
      (pattern) =>
        url.toLowerCase().includes(pattern.toLowerCase()) ||
        JSON.stringify(headers).toLowerCase().includes(pattern.toLowerCase()),
    );

    if (isSuspicious) {
      this.logger.warn('Suspicious request detected', {
        context: 'Security',
        method,
        url,
        ip,
        userAgent: headers['user-agent'],
        headers: this.sanitizeHeaders(headers),
        timestamp: new Date().toISOString(),
      });
    }

    // Log failed authentication attempts
    return next.handle().pipe(
      tap({
        error: (error) => {
          if (error.status === 401 || error.status === 403) {
            this.logger.warn('Authentication/Authorization failed', {
              context: 'Security',
              method,
              url,
              ip,
              statusCode: error.status,
              error: error.message,
              userAgent: headers['user-agent'],
              timestamp: new Date().toISOString(),
            });
          }
        },
      }),
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
