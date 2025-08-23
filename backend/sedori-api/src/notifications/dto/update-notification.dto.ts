import { PartialType } from '@nestjs/swagger';
import { CreateNotificationDto } from './create-notification.dto';
import { IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsDateString()
  readAt?: Date;
}
