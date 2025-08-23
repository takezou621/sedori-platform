import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MinioService } from './minio/minio.service';
import { ImageProcessorService } from './image/image-processor.service';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadResult {
  fileName: string;
  originalName: string;
  url: string;
  size: number;
  contentType: string;
  folder: string;
  metadata?: any;
}

export interface ImageUploadResult extends FileUploadResult {
  variants?: {
    [key: string]: {
      fileName: string;
      url: string;
      width: number;
      height: number;
      size: number;
    };
  };
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  private readonly allowedFileTypes = [
    ...this.allowedImageTypes,
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  constructor(
    private readonly minioService: MinioService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  async uploadFile(
    file: Buffer | Express.Multer.File,
    originalName: string,
    folder: string = 'uploads',
    options: {
      generateVariants?: boolean;
      customFileName?: string;
      metadata?: any;
    } = {},
  ): Promise<FileUploadResult | ImageUploadResult> {
    try {
      const fileBuffer = Buffer.isBuffer(file) ? file : file.buffer;
      const fileName =
        options.customFileName || this.generateFileName(originalName);
      const contentType = this.detectContentType(originalName, fileBuffer);

      // Validate file
      this.validateFile(fileBuffer, contentType, originalName);

      // Upload original file
      const objectName = await this.minioService.uploadFile(
        fileName,
        fileBuffer,
        contentType,
        folder,
      );

      const url = await this.minioService.getFileUrl(objectName);

      const baseResult: FileUploadResult = {
        fileName,
        originalName,
        url,
        size: fileBuffer.length,
        contentType,
        folder,
        metadata: options.metadata,
      };

      // If it's an image and variants are requested, process them
      if (this.isImage(contentType) && options.generateVariants) {
        return await this.processImageVariants(
          fileBuffer,
          fileName,
          folder,
          baseResult,
        );
      }

      return baseResult;
    } catch (error) {
      this.logger.error(
        `Failed to upload file ${originalName}:`,
        error.message,
      );
      throw error;
    }
  }

  async uploadImage(
    imageFile: Buffer | Express.Multer.File,
    originalName: string,
    folder: string = 'images',
    options: {
      generateVariants?: boolean;
      optimize?: boolean;
      customFileName?: string;
      metadata?: any;
    } = {},
  ): Promise<ImageUploadResult> {
    try {
      const imageBuffer = Buffer.isBuffer(imageFile)
        ? imageFile
        : imageFile.buffer;
      const contentType = this.detectContentType(originalName, imageBuffer);

      if (!this.isImage(contentType)) {
        throw new BadRequestException('File is not a valid image');
      }

      // Validate image
      const validation = await this.imageProcessor.validateImage(imageBuffer);
      if (!validation.isValid) {
        throw new BadRequestException(validation.error);
      }

      let processedBuffer = imageBuffer;

      // Optimize if requested
      if (options.optimize) {
        const optimized = await this.imageProcessor.optimizeImage(imageBuffer);
        processedBuffer = optimized.buffer;
      }

      const fileName =
        options.customFileName || this.generateFileName(originalName, 'webp');

      // Upload optimized/original image
      const objectName = await this.minioService.uploadFile(
        fileName,
        processedBuffer,
        'image/webp',
        folder,
      );

      const url = await this.minioService.getFileUrl(objectName);

      const baseResult: FileUploadResult = {
        fileName,
        originalName,
        url,
        size: processedBuffer.length,
        contentType: 'image/webp',
        folder,
        metadata: options.metadata,
      };

      // Generate variants if requested
      if (options.generateVariants) {
        return await this.processImageVariants(
          processedBuffer,
          fileName,
          folder,
          baseResult,
        );
      }

      return baseResult as ImageUploadResult;
    } catch (error) {
      this.logger.error(
        `Failed to upload image ${originalName}:`,
        error.message,
      );
      throw error;
    }
  }

  private async processImageVariants(
    imageBuffer: Buffer,
    fileName: string,
    folder: string,
    baseResult: FileUploadResult,
  ): Promise<ImageUploadResult> {
    try {
      const variants: ImageUploadResult['variants'] = {};

      const sizes = await this.imageProcessor.createMultipleSizes(imageBuffer);

      for (const [sizeName, processedImage] of Object.entries(sizes)) {
        const variantFileName = this.generateVariantFileName(
          fileName,
          sizeName,
        );

        const variantObjectName = await this.minioService.uploadFile(
          variantFileName,
          processedImage.buffer,
          processedImage.contentType,
          folder,
        );

        const variantUrl =
          await this.minioService.getFileUrl(variantObjectName);

        variants[sizeName] = {
          fileName: variantFileName,
          url: variantUrl,
          width: processedImage.width,
          height: processedImage.height,
          size: processedImage.size,
        };
      }

      return {
        ...baseResult,
        variants,
      } as ImageUploadResult;
    } catch (error) {
      this.logger.error('Failed to process image variants:', error.message);
      // Return base result even if variants fail
      return baseResult as ImageUploadResult;
    }
  }

  async deleteFile(fileName: string, folder?: string): Promise<void> {
    try {
      const objectName = folder ? `${folder}/${fileName}` : fileName;
      await this.minioService.deleteFile(objectName);

      // Also delete variants if they exist
      await this.deleteImageVariants(fileName, folder);
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileName}:`, error.message);
      throw error;
    }
  }

  private async deleteImageVariants(
    fileName: string,
    folder?: string,
  ): Promise<void> {
    try {
      const variants = ['thumbnail', 'small', 'medium', 'large'];
      const deletePromises = variants.map(async (variant) => {
        const variantFileName = this.generateVariantFileName(fileName, variant);
        const objectName = folder
          ? `${folder}/${variantFileName}`
          : variantFileName;

        try {
          const exists = await this.minioService.fileExists(objectName);
          if (exists) {
            await this.minioService.deleteFile(objectName);
          }
        } catch (error) {
          // Ignore individual variant deletion errors
          this.logger.warn(
            `Failed to delete variant ${objectName}:`,
            error.message,
          );
        }
      });

      await Promise.allSettled(deletePromises);
    } catch (error) {
      this.logger.warn('Failed to delete some image variants:', error.message);
    }
  }

  async getFileUrl(
    fileName: string,
    folder?: string,
    expiry?: number,
  ): Promise<string> {
    try {
      const objectName = folder ? `${folder}/${fileName}` : fileName;
      return await this.minioService.getFileUrl(objectName, expiry);
    } catch (error) {
      this.logger.error(
        `Failed to get file URL for ${fileName}:`,
        error.message,
      );
      throw error;
    }
  }

  async listFiles(
    folder: string = '',
    recursive: boolean = false,
  ): Promise<string[]> {
    try {
      return await this.minioService.listFiles(folder, recursive);
    } catch (error) {
      this.logger.error(
        `Failed to list files in folder ${folder}:`,
        error.message,
      );
      throw error;
    }
  }

  async fileExists(fileName: string, folder?: string): Promise<boolean> {
    try {
      const objectName = folder ? `${folder}/${fileName}` : fileName;
      return await this.minioService.fileExists(objectName);
    } catch (error) {
      this.logger.error(
        `Failed to check file existence ${fileName}:`,
        error.message,
      );
      return false;
    }
  }

  async getFile(fileName: string, folder?: string): Promise<Buffer> {
    try {
      const objectName = folder ? `${folder}/${fileName}` : fileName;
      return await this.minioService.getFile(objectName);
    } catch (error) {
      this.logger.error(`Failed to get file ${fileName}:`, error.message);
      throw error;
    }
  }

  async copyFile(
    sourceFileName: string,
    destFileName: string,
    sourceFolder?: string,
    destFolder?: string,
  ): Promise<void> {
    try {
      const sourceObjectName = sourceFolder
        ? `${sourceFolder}/${sourceFileName}`
        : sourceFileName;
      const destObjectName = destFolder
        ? `${destFolder}/${destFileName}`
        : destFileName;

      await this.minioService.copyFile(sourceObjectName, destObjectName);
    } catch (error) {
      this.logger.error(
        `Failed to copy file from ${sourceFileName} to ${destFileName}:`,
        error.message,
      );
      throw error;
    }
  }

  private validateFile(
    fileBuffer: Buffer,
    contentType: string,
    originalName: string,
  ): void {
    // Check file size
    if (fileBuffer.length > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Check content type
    if (!this.allowedFileTypes.includes(contentType)) {
      throw new BadRequestException(
        `File type not allowed: ${contentType}. Allowed types: ${this.allowedFileTypes.join(', ')}`,
      );
    }

    // Additional validation for images
    if (this.isImage(contentType)) {
      // This will be validated by imageProcessor
      return;
    }

    // Check for potentially malicious files
    if (this.isPotentiallyMalicious(originalName, fileBuffer)) {
      throw new BadRequestException(
        'File appears to contain malicious content',
      );
    }
  }

  private isPotentiallyMalicious(
    fileName: string,
    fileBuffer: Buffer,
  ): boolean {
    // Check for executable file extensions
    const dangerousExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.scr',
      '.com',
      '.pif',
      '.vbs',
      '.js',
    ];
    const lowerFileName = fileName.toLowerCase();

    if (dangerousExtensions.some((ext) => lowerFileName.endsWith(ext))) {
      return true;
    }

    // Check for suspicious file headers/magic numbers
    const fileHeader = fileBuffer.slice(0, 16).toString('hex');
    const suspiciousHeaders = [
      '4d5a', // PE executable
      '504b0304', // ZIP (could contain executables)
    ];

    return suspiciousHeaders.some((header) => fileHeader.startsWith(header));
  }

  private detectContentType(originalName: string, fileBuffer: Buffer): string {
    const extension = originalName.split('.').pop()?.toLowerCase();

    // Check file signature first
    const header = fileBuffer.slice(0, 16);

    // JPEG
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG
    if (header.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
      return 'image/png';
    }

    // WebP
    if (
      header.slice(0, 4).toString() === 'RIFF' &&
      header.slice(8, 12).toString() === 'WEBP'
    ) {
      return 'image/webp';
    }

    // GIF
    if (
      header.slice(0, 6).toString() === 'GIF87a' ||
      header.slice(0, 6).toString() === 'GIF89a'
    ) {
      return 'image/gif';
    }

    // Fallback to extension-based detection
    const extensionMap: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      pdf: 'application/pdf',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
    };

    return extensionMap[extension || ''] || 'application/octet-stream';
  }

  private isImage(contentType: string): boolean {
    return this.allowedImageTypes.includes(contentType);
  }

  private generateFileName(
    originalName: string,
    forceExtension?: string,
  ): string {
    const extension = forceExtension || originalName.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const random = uuidv4().split('-')[0];
    return `${timestamp}_${random}.${extension}`;
  }

  private generateVariantFileName(
    originalFileName: string,
    variant: string,
  ): string {
    const parts = originalFileName.split('.');
    const extension = parts.pop();
    const baseName = parts.join('.');
    return `${baseName}_${variant}.${extension}`;
  }
}
