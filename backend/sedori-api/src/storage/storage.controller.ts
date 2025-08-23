import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  StorageService,
  FileUploadResult,
  ImageUploadResult,
} from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'ファイルアップロード' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'アップロード先フォルダ',
        },
        generateVariants: {
          type: 'boolean',
          description: '画像の場合、複数サイズを生成するか',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'ファイルがアップロードされました',
  })
  @ApiResponse({
    status: 400,
    description: '無効なファイルまたはサイズ制限エラー',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string = 'uploads',
    @Query('generateVariants', new DefaultValuePipe(false), ParseBoolPipe)
    generateVariants: boolean = false,
  ): Promise<FileUploadResult | ImageUploadResult> {
    if (!file) {
      throw new BadRequestException('ファイルが提供されていません');
    }

    return this.storageService.uploadFile(file, file.originalname, folder, {
      generateVariants,
    });
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: '画像アップロード（最適化付き）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'アップロード先フォルダ',
        },
        optimize: {
          type: 'boolean',
          description: '画像を最適化するか',
        },
        generateVariants: {
          type: 'boolean',
          description: '複数サイズを生成するか',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '画像がアップロードされました',
  })
  @ApiResponse({
    status: 400,
    description: '無効な画像ファイル',
  })
  async uploadImage(
    @UploadedFile() image: Express.Multer.File,
    @Query('folder') folder: string = 'images',
    @Query('optimize', new DefaultValuePipe(true), ParseBoolPipe)
    optimize: boolean = true,
    @Query('generateVariants', new DefaultValuePipe(true), ParseBoolPipe)
    generateVariants: boolean = true,
  ): Promise<ImageUploadResult> {
    if (!image) {
      throw new BadRequestException('画像ファイルが提供されていません');
    }

    return this.storageService.uploadImage(image, image.originalname, folder, {
      optimize,
      generateVariants,
    });
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiOperation({ summary: '複数ファイル同時アップロード' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        folder: {
          type: 'string',
          description: 'アップロード先フォルダ',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '複数ファイルがアップロードされました',
  })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder: string = 'uploads',
  ): Promise<(FileUploadResult | ImageUploadResult)[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('ファイルが提供されていません');
    }

    const uploadPromises = files.map((file) =>
      this.storageService.uploadFile(file, file.originalname, folder),
    );

    return Promise.all(uploadPromises);
  }

  @Get('url/:folder/:fileName')
  @ApiOperation({ summary: 'ファイルURL取得' })
  @ApiParam({ name: 'folder', description: 'フォルダ名' })
  @ApiParam({ name: 'fileName', description: 'ファイル名' })
  @ApiQuery({
    name: 'expiry',
    required: false,
    description: 'URL有効期限（秒）',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'ファイルURLを返します',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        expiry: { type: 'number' },
      },
    },
  })
  async getFileUrl(
    @Param('folder') folder: string,
    @Param('fileName') fileName: string,
    @Query('expiry') expiry?: number,
  ): Promise<{ url: string; expiry?: number }> {
    const url = await this.storageService.getFileUrl(fileName, folder, expiry);
    return { url, expiry };
  }

  @Delete(':folder/:fileName')
  @ApiOperation({ summary: 'ファイル削除' })
  @ApiParam({ name: 'folder', description: 'フォルダ名' })
  @ApiParam({ name: 'fileName', description: 'ファイル名' })
  @ApiResponse({
    status: 200,
    description: 'ファイルが削除されました',
  })
  @ApiResponse({
    status: 404,
    description: 'ファイルが見つかりません',
  })
  async deleteFile(
    @Param('folder') folder: string,
    @Param('fileName') fileName: string,
  ): Promise<{ message: string }> {
    await this.storageService.deleteFile(fileName, folder);
    return { message: 'ファイルが削除されました' };
  }

  @Get('list')
  @ApiOperation({ summary: 'ファイル一覧取得' })
  @ApiQuery({
    name: 'folder',
    required: false,
    description: 'フォルダ名（省略時は全体）',
  })
  @ApiQuery({
    name: 'recursive',
    required: false,
    description: 'サブフォルダも含むか',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'ファイル一覧を返します',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
        },
        count: { type: 'number' },
      },
    },
  })
  async listFiles(
    @Query('folder') folder: string = '',
    @Query('recursive', new DefaultValuePipe(false), ParseBoolPipe)
    recursive: boolean = false,
  ): Promise<{ files: string[]; count: number }> {
    const files = await this.storageService.listFiles(folder, recursive);
    return { files, count: files.length };
  }

  @Get('exists/:folder/:fileName')
  @ApiOperation({ summary: 'ファイル存在確認' })
  @ApiParam({ name: 'folder', description: 'フォルダ名' })
  @ApiParam({ name: 'fileName', description: 'ファイル名' })
  @ApiResponse({
    status: 200,
    description: 'ファイル存在状況を返します',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
      },
    },
  })
  async fileExists(
    @Param('folder') folder: string,
    @Param('fileName') fileName: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.storageService.fileExists(fileName, folder);
    return { exists };
  }

  @Post('copy')
  @ApiOperation({ summary: 'ファイルコピー' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceFileName: { type: 'string' },
        destFileName: { type: 'string' },
        sourceFolder: { type: 'string' },
        destFolder: { type: 'string' },
      },
      required: ['sourceFileName', 'destFileName'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'ファイルがコピーされました',
  })
  async copyFile(
    @Query('sourceFileName') sourceFileName: string,
    @Query('destFileName') destFileName: string,
    @Query('sourceFolder') sourceFolder?: string,
    @Query('destFolder') destFolder?: string,
  ): Promise<{ message: string }> {
    await this.storageService.copyFile(
      sourceFileName,
      destFileName,
      sourceFolder,
      destFolder,
    );
    return { message: 'ファイルがコピーされました' };
  }
}
