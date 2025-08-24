import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  MinLength,
  IsUUID,
  ArrayMaxSize,
} from 'class-validator';
import { PostCategory } from '../entities/forum-post.entity';

export class CreatePostDto {
  @IsString()
  @MinLength(5, { message: 'タイトルは5文字以上で入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  title: string;

  @IsString()
  @MinLength(10, { message: '内容は10文字以上で入力してください' })
  content: string;

  @IsOptional()
  @IsEnum(PostCategory, { message: '有効なカテゴリを選択してください' })
  category?: PostCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'タグは最大10個まで設定できます' })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5, { message: '添付ファイルは最大5個まで追加できます' })
  attachments?: string[];
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  attachments?: string[];
}

export class CreateReplyDto {
  @IsString()
  @MinLength(5, { message: '返信は5文字以上で入力してください' })
  content: string;

  @IsOptional()
  @IsUUID(4, { message: '有効な親返信IDを指定してください' })
  parentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3, { message: '添付ファイルは最大3個まで追加できます' })
  attachments?: string[];
}
