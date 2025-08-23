import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { MinioService } from './minio/minio.service';
import { ImageProcessorService } from './image/image-processor.service';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [StorageService, MinioService, ImageProcessorService],
  exports: [StorageService, MinioService, ImageProcessorService],
})
export class StorageModule {}
