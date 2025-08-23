import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : (message as any)?.message || 'Internal server error',
      error: exception?.name || 'UnknownError',
      ...(this.configService.get('NODE_ENV') === 'development' && {
        stack: exception?.stack,
      }),
    };

    // Log the error
    this.logger.error(
      `Unhandled exception: ${request.method} ${request.url} - ${status}`,
      exception?.stack || exception,
    );

    response.status(status).json(errorResponse);
  }
}
