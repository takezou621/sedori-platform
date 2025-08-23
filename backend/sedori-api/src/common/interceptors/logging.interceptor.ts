import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Skip logging for health check and static files
    if (url === '/health' || url.includes('/static/')) {
      return next.handle();
    }

    this.logger.log(`→ ${method} ${url} - ${ip} - ${userAgent}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = res;
          const duration = Date.now() - startTime;
          this.logger.log(`← ${method} ${url} - ${statusCode} - ${duration}ms`);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `← ${method} ${url} - ${error?.status || 500} - ${duration}ms - ${error?.message}`,
          );
        },
      }),
    );
  }
}
