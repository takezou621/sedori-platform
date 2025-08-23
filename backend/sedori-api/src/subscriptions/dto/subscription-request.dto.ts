import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  SubscriptionPlan,
  BillingCycle,
} from '../entities/subscription.entity';

export class SubscriptionRequestDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    description: 'サブスクリプションプラン',
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({
    enum: BillingCycle,
    description: '請求サイクル',
    default: BillingCycle.MONTHLY,
  })
  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiProperty({
    description: 'Stripeの支払いメソッドID',
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}

export class SubscriptionUpdateDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    description: 'サブスクリプションプラン',
    required: false,
  })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  plan?: SubscriptionPlan;

  @ApiProperty({
    enum: BillingCycle,
    description: '請求サイクル',
    required: false,
  })
  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiProperty({
    description: 'キャンセル理由',
    required: false,
  })
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}
