import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
// File upload interceptor for validation

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    options: {
      maxFileSize?: number;
      allowedMimeTypes?: string[];
    } = {},
  ) {
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.allowedMimeTypes = options.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Validate file before processing
    if (request.file) {
      this.validateFile(request.file);
    }

    if (request.files) {
      if (Array.isArray(request.files)) {
        request.files.forEach((file: Express.Multer.File) =>
          this.validateFile(file),
        );
      } else {
        Object.values(request.files).forEach((fileArray: any) => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach((file: Express.Multer.File) =>
              this.validateFile(file),
            );
          }
        });
      }
    }

    return next.handle();
  }

  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed: ${file.mimetype}. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Check for potentially dangerous file names
    if (this.isDangerousFileName(file.originalname)) {
      throw new BadRequestException(
        'File name contains dangerous characters or extensions',
      );
    }

    // Additional security checks for specific file types
    if (file.mimetype.startsWith('image/')) {
      this.validateImageFile(file);
    }
  }

  private isDangerousFileName(fileName: string): boolean {
    // Check for dangerous extensions
    const dangerousExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.scr',
      '.com',
      '.pif',
      '.vbs',
      '.js',
      '.jar',
      '.sh',
      '.ps1',
    ];

    const lowerFileName = fileName.toLowerCase();
    return dangerousExtensions.some((ext) => lowerFileName.endsWith(ext));
  }

  private validateImageFile(file: Express.Multer.File): void {
    // Basic image validation - check magic numbers
    if (file.buffer) {
      const header = file.buffer.slice(0, 16);

      // Check for valid image signatures
      const isValidImage =
        // JPEG
        (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) ||
        // PNG
        header.slice(0, 8).toString('hex') === '89504e470d0a1a0a' ||
        // WebP
        (header.slice(0, 4).toString() === 'RIFF' &&
          header.slice(8, 12).toString() === 'WEBP') ||
        // GIF
        header.slice(0, 6).toString() === 'GIF87a' ||
        header.slice(0, 6).toString() === 'GIF89a';

      if (!isValidImage) {
        throw new BadRequestException(
          'File does not appear to be a valid image',
        );
      }
    }
  }
}

export function FileUpload(
  options: {
    maxFileSize?: number;
    allowedMimeTypes?: string[];
  } = {},
) {
  return new FileUploadInterceptor(options);
}
