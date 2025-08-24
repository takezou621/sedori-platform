import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class CreateMessageDto {
  @IsUUID(4, { message: '有効な受信者IDを指定してください' })
  recipientId: string;

  @IsString()
  @MinLength(1, { message: 'メッセージは1文字以上で入力してください' })
  @MaxLength(2000, { message: 'メッセージは2000文字以内で入力してください' })
  content: string;

  @IsOptional()
  @IsUUID(4, { message: '有効な返信先メッセージIDを指定してください' })
  replyToId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3, { message: '添付ファイルは最大3個まで追加できます' })
  attachments?: string[];
}

export class MarkMessageReadDto {
  @IsUUID(4, { message: '有効なメッセージIDを指定してください' })
  messageId: string;
}
