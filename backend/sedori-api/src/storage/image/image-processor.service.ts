import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  withoutEnlargement?: boolean;
  background?: string;
}

export interface ProcessedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
  contentType: string;
}

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  async processImage(
    imageBuffer: Buffer,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImage> {
    try {
      const {
        width,
        height,
        quality = 85,
        format = 'webp',
        fit = 'cover',
        withoutEnlargement = true,
        background = 'white',
      } = options;

      let sharpInstance = sharp(imageBuffer);

      // Auto-orient the image
      sharpInstance = sharpInstance.rotate();

      // Resize if dimensions provided
      if (width || height) {
        sharpInstance = sharpInstance.resize({
          width,
          height,
          fit,
          withoutEnlargement,
          background,
        });
      }

      // Apply format and quality
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            quality,
            compressionLevel: 9,
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
      }

      const processedBuffer = await sharpInstance.toBuffer();
      const metadata = await sharp(processedBuffer).metadata();

      return {
        buffer: processedBuffer,
        format,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: processedBuffer.length,
        contentType: this.getContentType(format),
      };
    } catch (error) {
      this.logger.error('Failed to process image:', error.message);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async createThumbnail(
    imageBuffer: Buffer,
    size: number = 200,
  ): Promise<ProcessedImage> {
    return this.processImage(imageBuffer, {
      width: size,
      height: size,
      format: 'webp',
      quality: 80,
      fit: 'cover',
    });
  }

  async createMultipleSizes(
    imageBuffer: Buffer,
    sizes: { name: string; width: number; height?: number }[] = [
      { name: 'thumbnail', width: 200 },
      { name: 'small', width: 400 },
      { name: 'medium', width: 800 },
      { name: 'large', width: 1200 },
    ],
  ): Promise<{ [key: string]: ProcessedImage }> {
    const results: { [key: string]: ProcessedImage } = {};

    try {
      const promises = sizes.map(async (size) => {
        const processed = await this.processImage(imageBuffer, {
          width: size.width,
          height: size.height,
          format: 'webp',
          quality: 85,
          fit: 'cover',
        });
        return { name: size.name, processed };
      });

      const processedImages = await Promise.all(promises);

      processedImages.forEach(({ name, processed }) => {
        results[name] = processed;
      });

      return results;
    } catch (error) {
      this.logger.error(
        'Failed to create multiple image sizes:',
        error.message,
      );
      throw error;
    }
  }

  async optimizeImage(imageBuffer: Buffer): Promise<ProcessedImage> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const { width = 0, height = 0, format: originalFormat } = metadata;

      // Determine optimal size
      let targetWidth = width;
      let targetHeight = height;

      // Reduce size if too large
      if (width > 1920 || height > 1920) {
        const ratio = Math.min(1920 / width, 1920 / height);
        targetWidth = Math.round(width * ratio);
        targetHeight = Math.round(height * ratio);
      }

      // Choose optimal format
      const targetFormat = originalFormat === 'png' ? 'png' : 'webp';

      return this.processImage(imageBuffer, {
        width: targetWidth,
        height: targetHeight,
        format: targetFormat,
        quality: 85,
        fit: 'inside',
        withoutEnlargement: true,
      });
    } catch (error) {
      this.logger.error('Failed to optimize image:', error.message);
      throw error;
    }
  }

  async validateImage(imageBuffer: Buffer): Promise<{
    isValid: boolean;
    format?: string;
    width?: number;
    height?: number;
    error?: string;
  }> {
    try {
      const metadata = await sharp(imageBuffer).metadata();

      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'svg'];
      const format = metadata.format;

      if (!format || !supportedFormats.includes(format)) {
        return {
          isValid: false,
          error: `Unsupported image format: ${format}`,
        };
      }

      if (!metadata.width || !metadata.height) {
        return {
          isValid: false,
          error: 'Invalid image dimensions',
        };
      }

      // Check image size limits
      const maxWidth = 10000;
      const maxHeight = 10000;

      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        return {
          isValid: false,
          error: `Image too large. Maximum dimensions: ${maxWidth}x${maxHeight}`,
        };
      }

      return {
        isValid: true,
        format,
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to validate image: ${error.message}`,
      };
    }
  }

  async extractMetadata(imageBuffer: Buffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        hasProfile: metadata.hasProfile,
        space: metadata.space,
        size: imageBuffer.length,
        aspectRatio:
          metadata.width && metadata.height
            ? metadata.width / metadata.height
            : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to extract image metadata:', error.message);
      throw error;
    }
  }

  private getContentType(format: string): string {
    const contentTypes = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };

    return (
      contentTypes[format as keyof typeof contentTypes] ||
      'application/octet-stream'
    );
  }

  async generatePlaceholder(
    width: number = 300,
    height: number = 200,
    backgroundColor: string = '#f0f0f0',
    textColor: string = '#666666',
    text?: string,
  ): Promise<ProcessedImage> {
    try {
      const displayText = text || `${width}×${height}`;

      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${backgroundColor}"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" 
                fill="${textColor}" text-anchor="middle" dominant-baseline="middle">
            ${displayText}
          </text>
        </svg>
      `;

      const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

      return {
        buffer,
        format: 'png',
        width,
        height,
        size: buffer.length,
        contentType: 'image/png',
      };
    } catch (error) {
      this.logger.error('Failed to generate placeholder:', error.message);
      throw error;
    }
  }
}
