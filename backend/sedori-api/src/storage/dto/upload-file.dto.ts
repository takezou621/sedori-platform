import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'アップロードするファイル',
  })
  file: Express.Multer.File;

  @ApiProperty({
    description: 'アップロード先フォルダ',
    example: 'uploads',
    required: false,
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiProperty({
    description: '画像の場合、複数サイズを生成するか',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  generateVariants?: boolean;
}

export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'アップロードする画像ファイル',
  })
  image: Express.Multer.File;

  @ApiProperty({
    description: 'アップロード先フォルダ',
    example: 'images',
    required: false,
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiProperty({
    description: '画像を最適化するか',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  optimize?: boolean;

  @ApiProperty({
    description: '複数サイズを生成するか',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  generateVariants?: boolean;
}

export class CopyFileDto {
  @ApiProperty({
    description: 'コピー元ファイル名',
    example: 'image_001.jpg',
  })
  @IsString()
  sourceFileName: string;

  @ApiProperty({
    description: 'コピー先ファイル名',
    example: 'image_001_copy.jpg',
  })
  @IsString()
  destFileName: string;

  @ApiProperty({
    description: 'コピー元フォルダ',
    example: 'images',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceFolder?: string;

  @ApiProperty({
    description: 'コピー先フォルダ',
    example: 'backup',
    required: false,
  })
  @IsOptional()
  @IsString()
  destFolder?: string;
}

export class FileUploadResponseDto {
  @ApiProperty({
    description: 'アップロードされたファイル名',
    example: '1623456789_abc123.jpg',
  })
  fileName: string;

  @ApiProperty({
    description: '元のファイル名',
    example: 'my-photo.jpg',
  })
  originalName: string;

  @ApiProperty({
    description: 'ファイルURL',
    example: 'https://storage.example.com/images/1623456789_abc123.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'ファイルサイズ（バイト）',
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: 'ファイルの Content-Type',
    example: 'image/jpeg',
  })
  contentType: string;

  @ApiProperty({
    description: 'アップロード先フォルダ',
    example: 'images',
  })
  folder: string;

  @ApiProperty({
    description: 'メタデータ',
    example: { userId: '123', purpose: 'profile' },
    required: false,
  })
  metadata?: any;
}

export class ImageUploadResponseDto extends FileUploadResponseDto {
  @ApiProperty({
    description: '画像の各サイズバリアント',
    example: {
      thumbnail: {
        fileName: '1623456789_abc123_thumbnail.jpg',
        url: 'https://storage.example.com/images/1623456789_abc123_thumbnail.jpg',
        width: 200,
        height: 200,
        size: 15000,
      },
      small: {
        fileName: '1623456789_abc123_small.jpg',
        url: 'https://storage.example.com/images/1623456789_abc123_small.jpg',
        width: 400,
        height: 400,
        size: 45000,
      },
    },
    required: false,
  })
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
