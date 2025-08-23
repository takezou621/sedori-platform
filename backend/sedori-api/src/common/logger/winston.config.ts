import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';

export const createWinstonLogger = (configService: ConfigService) => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const logLevel = configService.get(
    'LOG_LEVEL',
    isProduction ? 'info' : 'debug',
  );
  const logDir = configService.get('LOG_DIR', 'logs');

  // Custom format for structured logging
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(
      ({ timestamp, level, message, context, trace, ...meta }) => {
        const logEntry: any = {
          timestamp,
          level,
          message,
          context,
          ...meta,
        };

        if (trace) {
          logEntry.trace = trace;
        }

        // Remove undefined/null values
        Object.keys(logEntry).forEach((key) => {
          if (logEntry[key] == null) {
            delete logEntry[key];
          }
        });

        return JSON.stringify(logEntry);
      },
    ),
  );

  // Console format for development
  const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      const contextStr = context ? `[${context}] ` : '';
      const metaStr = Object.keys(meta).length
        ? ` ${JSON.stringify(meta)}`
        : '';
      return `${timestamp} ${level}: ${contextStr}${message}${metaStr}`;
    }),
  );

  const transports: winston.transport[] = [];

  // Console transport for development
  if (!isProduction) {
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: consoleFormat,
      }),
    );
  }

  // File transports
  if (isProduction || configService.get('LOG_TO_FILE', 'false') === 'true') {
    // Error logs - daily rotation
    transports.push(
      new DailyRotateFile({
        filename: `${logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d',
        createSymlink: true,
        symlinkName: 'error.log',
      }),
    );

    // Combined logs - daily rotation
    transports.push(
      new DailyRotateFile({
        filename: `${logDir}/combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: logLevel,
        format: logFormat,
        maxSize: '20m',
        maxFiles: '7d',
        createSymlink: true,
        symlinkName: 'combined.log',
      }),
    );

    // Debug logs - daily rotation (only in development or when explicitly enabled)
    if (!isProduction || configService.get('LOG_DEBUG', 'false') === 'true') {
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/debug-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: 'debug',
          format: logFormat,
          maxSize: '50m',
          maxFiles: '3d',
          createSymlink: true,
          symlinkName: 'debug.log',
        }),
      );
    }

    // Performance logs for monitoring
    transports.push(
      new DailyRotateFile({
        filename: `${logDir}/performance-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d',
        createSymlink: true,
        symlinkName: 'performance.log',
      }),
    );
  }

  // Production console logging (structured)
  if (isProduction) {
    transports.push(
      new winston.transports.Console({
        level: 'info',
        format: logFormat,
        stderrLevels: ['error', 'warn'],
      }),
    );
  }

  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
    // Handle uncaught exceptions
    exceptionHandlers: [
      new winston.transports.File({
        filename: `${logDir}/exceptions.log`,
        format: logFormat,
      }),
    ],
    // Handle unhandled promise rejections
    rejectionHandlers: [
      new winston.transports.File({
        filename: `${logDir}/rejections.log`,
        format: logFormat,
      }),
    ],
  });

  return WinstonModule.createLogger({
    instance: logger,
  });
};

// Utility function for performance logging
export const logPerformance = (
  logger: winston.Logger,
  operation: string,
  startTime: number,
  metadata?: any,
) => {
  const executionTime = Date.now() - startTime;
  logger.info(`Operation completed: ${operation}`, {
    context: 'Performance',
    operation,
    executionTime: `${executionTime}ms`,
    ...metadata,
  });
};

// Utility function for error logging with context
export const logError = (
  logger: winston.Logger,
  error: Error,
  context: string,
  metadata?: any,
) => {
  logger.error(error.message, {
    context,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};
